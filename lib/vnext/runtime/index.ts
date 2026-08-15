// lib/vnext/runtime/index.ts
//
// Runtime — Fase 2A.2 REFATORADO.
//
// Este arquivo é O ORQUESTRADOR. A lógica de cada responsabilidade vive
// em módulo separado:
//   - context-resolver.ts   → resolve EducationalContext (input > state)
//   - select-question.ts    → consulta QuestionSelector
//   - evaluate-answer.ts    → evaluator/trusted/pendingId enforcement
//   - update-learning.ts    → aplica misconceptions/answeredSuccessfully
//   - handle-abort.ts       → constrói terminal outputs
//   - generate-response.ts  → wrapper do refiner
//   - budgets.ts            → ticks/generative/refinement/adapt
//
// Cada tick executa NO MÁXIMO 1 phase (generative OU internal).

import { MethodEngine } from "../engine"
import type { StudentEvent } from "../engine/events"
import type { MethodPhase } from "../engine/phases"
import { isGenerative, isInternal, isTerminal } from "../engine/phases"
import type { TeachingStrategy } from "../engine/strategies"
import type { LearningTopicState } from "../learning/types"
import { newTopicState } from "../learning/types"
import {
  incrementAdapt,
  incrementGenerativeTurns,
  incrementTicks,
  setContext,
  setCurrentPhase,
  setLastEventKind,
  setPendingQuestion,
} from "../learning/updates"
import {
  checkGenerativeBudget,
  checkTickBudget,
  snapshotBudget,
} from "./budgets"
import { resolveEducationalContext } from "./context-resolver"
import { evaluateStudentAnswer } from "./evaluate-answer"
import { abortWithReason, buildTerminal } from "./handle-abort"
import { generatePhaseResponse } from "./generate-response"
import {
  phaseNeedsQuestion,
  selectQuestionForPhase,
} from "./select-question"
import type {
  AbortReason,
  RuntimeDeps,
  RuntimeInput,
  RuntimeOutput,
  TraceEntry,
} from "./types"

export class Runtime {
  constructor(private readonly deps: RuntimeDeps) {}

  async tick(input: RuntimeInput): Promise<RuntimeOutput> {
    const trace: TraceEntry[] = []
    const now = () => this.deps.clock.nowIso()
    const save = (s: LearningTopicState) => this.deps.store.save(s)

    let state = await this.loadOrInit(input)
    const event = input.studentEvent ?? null

    trace.push({
      at: now(),
      step: "runtime.tick.begin",
      detail: {
        studentId: input.studentId,
        topic: input.topic,
        eventKind: event?.kind ?? null,
        currentPhase: state.currentMethodPhase,
      },
    })

    // Fase 2A.2 (final): guard de misconception-registry. Se há evaluator
    // injetado, o registry é OBRIGATÓRIO — exceto se o consumer marcou
    // EXPLICITAMENTE `allowMissingMisconceptionRegistry: true`.
    if (
      this.deps.evaluator &&
      !this.deps.misconceptionRegistry &&
      this.deps.allowMissingMisconceptionRegistry !== true
    ) {
      trace.push({
        at: now(),
        step: "runtime.misconception-registry.missing",
        detail: {
          hint: "Runtime com evaluator injetado exige misconceptionRegistry. Passe registry OU allowMissingMisconceptionRegistry=true explicitamente pra fixtures.",
        },
      })
      return abortWithReason({
        input,
        state,
        reason: "misconception-registry-required",
        detail:
          "Runtime tem evaluator mas nenhum misconceptionRegistry — codes arbitrários entrariam em produção. Use allowMissingMisconceptionRegistry=true pra teste.",
        transitionReason: "guard: misconception-registry",
        trace,
        at: now(),
        save,
      })
    }
    if (
      this.deps.evaluator &&
      !this.deps.misconceptionRegistry &&
      this.deps.allowMissingMisconceptionRegistry === true
    ) {
      trace.push({
        at: now(),
        step: "runtime.misconception-registry.allow-missing",
        detail: {
          hint: "flag explícita — codes de evaluator NÃO validados. Não usar em produção.",
        },
      })
    }

    // Persiste context + lastEventKind (bloco 2 abaixo).
    state = this.applyContextUpdate(state, input.context, now, trace)
    if (event) state = setLastEventKind(state, event.kind)

    // 2. Tick budget
    state = incrementTicks(state, now())
    const tickAbort = checkTickBudget(state)
    if (tickAbort) {
      return abortWithReason({
        input,
        state,
        reason: tickAbort,
        detail: "excedeu MAX_TICKS",
        transitionReason: `budget: ${tickAbort}`,
        trace,
        at: now(),
        save,
      })
    }

    // 3. Decide próxima phase
    const decision = this.deps.engine.decideNext(state, event)
    trace.push({
      at: now(),
      step: "runtime.decision",
      detail: {
        next: decision.next,
        strategy: decision.nextStrategy,
        reason: decision.reason,
      },
    })

    if (isTerminal(decision.next)) {
      state = setCurrentPhase(state, decision.next, decision.nextStrategy, now())
      await save(state)
      const abortReason: AbortReason | undefined =
        decision.next === "abort"
          ? this.abortReasonFromDecision(decision.reason)
          : undefined
      return buildTerminal({
        input,
        state,
        phase: decision.next,
        reason: decision.reason,
        strategy: decision.nextStrategy,
        aborted: abortReason
          ? { reason: abortReason, detail: decision.reason }
          : undefined,
        trace,
      })
    }

    // 4. Resolve context (importante ANTES de qualquer path que use)
    const resolved = resolveEducationalContext(input.context, state)

    if (isInternal(decision.next)) {
      return this.executeInternal({
        input,
        state,
        phase: decision.next,
        reason: decision.reason,
        context: resolved.context,
        event,
        trace,
      })
    }

    if (isGenerative(decision.next)) {
      // Fase 2A.2: context obrigatório APENAS quando `requireQuestion=true`.
      // Runtimes permissivos (sem enforcement) continuam funcionando sem
      // context — path livre pra LLM inventar.
      if (
        phaseNeedsQuestion(decision.next) &&
        this.deps.questionSelector &&
        this.deps.requireQuestion === true &&
        !resolved.context
      ) {
        return abortWithReason({
          input,
          state,
          reason: "educational-context-required",
          detail:
            "requireQuestion=true mas nenhum EducationalContext (subject/grade) foi provido nem persistido no state.",
          transitionReason: decision.reason,
          trace,
          at: now(),
          save,
        })
      }
      // Generative budget
      const provisional = incrementGenerativeTurns(state)
      const genAbort = checkGenerativeBudget(provisional)
      if (genAbort) {
        return abortWithReason({
          input,
          state,
          reason: genAbort,
          detail: "excedeu MAX_GENERATIVE_TURNS",
          transitionReason: `budget: ${genAbort}`,
          trace,
          at: now(),
          save,
        })
      }
      return this.executeGenerative({
        input,
        state,
        phase: decision.next,
        strategy: decision.nextStrategy,
        reason: decision.reason,
        event,
        context: resolved.context,
        trace,
      })
    }

    throw new Error(
      `Runtime: phase desconhecida "${decision.next}" — corrupção do engine`,
    )
  }

  // -------------------------------------------------------------

  private async loadOrInit(input: RuntimeInput): Promise<LearningTopicState> {
    if (input.priorState) return input.priorState
    const loaded = await this.deps.store.load(input.studentId, input.topic)
    if (loaded) return loaded
    // Fase 2A.2 final: context NÃO é preenchido aqui — deixa
    // applyContextUpdate emitir o trace `context.initialized`.
    return newTopicState({
      studentId: input.studentId,
      topic: input.topic,
      createdAt: this.deps.clock.nowIso(),
      context: null,
    })
  }

  private abortReasonFromDecision(reason: string): AbortReason {
    if (reason.startsWith("Limite de adaptações")) return "adapt-limit"
    if (reason.includes("sem estratégia")) return "no-viable-strategy"
    return "adapt-limit"
  }

  // Fase 2A.2 (final): política de mudança de contexto.
  // - Se input.context ausente: sem mudança.
  // - Se state.context ausente e input.context presente: aplica (inicial).
  // - Se ambos presentes e IGUAIS (deep-equal): sem mudança.
  // - Se ambos presentes e DIFERENTES: aplica atualização + trace explícito
  //   pra deixar rastro visível de mudança de contexto pedagógico.
  private applyContextUpdate(
    state: LearningTopicState,
    inputContext: RuntimeInput["context"],
    now: () => string,
    trace: TraceEntry[],
  ): LearningTopicState {
    if (!inputContext) return state
    if (!state.context) {
      trace.push({
        at: now(),
        step: "runtime.context.initialized",
        detail: { context: inputContext },
      })
      return setContext(state, inputContext)
    }
    if (deepEqualContext(state.context, inputContext)) return state
    trace.push({
      at: now(),
      step: "runtime.context.changed",
      detail: {
        previous: state.context,
        next: inputContext,
      },
    })
    return setContext(state, inputContext)
  }

  // -------------------------------------------------------------
  // INTERNAL PHASES
  // -------------------------------------------------------------

  private async executeInternal(args: {
    input: RuntimeInput
    state: LearningTopicState
    phase: MethodPhase
    reason: string
    context: RuntimeInput["context"] | null
    event: StudentEvent | null
    trace: TraceEntry[]
  }): Promise<RuntimeOutput> {
    const { input, phase, reason, context, event, trace } = args
    const now = () => this.deps.clock.nowIso()
    let state = args.state

    if (phase === "evaluate") {
      const originatingPhase = state.currentMethodPhase
      state = setCurrentPhase(state, "evaluate", state.currentStrategy, now())
      trace.push({
        at: now(),
        step: "runtime.evaluate.begin",
        detail: { originatingPhase },
      })
      if (!event) {
        trace.push({
          at: now(),
          step: "runtime.evaluate.no-answer",
          detail: { eventKind: null },
        })
      } else {
        const result = await evaluateStudentAnswer({
          deps: this.deps,
          state,
          event,
          originatingPhase,
          answerContext: input.answerContext,
          trustedEvaluation: input.trustedEvaluation === true,
          context: context ?? null,
          now,
          trace,
        })
        if (result.kind === "abort") {
          return abortWithReason({
            input,
            state: result.state,
            reason: result.reason,
            detail: result.detail,
            transitionReason: reason,
            trace,
            at: now(),
            save: (s) => this.deps.store.save(s),
          })
        }
        state = result.state
      }
    } else if (phase === "adapt") {
      state = incrementAdapt(state)
      state = setCurrentPhase(state, "adapt", state.currentStrategy, now())
      trace.push({
        at: now(),
        step: "runtime.adapt",
        detail: { adaptCount: state.adaptCount },
      })
    }

    const nextDecision = this.deps.engine.decideNext(state, null)
    await this.deps.store.save(state)

    return {
      studentId: input.studentId,
      topic: input.topic,
      executedPhase: phase,
      nextExpectedPhase: nextDecision.next,
      awaitingStudentInput: false,
      strategy: state.currentStrategy,
      transitionReason: reason,
      reply: null,
      criticReport: null,
      refinementAttempts: 0,
      state,
      budgets: snapshotBudget(state),
      trace,
    }
  }

  // -------------------------------------------------------------
  // GENERATIVE PHASES
  // -------------------------------------------------------------

  private async executeGenerative(args: {
    input: RuntimeInput
    state: LearningTopicState
    phase: MethodPhase
    strategy: TeachingStrategy | null
    reason: string
    event: StudentEvent | null
    context: RuntimeInput["context"] | null
    trace: TraceEntry[]
  }): Promise<RuntimeOutput> {
    const { input, phase, strategy, reason, event, context, trace } = args
    const now = () => this.deps.clock.nowIso()
    let state = setCurrentPhase(args.state, phase, strategy, now())
    state = incrementGenerativeTurns(state)

    // 1. Seleção de questão (Fase 2A.1/2A.2)
    const selection = await selectQuestionForPhase({
      selector: this.deps.questionSelector,
      state,
      context: context ?? null,
      phase,
      now,
      trace,
    })

    if (selection.kind === "none" && this.deps.requireQuestion) {
      return abortWithReason({
        input,
        state,
        reason: "question-unavailable",
        detail: `Nenhuma Question ${phase} disponível pra topic=${state.topic}`,
        transitionReason: reason,
        trace,
        at: now(),
        save: (s) => this.deps.store.save(s),
      })
    }
    const selectedQuestion =
      selection.kind === "picked" ? selection.question : null

    trace.push({
      at: now(),
      step: "runtime.generate.begin",
      detail: {
        phase,
        strategy,
        generativeTurns: state.generativeTurns,
        selectedQuestionId: selectedQuestion?.id ?? null,
      },
    })

    // 2. Geração via refiner
    const genResult = await generatePhaseResponse({
      deps: this.deps,
      state,
      phase,
      strategy,
      event,
      message: input.message,
      selectedQuestion,
      trace,
      now,
    })

    state = genResult.state

    if (genResult.kind === "abort") {
      const issueCodes =
        genResult.criticReport?.issues.map((i) => i.code) ?? undefined
      return abortWithReason({
        input,
        state,
        reason: genResult.reason,
        detail: genResult.detail ?? "",
        transitionReason: reason,
        trace,
        at: now(),
        save: (s) => this.deps.store.save(s),
        issueCodes,
        diagnostic: genResult.diagnostic,
      })
    }

    // 3. Se questão foi apresentada + phase aguarda input: salva pending
    const awaitsInput =
      phase === "practice" || phase === "verify" || phase === "diagnose"
    if (awaitsInput && selectedQuestion) {
      state = setPendingQuestion(state, selectedQuestion.id)
    }

    const nextDecision = this.deps.engine.decideNext(state, null)
    await this.deps.store.save(state)

    return {
      studentId: input.studentId,
      topic: input.topic,
      executedPhase: phase,
      nextExpectedPhase: awaitsInput ? phase : nextDecision.next,
      awaitingStudentInput: awaitsInput,
      strategy,
      transitionReason: reason,
      reply: genResult.reply,
      criticReport: genResult.criticReport,
      refinementAttempts: genResult.attempts,
      selectedQuestion,
      state,
      budgets: snapshotBudget(state),
      trace,
    }
  }
}

// deep-equal simples pra EducationalContext. Ordem de chaves não importa;
// determinístico e barato.
function deepEqualContext(
  a: NonNullable<LearningTopicState["context"]>,
  b: NonNullable<import("../context/types").EducationalContext>,
): boolean {
  return (
    a.subject === b.subject &&
    a.grade === b.grade &&
    a.schoolStage === b.schoolStage &&
    (a.skill ?? null) === (b.skill ?? null) &&
    // Fase 2A.2 final — campos novos opcionais:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((a as any).framework ?? null) === ((b as any).framework ?? null) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((a as any).proficiencyLevel ?? null) ===
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((b as any).proficiencyLevel ?? null)
  )
}

export * from "./types"
export { generateWithRefinement, MAX_REFINE_ATTEMPTS } from "./refiner"
export { composeGenerationRequest } from "./prompt-composer"
export * from "./budgets"
export {
  resolveEducationalContext,
} from "./context-resolver"
export {
  phaseNeedsQuestion,
  selectQuestionForPhase,
} from "./select-question"
export { evaluateStudentAnswer } from "./evaluate-answer"
