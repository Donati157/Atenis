// test/vnext/runtime/determinism.test.ts
//
// L: mesmo input + mesmos fixtures + mesmo clock/idgen → resultado
// determinístico. Rodamos o cenário completo N vezes, comparamos os
// outputs relevantes (executed phases, phase final, mastery, effectiveness).
//
// Note: FakeClock avança por chamada; se dois runs fazem exatamente as
// mesmas chamadas, os timestamps saem iguais — logo JSON.stringify(state)
// bate.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"
import type { RuntimeInput } from "../../../lib/vnext/runtime/types"

async function runScenarioOnce(): Promise<{
  phases: string[]
  finalMastery: string
  finalPhase: string
  effectivenessSummary: Record<string, string>
}> {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
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
  const turns: Array<{
    message?: string
    event?: RuntimeInput["studentEvent"]
  }> = [
    { message: "Não entendo função quadrática." },
    { event: { kind: "start" } },
    {
      event: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
      },
    },
    {
      event: { kind: "answer", correct: true, strategyUsed: "analogy" },
    },
    {
      event: { kind: "answer", correct: true, strategyUsed: "analogy" },
    },
  ]
  const phases: string[] = []
  for (const turn of turns) {
    let first = true
    while (true) {
      const out = await runtime.tick({
        studentId: "s1",
        topic: "quadratic",
        message: first ? (turn.message ?? "") : "",
        studentEvent: first ? (turn.event ?? null) : null,
        trustedEvaluation: true,
      })
      phases.push(out.executedPhase)
      first = false
      if (out.awaitingStudentInput || out.aborted) break
      if (
        out.nextExpectedPhase === "ready" ||
        out.nextExpectedPhase === "abort"
      ) {
        const terminal = await runtime.tick({
          studentId: "s1",
          topic: "quadratic",
          message: "",
          studentEvent: null,
        })
        phases.push(terminal.executedPhase)
        break
      }
    }
  }
  const state = await store.load("s1", "quadratic")
  return {
    phases,
    finalMastery: state!.mastery,
    finalPhase: state!.currentMethodPhase,
    effectivenessSummary: Object.fromEntries(
      state!.strategyEffectiveness.map((s) => [
        s.strategy,
        `${s.successes}/${s.tries}`,
      ]),
    ),
  }
}

describe("L. determinismo E2E", () => {
  it("20 execuções do cenário produzem exatamente o mesmo resultado", async () => {
    const first = await runScenarioOnce()
    for (let i = 0; i < 19; i++) {
      const next = await runScenarioOnce()
      expect(next).toEqual(first)
    }
  })
})
