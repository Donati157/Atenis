// test/vnext/engine/confused.test.ts
//
// A. confused é primeiro-classe:
//   1. transitions: practice+confused → evaluate (não fica em loop).
//   2. Runtime: evaluate registra attempt com eventKind=confused e
//      outcome=failure (a strategy sendo aplicada CERTAMENTE não pegou).
//   3. Adapt seguinte prefere `socratic` (revela raciocínio) quando
//      last event foi confused.

import { describe, it, expect } from "vitest"
import { decideNext, pickAdaptStrategy } from "../../../lib/vnext/engine/transitions"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { LearningTopicState } from "../../../lib/vnext/learning/types"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

function s0(): LearningTopicState {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-11T14:00:00.000Z",
  })
}

describe("confused — transitions", () => {
  it("practice + confused → evaluate (não practice-aguardando)", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentMethodPhase: "practice",
      currentStrategy: "worked_example",
      mastery: "emerging",
    }
    const d = decideNext(s, { kind: "confused" })
    expect(d.next).toBe("evaluate")
  })

  it("verify + confused → evaluate", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentMethodPhase: "verify",
      currentStrategy: "analogy",
      mastery: "developing",
    }
    const d = decideNext(s, { kind: "confused" })
    expect(d.next).toBe("evaluate")
  })
})

describe("confused — pickAdaptStrategy prefere socratic", () => {
  it("com preferAfterConfused=true e socratic ainda não tentada → socratic", () => {
    const s: LearningTopicState = {
      ...s0(),
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 1, successes: 0 },
      ],
      currentStrategy: "worked_example",
    }
    expect(pickAdaptStrategy(s, { preferAfterConfused: true })).toBe(
      "socratic",
    )
  })

  it("sem preferAfterConfused segue ordem padrão (analogy primeiro)", () => {
    const s: LearningTopicState = {
      ...s0(),
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 1, successes: 0 },
      ],
      currentStrategy: "worked_example",
    }
    expect(pickAdaptStrategy(s)).toBe("analogy")
  })

  it("com preferAfterConfused=true MAS socratic bloqueada → fallback", () => {
    const s: LearningTopicState = {
      ...s0(),
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 1, successes: 0 },
        { strategy: "socratic", tries: 2, successes: 0 }, // bloqueada
      ],
      currentStrategy: "worked_example",
    }
    const picked = pickAdaptStrategy(s, { preferAfterConfused: true })
    expect(picked).not.toBe("socratic")
    expect(picked).toBe("analogy") // primeira não tentada, não bloqueada
  })
})

describe("confused — Runtime integração", () => {
  it("aluno confuso registra attempt com eventKind=confused e state.lastStudentEventKind=confused", async () => {
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
    const studentId = "s-confused"
    const topic = "quadratic"

    // Sequência de ticks até chegar em practice, e então "confused".
    await runtime.tick({ studentId, topic, message: "?" }) // diagnose
    await runtime.tick({
      studentId,
      topic,
      message: "",
      studentEvent: { kind: "start" },
    }) // teach
    await runtime.tick({ studentId, topic, message: "" }) // practice (aguardando)
    // Agora envia confused:
    await runtime.tick({
      studentId,
      topic,
      message: "",
      studentEvent: { kind: "confused", text: "?" },
    }) // evaluate registra confused

    const state = await store.load(studentId, topic)
    expect(state).not.toBeNull()
    // Último attempt deve ser confused
    const lastAttempt = state!.attempts[state!.attempts.length - 1]
    expect(lastAttempt.eventKind).toBe("confused")
    expect(lastAttempt.outcome).toBe("failure")
    expect(state!.lastStudentEventKind).toBe("confused")
  })
})
