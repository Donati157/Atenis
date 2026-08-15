// test/vnext/critic/input-limits.test.ts
//
// Prova que payloads absurdos são REJEITADOS pelo schema Zod antes de
// alcançarem as regras — Critic não degrada silenciosamente sob input
// malicioso ou defeituoso.

import { describe, it, expect } from "vitest"
import { analyze } from "../../../lib/vnext/critic"
import { LIMITS } from "../../../lib/vnext/schema/epistemic"

function baseValidPayload() {
  return {
    claims: [] as unknown[],
    evidences: [] as unknown[],
    sources: [] as unknown[],
    analyses: [] as unknown[],
    reviews: [] as unknown[],
    detectedConflicts: [] as unknown[],
    primaryTakeaway: "ok",
    nextStep: "ok",
    meta: {
      generatedAt: "2026-08-11T00:00:00Z",
      modelName: "mock-v1",
      turnId: "t1",
    },
  }
}

describe("input-limits — cardinalidade", () => {
  it("rejeita mais que CLAIMS_MAX claims com SCHEMA_INVALID", () => {
    const p = baseValidPayload()
    p.claims = Array.from({ length: LIMITS.CLAIMS_MAX + 1 }, (_, i) => ({
      id: `c${i}`,
      text: "x",
      type: "opinion",
      assertionLevel: "asserted",
      evidenceIds: [],
    }))
    const report = analyze(p)
    expect(report.recommendedAction).toBe("reject")
    expect(report.issues[0].code).toBe("SCHEMA_INVALID")
  })

  it("rejeita mais que EVIDENCES_MAX evidences", () => {
    const p = baseValidPayload()
    p.evidences = Array.from({ length: LIMITS.EVIDENCES_MAX + 1 }, (_, i) => ({
      id: `e${i}`,
      text: "x",
      sourceId: "s1",
      supportStrength: "moderate",
      quotationExact: false,
    }))
    expect(analyze(p).recommendedAction).toBe("reject")
  })

  it("rejeita mais que SOURCES_MAX sources", () => {
    const p = baseValidPayload()
    p.sources = Array.from({ length: LIMITS.SOURCES_MAX + 1 }, (_, i) => ({
      id: `s${i}`,
      type: "web",
      title: "t",
      authorityTier: "web-recognized",
      retrievedAt: "2026-01-01T00:00:00Z",
    }))
    expect(analyze(p).recommendedAction).toBe("reject")
  })

  it("rejeita mais que EVIDENCE_IDS_PER_CLAIM_MAX em uma claim", () => {
    const p = baseValidPayload()
    p.claims = [
      {
        id: "c1",
        text: "x",
        type: "opinion",
        assertionLevel: "asserted",
        evidenceIds: Array.from(
          { length: LIMITS.EVIDENCE_IDS_PER_CLAIM_MAX + 1 },
          (_, i) => `e${i}`,
        ),
      },
    ]
    expect(analyze(p).recommendedAction).toBe("reject")
  })
})

describe("input-limits — tamanho de strings", () => {
  it("rejeita primaryTakeaway acima de SHORT_TEXT_MAX", () => {
    const p = baseValidPayload()
    p.primaryTakeaway = "x".repeat(LIMITS.SHORT_TEXT_MAX + 1)
    expect(analyze(p).recommendedAction).toBe("reject")
  })

  it("rejeita evidence.text acima de LONG_TEXT_MAX", () => {
    const p = baseValidPayload()
    p.sources = [
      {
        id: "s1",
        type: "web",
        title: "t",
        authorityTier: "web-recognized",
        retrievedAt: "2026-01-01T00:00:00Z",
      },
    ]
    p.evidences = [
      {
        id: "e1",
        text: "x".repeat(LIMITS.LONG_TEXT_MAX + 1),
        sourceId: "s1",
        supportStrength: "strong",
        quotationExact: false,
      },
    ]
    expect(analyze(p).recommendedAction).toBe("reject")
  })

  it("rejeita claim.text absurdamente grande (10× MEDIUM_TEXT_MAX)", () => {
    const p = baseValidPayload()
    p.claims = [
      {
        id: "c1",
        text: "x".repeat(LIMITS.MEDIUM_TEXT_MAX * 10),
        type: "opinion",
        assertionLevel: "asserted",
        evidenceIds: [],
      },
    ]
    expect(analyze(p).recommendedAction).toBe("reject")
  })
})

describe("input-limits — Critic não trava com payload gigante", () => {
  it("payload no limite máximo executa em < 1 segundo e retorna reject por SCHEMA_INVALID quando extrapola", () => {
    const p = baseValidPayload()
    // Um a mais que o permitido — schema rejeita rapidamente.
    p.claims = Array.from({ length: LIMITS.CLAIMS_MAX + 5 }, (_, i) => ({
      id: `c${i}`,
      text: "x".repeat(LIMITS.MEDIUM_TEXT_MAX),
      type: "opinion",
      assertionLevel: "asserted",
      evidenceIds: [],
    }))
    const start = performance.now()
    const report = analyze(p)
    const elapsed = performance.now() - start
    expect(report.recommendedAction).toBe("reject")
    expect(elapsed).toBeLessThan(1000)
  })
})
