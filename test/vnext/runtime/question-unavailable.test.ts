// test/vnext/runtime/question-unavailable.test.ts
//
// K. bank vazio + requireQuestion=true → abort question-unavailable.

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
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

describe("K. question-unavailable", () => {
  it("bank vazio + requireQuestion=true → abort com reason question-unavailable", async () => {
    const mock = new MockProvider()
    registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
    const gateway = createGateway()
    gateway.register(mock)
    const bank = new InMemoryQuestionBank()
    const selector = new DeterministicQuestionSelector(bank)
    const runtime = new Runtime({
      gateway,
      engine: new MethodEngine(),
      store: new InMemoryLearningStore(),
      clock: new FakeClock(),
      ids: new CounterIdGenerator(),
      criticAnalyze: (r) => analyze(r),
      questionBank: bank,
      questionSelector: selector,
      requireQuestion: true,
    })
    const out = await runtime.tick({
      studentId: "s",
      topic: "funcao-quadratica",
      message: "?",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
    })
    expect(out.aborted?.reason).toBe("question-unavailable")
    expect(out.aborted?.detail).toContain("funcao-quadratica")
    expect(out.state.currentMethodPhase).toBe("abort")
  })

  it("bank vazio + requireQuestion=false → prossegue (LLM inventa)", async () => {
    const mock = new MockProvider()
    registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
    const gateway = createGateway()
    gateway.register(mock)
    const bank = new InMemoryQuestionBank()
    const selector = new DeterministicQuestionSelector(bank)
    const runtime = new Runtime({
      gateway,
      engine: new MethodEngine(),
      store: new InMemoryLearningStore(),
      clock: new FakeClock(),
      ids: new CounterIdGenerator(),
      criticAnalyze: (r) => analyze(r),
      questionBank: bank,
      questionSelector: selector,
      requireQuestion: false, // permissivo
    })
    const out = await runtime.tick({
      studentId: "s",
      topic: "funcao-quadratica",
      message: "?",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
    })
    // Não aborta; selectedQuestion é null; MockProvider gera a resposta.
    expect(out.aborted).toBeUndefined()
    expect(out.selectedQuestion).toBeNull()
    expect(out.executedPhase).toBe("diagnose")
  })
})
