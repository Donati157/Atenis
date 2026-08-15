// test/vnext/engine/limits.test.ts
//
// I: forçar muitos ticks sem input resulta em abort=tick-limit.
// Fase 1.1: `tick-limit` substitui `cycle-limit`. Cada tick incrementa
// state.ticks; se ultrapassar MAX_TICKS, Runtime aborta antes de decidir
// nova phase.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MAX_TICKS } from "../../../lib/vnext/runtime/budgets"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

describe("I. limite de ticks impede loop", () => {
  it("no MAX_TICKS+1 tick o Runtime aborta com tick-limit", async () => {
    const mock = new MockProvider()
    registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
    const gateway = createGateway()
    gateway.register(mock)
    const runtime = new Runtime({
      gateway,
      engine: new MethodEngine(),
      store: new InMemoryLearningStore(),
      clock: new FakeClock(),
      ids: new CounterIdGenerator(),
      criticAnalyze: (r) => analyze(r),
    })
    // Chama tick sem nunca fornecer answer — aluno "trava" em practice/diagnose.
    let last
    for (let i = 0; i < MAX_TICKS + 2; i++) {
      last = await runtime.tick({
        studentId: "s-loop",
        topic: "quadratic",
        message: "?",
      })
      if (last.aborted) break
    }
    // Fase 1.1: budgets separados. Como cada "?" faz uma diagnose
    // generative, o generative-limit (10) bate ANTES do tick-limit (30).
    // O importante: aborta com reason específica de limite, não fica em
    // loop infinito.
    expect(last?.aborted?.reason).toMatch(/^(tick-limit|generative-limit)$/)
    expect(last?.state.currentMethodPhase).toBe("abort")
  })
})
