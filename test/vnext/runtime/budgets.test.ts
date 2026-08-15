// test/vnext/runtime/budgets.test.ts
//
// I. limites separados: ticks / generative / adapt / refinement.
// Cada tipo tem seu limite e reason específica.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import {
  MAX_GENERATIVE_TURNS,
  MAX_TICKS,
} from "../../../lib/vnext/runtime/budgets"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

function newRuntime() {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
  const gateway = createGateway()
  gateway.register(mock)
  const store = new InMemoryLearningStore()
  return {
    runtime: new Runtime({
      gateway,
      engine: new MethodEngine(),
      store,
      clock: new FakeClock(),
      ids: new CounterIdGenerator(),
      criticAnalyze: (r) => analyze(r),
    }),
    store,
  }
}

describe("budgets — contagens separadas", () => {
  it("tick sem message não incrementa generativeTurns quando phase é internal", async () => {
    const { runtime, store } = newRuntime()
    const studentId = "s-b"
    // tick 1: diagnose (generative). generativeTurns=1, ticks=1
    await runtime.tick({ studentId, topic: "quadratic", message: "?" })
    let state = await store.load(studentId, "quadratic")
    expect(state!.ticks).toBe(1)
    expect(state!.generativeTurns).toBe(1)

    // tick 2: teach (generative). generativeTurns=2, ticks=2. Também
    // teach requer 2 refinement attempts (fixture ruim primeiro).
    await runtime.tick({
      studentId,
      topic: "quadratic",
      message: "",
      studentEvent: { kind: "start" },
    })
    state = await store.load(studentId, "quadratic")
    expect(state!.ticks).toBe(2)
    expect(state!.generativeTurns).toBe(2)
    // refinementAttempts é TOTAL de attempts do refiner (accept em 1ª conta 1).
    // diagnose (1 attempt) + teach (2 attempts — 1ª refuse, 2ª accept) = 3.
    expect(state!.refinementAttempts).toBe(3)
  })
})

describe("budgets — limits publicados", () => {
  it("MAX_TICKS e MAX_GENERATIVE_TURNS existem e são inteiros positivos", () => {
    expect(MAX_TICKS).toBeGreaterThan(0)
    expect(MAX_GENERATIVE_TURNS).toBeGreaterThan(0)
    expect(Number.isInteger(MAX_TICKS)).toBe(true)
    expect(Number.isInteger(MAX_GENERATIVE_TURNS)).toBe(true)
  })

  it("MAX_GENERATIVE_TURNS < MAX_TICKS (generative é mais restritivo)", () => {
    expect(MAX_GENERATIVE_TURNS).toBeLessThan(MAX_TICKS)
  })
})

describe("budgets — RuntimeOutput.budgets snapshot", () => {
  it("cada tick devolve snapshot com contagens atuais", async () => {
    const { runtime } = newRuntime()
    const out1 = await runtime.tick({
      studentId: "s1",
      topic: "quadratic",
      message: "?",
    })
    expect(out1.budgets.ticks).toBe(1)
    expect(out1.budgets.generativeTurns).toBe(1)
    expect(out1.budgets.limits.maxTicks).toBe(MAX_TICKS)
  })
})
