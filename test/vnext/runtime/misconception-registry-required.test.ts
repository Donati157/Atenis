// test/vnext/runtime/misconception-registry-required.test.ts
//
// Prova que Runtime com evaluator injetado exige misconceptionRegistry.

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
  MockEvaluator,
  evaluationResult,
} from "../../../lib/vnext/evaluator/mock"
import { InMemoryMisconceptionRegistry } from "../../../lib/vnext/misconceptions"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

function anyMock() {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
  const gateway = createGateway()
  gateway.register(mock)
  const evaluator = new MockEvaluator()
  evaluator.registerMatcher(
    () => true,
    { kind: "result", value: evaluationResult({ outcome: "correct", reasoning: "ok" }) },
    "catch-all",
  )
  return { gateway, evaluator }
}

const commonDeps = () => ({
  engine: new MethodEngine(),
  store: new InMemoryLearningStore(),
  clock: new FakeClock(),
  ids: new CounterIdGenerator(),
  criticAnalyze: (r: unknown) => analyze(r),
})

describe("Runtime com evaluator SEM registry e SEM flag → abort", () => {
  it("aborta primeira tick com misconception-registry-required", async () => {
    const { gateway, evaluator } = anyMock()
    const runtime = new Runtime({
      gateway,
      ...commonDeps(),
      evaluator,
      // Nem registry, nem allowMissingMisconceptionRegistry
    })
    const out = await runtime.tick({
      studentId: "s",
      topic: "funcao-quadratica",
      message: "?",
    })
    expect(out.aborted?.reason).toBe("misconception-registry-required")
  })
})

describe("Runtime com evaluator + flag `allowMissingMisconceptionRegistry=true` → passa com trace", () => {
  it("trace registra runtime.misconception-registry.allow-missing", async () => {
    const { gateway, evaluator } = anyMock()
    const runtime = new Runtime({
      gateway,
      ...commonDeps(),
      evaluator,
      allowMissingMisconceptionRegistry: true,
    })
    const out = await runtime.tick({
      studentId: "s",
      topic: "funcao-quadratica",
      message: "?",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
    })
    expect(out.aborted).toBeUndefined()
    expect(
      out.trace.some(
        (t) => t.step === "runtime.misconception-registry.allow-missing",
      ),
    ).toBe(true)
  })
})

describe("Runtime com evaluator + registry → normal (sem trace de warn)", () => {
  it("sem trace de fallback, sem abort", async () => {
    const { gateway, evaluator } = anyMock()
    const runtime = new Runtime({
      gateway,
      ...commonDeps(),
      evaluator,
      misconceptionRegistry: new InMemoryMisconceptionRegistry(),
    })
    const out = await runtime.tick({
      studentId: "s",
      topic: "funcao-quadratica",
      message: "?",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
    })
    expect(out.aborted).toBeUndefined()
    expect(
      out.trace.some(
        (t) => t.step === "runtime.misconception-registry.allow-missing",
      ),
    ).toBe(false)
    expect(
      out.trace.some(
        (t) => t.step === "runtime.misconception-registry.missing",
      ),
    ).toBe(false)
  })
})

describe("Runtime SEM evaluator não exige registry", () => {
  it("Runtime sem evaluator injetado passa sem tocar em misconception-registry", async () => {
    const { gateway } = anyMock()
    const runtime = new Runtime({
      gateway,
      ...commonDeps(),
      // sem evaluator, sem registry, sem flag
    })
    const out = await runtime.tick({
      studentId: "s",
      topic: "funcao-quadratica",
      message: "?",
    })
    expect(out.aborted).toBeUndefined()
  })
})
