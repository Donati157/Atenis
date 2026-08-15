// test/vnext/learning/serialize.test.ts
//
// H. persistence interface: state serializa/deserializa sem perda,
//    versão nova aplica migração de state antigo.

import { describe, it, expect } from "vitest"
import {
  deserializeState,
  learningTopicStateSchema,
  serializeState,
} from "../../../lib/vnext/learning/serialize"
import {
  LEARNING_STATE_SCHEMA_VERSION,
  newTopicState,
} from "../../../lib/vnext/learning/types"

function state1() {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-11T14:00:00.000Z",
  })
}

describe("serialize/deserialize — roundtrip", () => {
  it("state fresco roundtrip é bit-idêntico", () => {
    const s = state1()
    const raw = serializeState(s)
    const result = deserializeState(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state).toEqual(s)
      expect(result.migrated).toBe(false)
    }
  })

  it("state com attempts roundtrip é bit-idêntico", () => {
    const s = {
      ...state1(),
      attempts: [
        {
          strategy: "analogy" as const,
          outcome: "success" as const,
          methodPhase: "practice" as const,
          eventKind: "answer" as const,
          questionId: null,
          at: "2026-08-11T14:00:05.000Z",
        },
      ],
      mastery: "developing" as const,
      strategyEffectiveness: [
        { strategy: "analogy" as const, tries: 1, successes: 1 },
      ],
      currentStrategy: "analogy" as const,
      currentMethodPhase: "verify" as const,
    }
    const raw = serializeState(s)
    const result = deserializeState(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state).toEqual(s)
  })

  it("é JSON puro (sem Date, funcs)", () => {
    const raw = serializeState(state1())
    const roundtrip = JSON.parse(JSON.stringify(raw))
    expect(roundtrip).toEqual(raw)
  })
})

describe("deserialize — validação", () => {
  it("rejeita payload sem campos obrigatórios", () => {
    const bad = { studentId: "s1" }
    const r = deserializeState(bad)
    expect(r.ok).toBe(false)
  })

  it("rejeita schemaVersion diferente do esperado (não coberto por migração)", () => {
    const wrong = { ...state1(), schemaVersion: 999 }
    const r = deserializeState(wrong)
    expect(r.ok).toBe(false)
  })
})

describe("deserialize — migração v0 → v1", () => {
  it("state pré-1.1 (sem schemaVersion, com cycleCount) é migrado", () => {
    const legacy = {
      studentId: "s1",
      topic: "quadratic",
      mastery: "unknown",
      attempts: [
        {
          strategy: "worked_example",
          outcome: "failure",
          methodPhase: "practice",
          at: "2026-01-01T00:00:00Z",
          // sem eventKind
        },
      ],
      strategyEffectiveness: [],
      currentMethodPhase: "diagnose",
      currentStrategy: null,
      cycleCount: 5,
      adaptCount: 1,
      verifyPassStreak: 0,
      createdAt: "2026-01-01T00:00:00Z",
      lastUpdatedAt: "2026-01-01T00:00:00Z",
    }
    const r = deserializeState(legacy)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.migrated).toBe(true)
      expect(r.fromVersion).toBe(0)
      expect(r.state.schemaVersion).toBe(LEARNING_STATE_SCHEMA_VERSION)
      expect(r.state.ticks).toBe(5) // cycleCount virou ticks
      expect(r.state.generativeTurns).toBe(0)
      expect(r.state.refinementAttempts).toBe(0)
      expect(r.state.lastStudentEventKind).toBeNull()
      // attempts migrated
      expect(r.state.attempts[0].eventKind).toBe("answer")
    }
  })
})

describe("schema exportado", () => {
  it("learningTopicStateSchema valida state válido", () => {
    expect(learningTopicStateSchema.safeParse(state1()).success).toBe(true)
  })
})
