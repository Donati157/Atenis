// test/vnext/runtime/trusted-evaluation.test.ts
//
// M. Evaluator obrigatório: erro explícito quando ausente e sem trusted.
// N. trustedEvaluation deixa rastro visível no trace.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { MockEvaluator, evaluationResult } from "../../../lib/vnext/evaluator/mock"
import { registerMultiAdaptFixtures } from "../../../lib/vnext/scenarios/multi-adapt-then-socratic"

async function seed(runtime: Runtime, studentId: string) {
  await runtime.tick({ studentId, topic: "quadratic", message: "?" })
  await runtime.tick({
    studentId,
    topic: "quadratic",
    message: "",
    studentEvent: { kind: "start" },
  })
  await runtime.tick({ studentId, topic: "quadratic", message: "" })
}

function newRuntime(opts: { withEvaluator: boolean }) {
  const mock = new MockProvider()
  registerMultiAdaptFixtures(mock)
  const gateway = createGateway()
  gateway.register(mock)
  return new Runtime({
    gateway,
    engine: new MethodEngine(),
    store: new InMemoryLearningStore(),
    clock: new FakeClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
    evaluator: opts.withEvaluator ? mockEvaluator() : undefined,
    allowMissingMisconceptionRegistry: true, // Fase 2A.2 final — teste legado
  })
}

function mockEvaluator() {
  const ev = new MockEvaluator()
  ev.registerMatcher(
    () => true,
    {
      kind: "result",
      value: evaluationResult({
        outcome: "correct",
        reasoning: "correto",
      }),
    },
    "any",
  )
  return ev
}

describe("M. evaluator obrigatório sem trusted → erro", () => {
  it("sem evaluator + sem trustedEvaluation → abort no-evaluator-and-not-trusted", async () => {
    const runtime = newRuntime({ withEvaluator: false })
    await seed(runtime, "s1")
    const out = await runtime.tick({
      studentId: "s1",
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: true,
        strategyUsed: "worked_example",
      },
      // NEM trustedEvaluation NEM answerContext
    })
    expect(out.aborted?.reason).toBe("no-evaluator-and-not-trusted")
  })

  it("com evaluator MAS sem answerContext e sem trusted → abort answer-context-required", async () => {
    const runtime = newRuntime({ withEvaluator: true })
    await seed(runtime, "s2")
    const out = await runtime.tick({
      studentId: "s2",
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: true,
        strategyUsed: "worked_example",
      },
    })
    expect(out.aborted?.reason).toBe("answer-context-required")
  })
})

describe("N. trustedEvaluation deixa rastro visível", () => {
  it("trace contém runtime.evaluate.trusted-evaluation-used", async () => {
    const runtime = newRuntime({ withEvaluator: false })
    await seed(runtime, "s3")
    const out = await runtime.tick({
      studentId: "s3",
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
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

  it("com evaluator + trusted + sem answerContext → prefere trusted (evaluator não roda)", async () => {
    const runtime = newRuntime({ withEvaluator: true })
    await seed(runtime, "s4")
    const out = await runtime.tick({
      studentId: "s4",
      topic: "quadratic",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
      },
      trustedEvaluation: true,
    })
    expect(
      out.trace.some(
        (t) => t.step === "runtime.evaluate.trusted-evaluation-used",
      ),
    ).toBe(true)
    // O evaluator NÃO deve ter rodado (sem answerContext)
    expect(
      out.trace.some(
        (t) => t.step === "runtime.evaluate.evaluator-result",
      ),
    ).toBe(false)
  })
})
