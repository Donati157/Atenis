// test/vnext/learning/updates.test.ts

import { describe, it, expect } from "vitest"
import {
  addRefinementAttempts,
  bumpVerifyStreak,
  effectivenessRatio,
  incrementAdapt,
  incrementGenerativeTurns,
  incrementTicks,
  recordAttempt,
  setCurrentPhase,
  setLastEventKind,
  updateMastery,
  updateStrategyEffectiveness,
} from "../../../lib/vnext/learning/updates"
import { newTopicState } from "../../../lib/vnext/learning/types"

function s0() {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-11T14:00:00.000Z",
  })
}

describe("recordAttempt", () => {
  it("adiciona attempt e atualiza lastUpdatedAt", () => {
    const s = recordAttempt(s0(), {
      strategy: "worked_example",
      outcome: "success",
      methodPhase: "practice",
      eventKind: "answer",
      at: "2026-08-11T14:01:00.000Z",
    })
    expect(s.attempts.length).toBe(1)
    expect(s.lastUpdatedAt).toBe("2026-08-11T14:01:00.000Z")
  })

  it("preserva eventKind confused separado de answer", () => {
    const s = recordAttempt(s0(), {
      strategy: "worked_example",
      outcome: "failure",
      methodPhase: "practice",
      eventKind: "confused",
      at: "2026-08-11T14:02:00.000Z",
    })
    expect(s.attempts[0].eventKind).toBe("confused")
  })
})

describe("updateStrategyEffectiveness", () => {
  it("cria entry nova em success", () => {
    const s = updateStrategyEffectiveness(s0(), "analogy", "success")
    expect(s.strategyEffectiveness).toHaveLength(1)
    expect(s.strategyEffectiveness[0]).toEqual({
      strategy: "analogy",
      tries: 1,
      successes: 1,
    })
  })

  it("incrementa entry existente sem duplicar", () => {
    let s = updateStrategyEffectiveness(s0(), "worked_example", "failure")
    s = updateStrategyEffectiveness(s, "worked_example", "success")
    expect(s.strategyEffectiveness).toHaveLength(1)
    expect(s.strategyEffectiveness[0]).toEqual({
      strategy: "worked_example",
      tries: 2,
      successes: 1,
    })
  })

  it("mantém entries ordenadas alfabeticamente (determinismo)", () => {
    let s = updateStrategyEffectiveness(s0(), "worked_example", "success")
    s = updateStrategyEffectiveness(s, "analogy", "success")
    s = updateStrategyEffectiveness(s, "socratic", "failure")
    expect(s.strategyEffectiveness.map((x) => x.strategy)).toEqual([
      "analogy",
      "socratic",
      "worked_example",
    ])
  })
})

describe("updateMastery", () => {
  it("success em practice sobe 1 nível", () => {
    const s = updateMastery(s0(), "success", "practice")
    expect(s.mastery).toBe("emerging")
  })

  it("success em verify sobe 2 níveis", () => {
    const s = updateMastery(s0(), "success", "verify")
    expect(s.mastery).toBe("developing")
  })

  it("failure NÃO decai mastery", () => {
    const start = { ...s0(), mastery: "developing" as const }
    const s = updateMastery(start, "failure", "practice")
    expect(s.mastery).toBe("developing")
  })

  it("não passa de 'secure'", () => {
    const start = { ...s0(), mastery: "secure" as const }
    const s = updateMastery(start, "success", "verify")
    expect(s.mastery).toBe("secure")
  })
})

describe("counters (Fase 1.1: separados)", () => {
  it("incrementTicks atualiza ticks e timestamp", () => {
    const s = incrementTicks(s0(), "2026-08-11T14:05:00.000Z")
    expect(s.ticks).toBe(1)
    expect(s.lastUpdatedAt).toBe("2026-08-11T14:05:00.000Z")
  })

  it("incrementGenerativeTurns só sobe quando explicitamente chamado", () => {
    const s = incrementGenerativeTurns(s0())
    expect(s.generativeTurns).toBe(1)
    expect(s.ticks).toBe(0) // NÃO afeta ticks
  })

  it("addRefinementAttempts soma o n passado", () => {
    let s = addRefinementAttempts(s0(), 2)
    expect(s.refinementAttempts).toBe(2)
    s = addRefinementAttempts(s, 1)
    expect(s.refinementAttempts).toBe(3)
  })

  it("incrementAdapt aumenta adaptCount", () => {
    expect(incrementAdapt(s0()).adaptCount).toBe(1)
  })

  it("bumpVerifyStreak zera em fail e incrementa em pass", () => {
    let s = bumpVerifyStreak(s0(), true)
    expect(s.verifyPassStreak).toBe(1)
    s = bumpVerifyStreak(s, true)
    expect(s.verifyPassStreak).toBe(2)
    s = bumpVerifyStreak(s, false)
    expect(s.verifyPassStreak).toBe(0)
  })

  it("setLastEventKind grava sem afetar outras contagens", () => {
    const s = setLastEventKind(s0(), "confused")
    expect(s.lastStudentEventKind).toBe("confused")
    expect(s.ticks).toBe(0)
  })
})

describe("setCurrentPhase", () => {
  it("atualiza phase + strategy + timestamp", () => {
    const s = setCurrentPhase(
      s0(),
      "teach",
      "analogy",
      "2026-08-11T14:10:00.000Z",
    )
    expect(s.currentMethodPhase).toBe("teach")
    expect(s.currentStrategy).toBe("analogy")
    expect(s.lastUpdatedAt).toBe("2026-08-11T14:10:00.000Z")
  })
})

describe("effectivenessRatio", () => {
  it("0/0 = 0", () => {
    expect(
      effectivenessRatio({ strategy: "socratic", tries: 0, successes: 0 }),
    ).toBe(0)
  })
  it("3/4 = 0.75", () => {
    expect(
      effectivenessRatio({ strategy: "socratic", tries: 4, successes: 3 }),
    ).toBe(0.75)
  })
})
