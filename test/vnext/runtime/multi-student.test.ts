// test/vnext/runtime/multi-student.test.ts
//
// CRITÉRIO DE SUCESSO da Fase 1.1: personalização por evidência.
//
// Dois alunos, mesmo tópico. Aluno A pega logo na 2ª strategy; aluno B
// precisa de 3 strategies. O state final de cada aluno DEVE registrar
// evidence-of-effectiveness diferente:
//   Aluno A: worked_example fail, analogy success
//   Aluno B: worked_example fail, analogy fail, socratic/visual_diagram success

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

async function drain(
  runtime: Runtime,
  studentId: string,
  topic: string,
  input: { message?: string; event?: RuntimeInput["studentEvent"] },
) {
  let first = true
  while (true) {
    const out = await runtime.tick({
      studentId,
      topic,
      message: first ? (input.message ?? "") : "",
      studentEvent: first ? (input.event ?? null) : null,
      trustedEvaluation: true,
    })
    first = false
    if (out.awaitingStudentInput || out.aborted) return out
    if (out.nextExpectedPhase === "ready" || out.nextExpectedPhase === "abort") {
      return await runtime.tick({
        studentId,
        topic,
        message: "",
        studentEvent: null,
      })
    }
  }
}

describe("critério de sucesso: personalização por evidência", () => {
  it("Aluno A e Aluno B registram trajetórias diferentes de estratégia efetiva", async () => {
    // ================ ALUNO A ================
    const a = newRuntime()
    const studentA = "aluno-A"
    const topic = "quadratic"
    await drain(a.runtime, studentA, topic, {
      message: "Não entendo função quadrática.",
    })
    await drain(a.runtime, studentA, topic, { event: { kind: "start" } })
    // A erra worked_example
    await drain(a.runtime, studentA, topic, {
      event: { kind: "answer", correct: false, strategyUsed: "worked_example" },
    })
    // A acerta analogy (2ª strategy)
    await drain(a.runtime, studentA, topic, {
      event: { kind: "answer", correct: true, strategyUsed: "analogy" },
    })
    // Verify: A confirma
    await drain(a.runtime, studentA, topic, {
      event: { kind: "answer", correct: true, strategyUsed: "analogy" },
    })

    // ================ ALUNO B ================
    const b = newRuntime()
    const studentB = "aluno-B"
    await drain(b.runtime, studentB, topic, {
      message: "Não entendo função quadrática.",
    })
    await drain(b.runtime, studentB, topic, { event: { kind: "start" } })
    // B erra worked_example
    await drain(b.runtime, studentB, topic, {
      event: { kind: "answer", correct: false, strategyUsed: "worked_example" },
    })
    // B erra analogy (2ª)
    await drain(b.runtime, studentB, topic, {
      event: { kind: "answer", correct: false, strategyUsed: "analogy" },
    })
    // 3ª strategy escolhida pelo engine — B acerta
    const stateB1 = await b.store.load(studentB, topic)
    const thirdStrat = stateB1!.currentStrategy!
    await drain(b.runtime, studentB, topic, {
      event: { kind: "answer", correct: true, strategyUsed: thirdStrat },
    })
    // Verify: B confirma
    await drain(b.runtime, studentB, topic, {
      event: { kind: "answer", correct: true, strategyUsed: thirdStrat },
    })

    // ============ ASSERTIONS ============
    const finalA = await a.store.load(studentA, topic)
    const finalB = await b.store.load(studentB, topic)

    // Ambos terminam ready
    expect(finalA!.currentMethodPhase).toBe("ready")
    expect(finalB!.currentMethodPhase).toBe("ready")

    // A: analogy tem >= 1 success. worked_example tem 0 successes.
    const analogyA = finalA!.strategyEffectiveness.find(
      (s) => s.strategy === "analogy",
    )!
    expect(analogyA.successes).toBeGreaterThanOrEqual(1)
    const workedA = finalA!.strategyEffectiveness.find(
      (s) => s.strategy === "worked_example",
    )!
    expect(workedA.successes).toBe(0)

    // B: analogy tem 0 successes. thirdStrat tem >= 1 success.
    const analogyB = finalB!.strategyEffectiveness.find(
      (s) => s.strategy === "analogy",
    )!
    expect(analogyB.successes).toBe(0)
    const thirdB = finalB!.strategyEffectiveness.find(
      (s) => s.strategy === thirdStrat,
    )!
    expect(thirdB.successes).toBeGreaterThanOrEqual(1)

    // Os dois alunos têm strategyEffectiveness FUNCIONALMENTE DIFERENTES.
    // Isso é a prova mínima de personalização por evidência.
    expect(
      JSON.stringify(finalA!.strategyEffectiveness),
    ).not.toBe(JSON.stringify(finalB!.strategyEffectiveness))

    // Aluno A precisou de menos adaptações que Aluno B
    expect(finalA!.adaptCount).toBeLessThan(finalB!.adaptCount)
  })
})
