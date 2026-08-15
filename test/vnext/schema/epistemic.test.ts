// test/vnext/schema/epistemic.test.ts

import { describe, it, expect } from "vitest"
import {
  structuredResponseSchema,
  sourceSchema,
  claimSchema,
  evidenceSchema,
  provenanceSchema,
  LIMITS,
} from "../../../lib/vnext/schema/epistemic"
import validFixture from "../fixtures/responses/A-valid.json"

describe("schema/epistemic — Source + Provenance (Fase 0.1)", () => {
  it("aceita source válida com provenance default unverified", () => {
    const src = {
      id: "s1",
      type: "official",
      title: "BNCC",
      authorityTier: "primary-official",
      retrievedAt: "2026-01-01T00:00:00Z",
    }
    const parsed = sourceSchema.safeParse(src)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.provenance.status).toBe("unverified")
      expect(parsed.data.provenance.verificationMethod).toBe("none")
    }
  })

  it("aceita source com provenance verified completa", () => {
    const src = {
      id: "s1",
      type: "official",
      title: "BNCC",
      authorityTier: "primary-official",
      retrievedAt: "2026-01-01T00:00:00Z",
      provenance: {
        status: "verified",
        verificationMethod: "manual-curator",
        verifiedAt: "2026-06-01T00:00:00Z",
        domain: "basenacionalcomum.mec.gov.br",
      },
    }
    expect(sourceSchema.safeParse(src).success).toBe(true)
  })

  it("rejeita provenance.status fora do enum", () => {
    const p = { status: "trustworthy", verificationMethod: "none" }
    expect(provenanceSchema.safeParse(p).success).toBe(false)
  })

  it("rejeita authorityTier fora do enum", () => {
    const src = {
      id: "s1",
      type: "official",
      title: "BNCC",
      authorityTier: "muito-boa",
      retrievedAt: "2026-01-01T00:00:00Z",
    }
    expect(sourceSchema.safeParse(src).success).toBe(false)
  })

  it("rejeita url malformada", () => {
    const src = {
      id: "s1",
      type: "official",
      title: "BNCC",
      authorityTier: "primary-official",
      url: "isso-nao-eh-url",
      retrievedAt: "2026-01-01T00:00:00Z",
    }
    expect(sourceSchema.safeParse(src).success).toBe(false)
  })
})

describe("schema/epistemic — Claim", () => {
  it("aceita claim válida", () => {
    const c = {
      id: "c1",
      text: "x",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1"],
    }
    expect(claimSchema.safeParse(c).success).toBe(true)
  })

  it("rejeita id vazio", () => {
    const c = {
      id: "",
      text: "x",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: [],
    }
    expect(claimSchema.safeParse(c).success).toBe(false)
  })

  it("rejeita text acima do limite MEDIUM_TEXT_MAX", () => {
    const c = {
      id: "c1",
      text: "x".repeat(LIMITS.MEDIUM_TEXT_MAX + 1),
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: [],
    }
    expect(claimSchema.safeParse(c).success).toBe(false)
  })

  it("NÃO tem campo numérico de 'certainty'", () => {
    const shape = claimSchema.shape
    expect("certainty" in shape).toBe(false)
    expect("assertionLevel" in shape).toBe(true)
  })
})

describe("schema/epistemic — Evidence + Role (Fase 0.1)", () => {
  it("aceita evidence com role default primary", () => {
    const e = {
      id: "e1",
      text: "trecho",
      sourceId: "s1",
      supportStrength: "strong",
      quotationExact: false,
    }
    const parsed = evidenceSchema.safeParse(e)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.role).toBe("primary")
  })

  it("aceita role opposing", () => {
    const e = {
      id: "e1",
      text: "t",
      sourceId: "s1",
      supportStrength: "moderate",
      quotationExact: false,
      role: "opposing",
    }
    const parsed = evidenceSchema.safeParse(e)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.role).toBe("opposing")
  })

  it("rejeita role desconhecido", () => {
    const e = {
      id: "e1",
      text: "t",
      sourceId: "s1",
      supportStrength: "strong",
      quotationExact: false,
      role: "background",
    }
    expect(evidenceSchema.safeParse(e).success).toBe(false)
  })

  it("rejeita quotationExact ausente", () => {
    const e = {
      id: "e1",
      text: "trecho",
      sourceId: "s1",
      supportStrength: "strong",
    }
    expect(evidenceSchema.safeParse(e).success).toBe(false)
  })
})

describe("schema/epistemic — StructuredResponse", () => {
  it("aceita a fixture A (válida)", () => {
    const parsed = structuredResponseSchema.safeParse(validFixture)
    if (!parsed.success) {
      console.error(JSON.stringify(parsed.error.issues, null, 2))
    }
    expect(parsed.success).toBe(true)
  })

  it("aplica defaults [] em reviews e detectedConflicts quando ausentes", () => {
    const minimal = {
      claims: [
        {
          id: "c1",
          text: "x",
          type: "opinion",
          assertionLevel: "asserted",
          evidenceIds: [],
        },
      ],
      evidences: [],
      sources: [],
      analyses: [],
      primaryTakeaway: "a",
      nextStep: "b",
      meta: {
        generatedAt: "2026-08-11T00:00:00Z",
        modelName: "mock-v1",
        turnId: "t1",
      },
    }
    const parsed = structuredResponseSchema.safeParse(minimal)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.reviews).toEqual([])
      expect(parsed.data.detectedConflicts).toEqual([])
    }
  })

  it("rejeita primaryTakeaway vazio", () => {
    const bad = {
      claims: [],
      evidences: [],
      sources: [],
      analyses: [],
      primaryTakeaway: "",
      nextStep: "b",
      meta: {
        generatedAt: "2026-08-11T00:00:00Z",
        modelName: "mock-v1",
        turnId: "t1",
      },
    }
    expect(structuredResponseSchema.safeParse(bad).success).toBe(false)
  })

  it("rejeita mais de CLAIMS_MAX claims", () => {
    const claim = {
      id: "c",
      text: "x",
      type: "opinion",
      assertionLevel: "asserted",
      evidenceIds: [],
    }
    const bad = {
      claims: Array.from({ length: LIMITS.CLAIMS_MAX + 1 }, (_, i) => ({
        ...claim,
        id: `c${i}`,
      })),
      evidences: [],
      sources: [],
      analyses: [],
      primaryTakeaway: "a",
      nextStep: "b",
      meta: {
        generatedAt: "2026-08-11T00:00:00Z",
        modelName: "mock-v1",
        turnId: "t1",
      },
    }
    expect(structuredResponseSchema.safeParse(bad).success).toBe(false)
  })
})
