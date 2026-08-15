// test/vnext/runtime/evaluator-integration.test.ts
//
// E. partial: outcome=partial vira attempt.outcome=partial, mastery sobe
//    pra emerging mesmo em partial, adapt é próxima.
// F. unclear: outcome=unclear vira failure, adapt.
// G. evaluator error: fixture error → abort=evaluator-error.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { registerMultiAdaptFixtures } from "../../../lib/vnext/scenarios/multi-adapt-then-socratic"
import {
  MockEvaluator,
  evaluationResult,
} from "../../../lib/vnext/evaluator/mock"

function newRuntimeWithEvaluator(evaluator: MockEvaluator) {
  const mock = new MockProvider()
  registerMultiAdaptFixtures(mock)
  const gateway = createGateway()
  gateway.register(mock)
  const store = new InMemoryLearningStore()
  const runtime = new Runtime({
    gateway,
    engine: new MethodEngine(),
    store,
    clock: new FakeClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
    evaluator,
    // Fase 2A.2 final: teste legado — sem registry mas SEM produção.
    allowMissingMisconceptionRegistry: true,
  })
  return { runtime, store }
}

async function seedUntilAwaiting(runtime: Runtime, studentId: string) {
  const topic = "quadratic"
  await runtime.tick({ studentId, topic, message: "?" })
  await runtime.tick({
    studentId,
    topic,
    message: "",
    studentEvent: { kind: "start" },
  })
  // teach → practice (aguardando)
  await runtime.tick({ studentId, topic, message: "" })
}

describe("E. avaliação partial via evaluator", () => {
  it("evaluator devolve partial → attempt.outcome=partial, mastery=emerging, próxima=adapt", async () => {
    const evaluator = new MockEvaluator()
    evaluator.registerMatcher(
      () => true,
      {
        kind: "result",
        value: evaluationResult({
          outcome: "partial",
          reasoning: "Encontrou uma raiz, esqueceu a outra.",
        }),
      },
      "any-partial",
    )
    const { runtime, store } = newRuntimeWithEvaluator(evaluator)
    const studentId = "s-partial"
    await seedUntilAwaiting(runtime, studentId)

    const out = await runtime.tick({
      studentId,
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: true, // ignorado — evaluator sobrepõe
        strategyUsed: "worked_example",
        text: "x = 2",
      },
      answerContext: {
        question: "Qual a raiz de x² - 4 = 0?",
      },
    })

    expect(out.executedPhase).toBe("evaluate")
    const state = await store.load(studentId, "quadratic")
    const lastAttempt = state!.attempts[state!.attempts.length - 1]
    expect(lastAttempt.outcome).toBe("partial")
    expect(state!.mastery).toBe("emerging")
    expect(out.nextExpectedPhase).toBe("adapt")
  })
})

describe("F. avaliação unclear via evaluator", () => {
  it("evaluator devolve unclear → attempt=failure, mastery inalterada", async () => {
    const evaluator = new MockEvaluator()
    evaluator.registerMatcher(
      () => true,
      {
        kind: "result",
        value: evaluationResult({
          outcome: "unclear",
          reasoning: "Resposta muito curta pra decidir.",
        }),
      },
      "any-unclear",
    )
    const { runtime, store } = newRuntimeWithEvaluator(evaluator)
    const studentId = "s-unclear"
    await seedUntilAwaiting(runtime, studentId)

    await runtime.tick({
      studentId,
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "?",
      },
      answerContext: { question: "?" },
    })

    const state = await store.load(studentId, "quadratic")
    const lastAttempt = state!.attempts[state!.attempts.length - 1]
    expect(lastAttempt.outcome).toBe("failure")
    expect(state!.mastery).toBe("unknown")
  })
})

describe("G. evaluator error", () => {
  it("evaluator lança → Runtime aborta com evaluator-error", async () => {
    const evaluator = new MockEvaluator()
    evaluator.registerMatcher(
      () => true,
      {
        kind: "error",
        error: { name: "ProviderError", message: "500 evaluator down" },
      },
      "always-error",
    )
    const { runtime, store } = newRuntimeWithEvaluator(evaluator)
    const studentId = "s-err"
    await seedUntilAwaiting(runtime, studentId)

    const out = await runtime.tick({
      studentId,
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: true,
        strategyUsed: "worked_example",
        text: "x = 2",
      },
      answerContext: { question: "?" },
    })

    expect(out.aborted?.reason).toBe("evaluator-error")
    expect(out.aborted?.detail).toContain("500")
    const state = await store.load(studentId, "quadratic")
    expect(state!.currentMethodPhase).toBe("abort")
  })
})

describe("evaluator ausente + trustedEvaluation=true → fallback marcado", () => {
  it("sem evaluator + trustedEvaluation=true, Runtime usa event.correct (com trace visível)", async () => {
    const mock = new MockProvider()
    registerMultiAdaptFixtures(mock)
    const gateway = createGateway()
    gateway.register(mock)
    const store = new InMemoryLearningStore()
    const runtime = new Runtime({
      gateway,
      engine: new MethodEngine(),
      store,
      clock: new FakeClock(),
      ids: new CounterIdGenerator(),
      criticAnalyze: (r) => analyze(r),
      // sem evaluator
    })
    await seedUntilAwaiting(runtime, "s-fallback")
    const out = await runtime.tick({
      studentId: "s-fallback",
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
      },
      // sem answerContext, MAS com trustedEvaluation explícito
      trustedEvaluation: true,
    })
    const state = await store.load("s-fallback", "quadratic")
    expect(state!.attempts[state!.attempts.length - 1].outcome).toBe("failure")
    // Trace precisa registrar o uso do fallback pra visibilidade.
    expect(
      out.trace.some(
        (t) => t.step === "runtime.evaluate.trusted-evaluation-used",
      ),
    ).toBe(true)
  })
})
