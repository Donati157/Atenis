// lib/vnext/runtime/evaluate-answer.ts
//
// Fase 2A.2: lógica isolada do evaluate. Trata:
//   - answer + evaluator + answerContext → evaluator
//   - answer + trustedEvaluation → event.correct + trace visível
//   - answer + evaluator + sem answerContext + !trusted → abort
//   - answer + sem evaluator + sem answerContext + !trusted → abort
//   - confused → registra failure sem chamar evaluator
//
// Também:
//   - Aplica pendingQuestionId enforcement (Fase 2A.2):
//     - Se input.answerContext.questionId inconsistente com pending → abort
//     - Se ausente e pending presente → USA pending automaticamente
//   - Chama update-learning pra registrar misconceptions/answeredSuccessfully.

import type { EducationalContext } from "../context/types"
import type { StudentEvent } from "../engine/events"
import type { MethodPhase } from "../engine/phases"
import type { TeachingStrategy } from "../engine/strategies"
import type {
  EvaluationOutcome,
  EvaluationResult,
  QuestionRef,
} from "../evaluator/types"
import type { AttemptOutcome, LearningTopicState } from "../learning/types"
import {
  bumpVerifyStreak,
  recordAttempt,
  setPendingQuestion,
  updateMastery,
  updateStrategyEffectiveness,
} from "../learning/updates"
import type { RuntimeDeps, TraceEntry } from "./types"
import {
  applyDetectedMisconceptions,
  applySuccessResolution,
} from "./update-learning"

export type EvaluateResult =
  | {
      kind: "ok"
      state: LearningTopicState
      evalResult: EvaluationResult | null
    }
  | {
      kind: "abort"
      state: LearningTopicState
      reason: import("./types").AbortReason
      detail: string
    }

export async function evaluateStudentAnswer(args: {
  deps: RuntimeDeps
  state: LearningTopicState
  event: StudentEvent
  originatingPhase: MethodPhase
  answerContext: import("./types").AnswerContext | null | undefined
  trustedEvaluation: boolean
  context: EducationalContext | null
  now: () => string
  trace: TraceEntry[]
}): Promise<EvaluateResult> {
  const {
    deps,
    event,
    originatingPhase,
    answerContext,
    trustedEvaluation,
    context,
    now,
    trace,
  } = args
  let state = args.state

  const fromVerify = originatingPhase === "verify"
  const fromDiagnose = originatingPhase === "diagnose"
  const attemptPhase: MethodPhase = fromVerify
    ? "verify"
    : fromDiagnose
      ? "diagnose"
      : "practice"

  if (event.kind === "confused") {
    const strategy: TeachingStrategy =
      state.currentStrategy ?? "worked_example"
    state = recordAttempt(state, {
      strategy,
      outcome: "failure",
      methodPhase: attemptPhase,
      eventKind: "confused",
      questionId: state.pendingQuestionId,
      at: now(),
    })
    state = updateStrategyEffectiveness(state, strategy, "failure")
    if (fromVerify) state = bumpVerifyStreak(state, false)
    state = setPendingQuestion(state, null)
    trace.push({
      at: now(),
      step: "runtime.evaluate.confused-recorded",
      detail: { strategy, fromPhase: attemptPhase },
    })
    return { kind: "ok", state, evalResult: null }
  }

  if (event.kind !== "answer") {
    trace.push({
      at: now(),
      step: "runtime.evaluate.no-answer",
      detail: { eventKind: event.kind },
    })
    return { kind: "ok", state, evalResult: null }
  }

  // === answer flow ===
  // 1. Enforce pendingQuestionId (Fase 2A.2)
  const pending = state.pendingQuestionId
  const providedId = answerContext?.questionId ?? null
  let effectiveQuestionId: string | null = null
  if (pending && providedId && pending !== providedId) {
    return {
      kind: "abort",
      state,
      reason: "question-id-mismatch",
      detail: `state.pendingQuestionId="${pending}" mas answerContext.questionId="${providedId}"`,
    }
  }
  if (pending) {
    effectiveQuestionId = pending
  } else if (providedId) {
    effectiveQuestionId = providedId
  } else if (!trustedEvaluation) {
    // Sem pending E sem provided E não trusted: se o path exige questão
    // (temos bank/selector no deps), abort. Senão, fica sem questionId
    // (path livre — LLM inventou pergunta, é caso de fallback).
    if (deps.questionBank || deps.questionSelector) {
      return {
        kind: "abort",
        state,
        reason: "question-id-required",
        detail:
          "Nenhum pendingQuestionId no state e nenhum answerContext.questionId. Runtime não sabe qual questão foi respondida.",
      }
    }
  }

  // 2. Decide caminho: evaluator vs trusted vs abort
  let outcome: AttemptOutcome
  let evalResult: EvaluationResult | null = null

  if (deps.evaluator && answerContext) {
    // Resolve questionRef
    let questionRef: QuestionRef | undefined
    if (effectiveQuestionId && deps.questionBank) {
      const q = await deps.questionBank.getById(effectiveQuestionId)
      if (q) {
        questionRef = {
          id: q.id,
          skill: q.skill,
          subject: q.subject,
          grade: q.grade,
          topic: q.topic,
          expectedAnswer: {
            kind: q.expectedAnswer.kind,
            canonicalForm:
              "canonicalForm" in q.expectedAnswer
                ? q.expectedAnswer.canonicalForm
                : undefined,
          },
          commonErrors: q.commonErrors.map((e) => ({
            code: e.code,
            description: e.description,
            misconception: e.misconception,
          })),
        }
      }
    }
    try {
      evalResult = await deps.evaluator.evaluate({
        question: answerContext.question,
        studentAnswer: event.text ?? "",
        expectedKnowledge: answerContext.expectedKnowledge,
        topicContext: context
          ? {
              topic: state.topic,
              grade: context.grade,
              subject: context.subject,
            }
          : { topic: state.topic },
        rubric: answerContext.rubricId
          ? { id: answerContext.rubricId, criteria: [] }
          : undefined,
        questionRef,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      trace.push({
        at: now(),
        step: "runtime.evaluate.evaluator-error",
        detail: { error: detail },
      })
      return {
        kind: "abort",
        state,
        reason: "evaluator-error",
        detail,
      }
    }
    outcome = mapEvalOutcome(evalResult.outcome)
    trace.push({
      at: now(),
      step: "runtime.evaluate.evaluator-result",
      detail: {
        outcome: evalResult.outcome,
        correctness: evalResult.correctness,
        recommendedNextAction: evalResult.recommendedNextAction,
        errors: evalResult.errors.length,
      },
    })
  } else if (trustedEvaluation) {
    outcome = event.correct ? "success" : "failure"
    trace.push({
      at: now(),
      step: "runtime.evaluate.trusted-evaluation-used",
      detail: {
        hasEvaluator: Boolean(deps.evaluator),
        hasAnswerContext: Boolean(answerContext),
        correct: event.correct,
      },
    })
  } else if (deps.evaluator && !answerContext) {
    return {
      kind: "abort",
      state,
      reason: "answer-context-required",
      detail:
        "Evaluator injetado mas answerContext ausente. Passe answerContext OU trustedEvaluation=true explicitamente.",
    }
  } else {
    return {
      kind: "abort",
      state,
      reason: "no-evaluator-and-not-trusted",
      detail:
        "Nenhum evaluator injetado E trustedEvaluation não é true. Runtime recusa avaliar silenciosamente.",
    }
  }

  // 3. Registra attempt + updates
  state = recordAttempt(state, {
    strategy: event.strategyUsed,
    outcome,
    methodPhase: attemptPhase,
    eventKind: "answer",
    questionId: effectiveQuestionId,
    at: now(),
  })
  state = updateStrategyEffectiveness(state, event.strategyUsed, outcome)
  state = updateMastery(state, outcome, attemptPhase)
  if (fromVerify) state = bumpVerifyStreak(state, outcome === "success")

  // 4. Aplica misconceptions (validadas contra registry)
  if (evalResult && evalResult.errors.length > 0) {
    const codes = evalResult.errors
      .map((e) => e.code)
      .filter((c): c is string => Boolean(c))
    state = applyDetectedMisconceptions({
      state,
      codes,
      registry: deps.misconceptionRegistry,
      at: now(),
      trace,
    })
  }

  // 5. Resolve misconceptions se success + questão do bank
  if (outcome === "success" && effectiveQuestionId) {
    state = await applySuccessResolution({
      state,
      questionId: effectiveQuestionId,
      bank: deps.questionBank,
      at: now(),
      trace,
    })
  }

  // 6. Limpa pendingQuestionId — question já foi consumida
  state = setPendingQuestion(state, null)

  trace.push({
    at: now(),
    step: "runtime.evaluate.recorded",
    detail: {
      strategy: event.strategyUsed,
      outcome,
      fromPhase: attemptPhase,
      newMastery: state.mastery,
      verifyPassStreak: state.verifyPassStreak,
      questionId: effectiveQuestionId,
      misconceptionsDetected:
        evalResult?.errors
          .filter((e) => e.code)
          .map((e) => e.code!) ?? [],
    },
  })

  return { kind: "ok", state, evalResult }
}

function mapEvalOutcome(o: EvaluationOutcome): AttemptOutcome {
  switch (o) {
    case "correct":
      return "success"
    case "partial":
      return "partial"
    case "incorrect":
    case "unclear":
      return "failure"
  }
}
