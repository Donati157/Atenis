// test/vnext/runtime/pending-question.test.ts
//
// I. Questão selecionada é registrada como pendingQuestionId no state.
// J. Ausência de questionId no answer (sem trusted) produz erro explícito
//    quando bank/selector estão presentes; se pending existe, usa pending.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { InMemorySourceRegistry } from "../../../lib/vnext/knowledge"
import { InMemoryMisconceptionRegistry } from "../../../lib/vnext/misconceptions"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import { loadQuadraticaDataset } from "../../../lib/vnext/datasets/matematica-funcao-quadratica"
import { MockEvaluator, evaluationResult } from "../../../lib/vnext/evaluator/mock"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

async function makeRuntime() {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
  const gateway = createGateway()
  gateway.register(mock)
  const sreg = new InMemorySourceRegistry()
  const mreg = new InMemoryMisconceptionRegistry()
  const bank = new InMemoryQuestionBank(sreg, mreg)
  await loadQuadraticaDataset(sreg, bank, mreg)
  const selector = new DeterministicQuestionSelector(bank)
  const evaluator = new MockEvaluator()
  evaluator.registerMatcher(
    () => true,
    {
      kind: "result",
      value: evaluationResult({ outcome: "correct", reasoning: "ok" }),
    },
    "catch-all-correct",
  )
  const runtime = new Runtime({
    gateway,
    engine: new MethodEngine(),
    store: new InMemoryLearningStore(),
    clock: new FakeClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
    evaluator,
    questionBank: bank,
    questionSelector: selector,
    misconceptionRegistry: mreg,
    requireQuestion: true,
  })
  return runtime
}

const CTX = {
  subject: "matematica",
  grade: "EM01" as const,
  schoolStage: "high" as const,
}

describe("I. selectedQuestion vira pendingQuestionId no state", () => {
  it("state.pendingQuestionId reflete a questão apresentada", async () => {
    const runtime = await makeRuntime()
    const out = await runtime.tick({
      studentId: "s1",
      topic: "funcao-quadratica",
      message: "?",
      context: CTX,
    })
    expect(out.selectedQuestion).not.toBeNull()
    expect(out.state.pendingQuestionId).toBe(out.selectedQuestion!.id)
  })

  it("pendingQuestionId é LIMPO após evaluate", async () => {
    const runtime = await makeRuntime()
    const first = await runtime.tick({
      studentId: "s2",
      topic: "funcao-quadratica",
      message: "?",
      context: CTX,
    })
    const pid = first.state.pendingQuestionId!
    expect(pid).toBeTruthy()
    const afterAnswer = await runtime.tick({
      studentId: "s2",
      topic: "funcao-quadratica",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: true,
        strategyUsed: "worked_example",
        text: "resp",
      },
      answerContext: { question: "?" }, // sem questionId — usa pending
    })
    expect(afterAnswer.state.pendingQuestionId).toBeNull()
    // O attempt registrado usa o pending automaticamente.
    const last =
      afterAnswer.state.attempts[afterAnswer.state.attempts.length - 1]
    expect(last.questionId).toBe(pid)
  })
})

describe("J. enforcement de questionId", () => {
  it("questionId no input diferente de pending → abort question-id-mismatch", async () => {
    const runtime = await makeRuntime()
    await runtime.tick({
      studentId: "s3",
      topic: "funcao-quadratica",
      message: "?",
      context: CTX,
    })
    const out = await runtime.tick({
      studentId: "s3",
      topic: "funcao-quadratica",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: true,
        strategyUsed: "worked_example",
        text: "resp",
      },
      answerContext: {
        question: "?",
        questionId: "id-que-nao-eh-o-pending",
      },
    })
    expect(out.aborted?.reason).toBe("question-id-mismatch")
  })

  it("sem pending E sem questionId em bank/selector-Runtime → abort question-id-required", async () => {
    // Seed do state SEM apresentar questão: usa trustedEvaluation false
    // e path que passa direto pra evaluate sem prior generative.
    const runtime = await makeRuntime()
    // Força state sem pending: monta priorState direto.
    const now = new Date("2026-08-11T14:00:00.000Z").toISOString()
    const out = await runtime.tick({
      studentId: "s4",
      topic: "funcao-quadratica",
      message: "",
      priorState: {
        schemaVersion: 3,
        studentId: "s4",
        topic: "funcao-quadratica",
        context: CTX,
        mastery: "emerging",
        attempts: [],
        strategyEffectiveness: [],
        misconceptions: [],
        answeredSuccessfully: [],
        pendingQuestionId: null, // sem pending
        currentMethodPhase: "practice",
        currentStrategy: "worked_example",
        lastStudentEventKind: null,
        ticks: 3,
        generativeTurns: 2,
        refinementAttempts: 2,
        adaptCount: 0,
        verifyPassStreak: 0,
        createdAt: now,
        lastUpdatedAt: now,
      },
      studentEvent: {
        kind: "answer",
        correct: true,
        strategyUsed: "worked_example",
        text: "resp",
      },
      answerContext: { question: "?" }, // sem questionId
    })
    expect(out.aborted?.reason).toBe("question-id-required")
  })

  it("trustedEvaluation continua permitido mesmo sem pending/questionId", async () => {
    const runtime = await makeRuntime()
    const now = new Date("2026-08-11T14:00:00.000Z").toISOString()
    const out = await runtime.tick({
      studentId: "s5",
      topic: "funcao-quadratica",
      message: "",
      priorState: {
        schemaVersion: 3,
        studentId: "s5",
        topic: "funcao-quadratica",
        context: CTX,
        mastery: "emerging",
        attempts: [],
        strategyEffectiveness: [],
        misconceptions: [],
        answeredSuccessfully: [],
        pendingQuestionId: null,
        currentMethodPhase: "practice",
        currentStrategy: "worked_example",
        lastStudentEventKind: null,
        ticks: 3,
        generativeTurns: 2,
        refinementAttempts: 2,
        adaptCount: 0,
        verifyPassStreak: 0,
        createdAt: now,
        lastUpdatedAt: now,
      },
      studentEvent: {
        kind: "answer",
        correct: true,
        strategyUsed: "worked_example",
      },
      trustedEvaluation: true,
    })
    expect(out.aborted).toBeUndefined()
    expect(
      out.trace.some(
        (t) => t.step === "runtime.evaluate.trusted-evaluation-used",
      ),
    ).toBe(true)
  })
})
