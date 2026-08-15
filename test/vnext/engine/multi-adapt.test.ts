// test/vnext/engine/multi-adapt.test.ts
//
// C. Múltiplas adaptações: worked_example falha → analogy falha → socratic
// sucede. Prova que o sistema não fica preso na primeira strategy.

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
import type { RuntimeInput } from "../../../lib/vnext/runtime/types"

function newRuntime() {
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
  })
  return { runtime, store }
}

async function tickUntilAwaitingOrAborted(
  runtime: Runtime,
  studentId: string,
  topic: string,
  input: { message?: string; event?: RuntimeInput["studentEvent"] },
) {
  const outputs = []
  let first = true
  while (true) {
    const out = await runtime.tick({
      studentId,
      topic,
      message: first ? (input.message ?? "") : "",
      studentEvent: first ? (input.event ?? null) : null,
      trustedEvaluation: true,
    })
    outputs.push(out)
    first = false
    if (out.awaitingStudentInput || out.aborted) break
    if (out.nextExpectedPhase === "ready" || out.nextExpectedPhase === "abort") {
      const terminal = await runtime.tick({
        studentId,
        topic,
        message: "",
        studentEvent: null,
      })
      outputs.push(terminal)
      break
    }
  }
  return outputs
}

describe("C. múltiplas adaptações — worked_example → analogy → socratic", () => {
  it("aluno passa por 2 adaptações e finalmente demonstra prontidão", async () => {
    const { runtime, store } = newRuntime()
    const studentId = "s-multi"
    const topic = "quadratic"

    // Turn 1: opening + diagnose
    await tickUntilAwaitingOrAborted(runtime, studentId, topic, {
      message: "Não entendo função quadrática.",
    })
    // Turn 2: start → teach worked_example → practice
    await tickUntilAwaitingOrAborted(runtime, studentId, topic, {
      event: { kind: "start" },
    })
    // Turn 3: aluno erra worked_example → adapt(analogy) → teach → practice
    await tickUntilAwaitingOrAborted(runtime, studentId, topic, {
      event: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
      },
    })
    // Turn 4: aluno erra analogy → adapt(?) → teach → practice
    await tickUntilAwaitingOrAborted(runtime, studentId, topic, {
      event: { kind: "answer", correct: false, strategyUsed: "analogy" },
    })
    // Turn 5: aluno acerta com a terceira strategy escolhida pelo engine
    const state1 = await store.load(studentId, topic)
    const thirdStrategy = state1!.currentStrategy!
    // Pelo pickAdaptStrategy: worked_example bloqueada (0/1 na 1ª rodada
    // → 1 try 0 success), analogy bloqueada (0/1), current era analogy,
    // então terceira é a próxima não-tentada: visual_diagram.
    expect(["visual_diagram", "socratic"]).toContain(thirdStrategy)
    await tickUntilAwaitingOrAborted(runtime, studentId, topic, {
      event: { kind: "answer", correct: true, strategyUsed: thirdStrategy },
    })
    // Verify aparece — aluno acerta de novo pra ficar ready.
    await tickUntilAwaitingOrAborted(runtime, studentId, topic, {
      event: { kind: "answer", correct: true, strategyUsed: thirdStrategy },
    })

    const finalState = await store.load(studentId, topic)
    expect(finalState).not.toBeNull()
    // Estratégias registradas: worked_example, analogy, thirdStrategy
    const strats = finalState!.strategyEffectiveness.map((s) => s.strategy)
    expect(strats).toContain("worked_example")
    expect(strats).toContain("analogy")
    expect(strats).toContain(thirdStrategy)
    // adaptCount ≥ 2
    expect(finalState!.adaptCount).toBeGreaterThanOrEqual(2)
    // Estado final: ready (aluno passou)
    expect(finalState!.currentMethodPhase).toBe("ready")
  })
})
