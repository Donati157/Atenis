// test/vnext/runtime/ensure-server-meta.test.ts
//
// Fase 2B.6.3: prova que `ensureServerMeta` injeta meta corretamente e
// que o objeto resultante satisfaz `structuredResponseSchema` completo
// mesmo quando o LLM devolveu ZERO campos de meta.

import { describe, it, expect } from "vitest"
import {
  buildServerMeta,
  ensureServerMeta,
} from "../../../lib/vnext/runtime/ensure-server-meta"
import { structuredResponseSchema } from "../../../lib/vnext/schema/epistemic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"

function ctx() {
  return {
    providerId: "openai",
    modelId: "gpt-4o-mini",
    phase: "diagnose" as const,
    clock: new FakeClock(),
    ids: new CounterIdGenerator(),
  }
}

// Payload mínimo válido SEM meta — o que esperamos do LLM depois de
// Fase 2B.6.3 (LLM instruído a NÃO gerar meta).
function llmPayloadWithoutMeta() {
  return {
    claims: [
      {
        id: "c1",
        text: "aluno demonstra desconhecimento inicial",
        type: "interpretation" as const,
        assertionLevel: "hedged" as const,
        evidenceIds: ["e1"],
      },
    ],
    evidences: [
      {
        id: "e1",
        text: "aluno respondeu que não lembra a fórmula",
        sourceId: "s1",
        supportStrength: "strong" as const,
        quotationExact: false,
        role: "primary" as const,
      },
    ],
    sources: [
      {
        id: "s1",
        type: "generated" as const,
        title: "Interação do aluno neste turno",
        authorityTier: "generated" as const,
        retrievedAt: "2026-08-14T00:00:00.000Z",
        provenance: {
          status: "unverified" as const,
          verificationMethod: "none" as const,
        },
      },
    ],
    analyses: [],
    reviews: [],
    detectedConflicts: [],
    primaryTakeaway:
      "aluno chega sem lembrar a fórmula; melhor começar por identificação de coeficientes",
    nextStep:
      "propor tarefa concreta: reescrever f(x)=2x²−3x+1 destacando a, b, c",
  }
}

describe("buildServerMeta — puramente determinístico dado o ctx", () => {
  it("popula os 4 campos com valores autoritativos do server", () => {
    const meta = buildServerMeta(ctx())
    expect(meta.generatedAt).toBeTruthy()
    expect(meta.generatedAt).toMatch(/T.*Z$/) // ISO com T e Z
    expect(meta.modelName).toBe("openai:gpt-4o-mini")
    expect(meta.turnId).toMatch(/^turn-\d+$/)
    expect(meta.methodPhase).toBe("diagnose")
  })

  it("gera turnId distinto em chamadas sucessivas do mesmo IdGenerator", () => {
    const c = ctx()
    const m1 = buildServerMeta(c)
    const m2 = buildServerMeta(c)
    expect(m1.turnId).not.toBe(m2.turnId)
  })

  it("modelName inclui providerId:modelId (não só um)", () => {
    const c = ctx()
    c.providerId = "custom-provider"
    c.modelId = "custom-model-v1"
    expect(buildServerMeta(c).modelName).toBe("custom-provider:custom-model-v1")
  })
})

describe("ensureServerMeta — injeção sobre payload do LLM", () => {
  it("injeta meta quando LLM devolveu payload SEM o campo (caso principal)", () => {
    const raw = llmPayloadWithoutMeta()
    const result = ensureServerMeta(raw, ctx())
    expect(result.meta).toBeDefined()
    expect((result.meta as { modelName: string }).modelName).toBe(
      "openai:gpt-4o-mini",
    )
  })

  it("PROVA CENTRAL: LLM não precisa gerar meta — objeto resultante passa structuredResponseSchema COMPLETO", () => {
    const raw = llmPayloadWithoutMeta()
    const withMeta = ensureServerMeta(raw, ctx())
    const parsed = structuredResponseSchema.safeParse(withMeta)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.meta.generatedAt).toBeTruthy()
      expect(parsed.data.meta.modelName).toBe("openai:gpt-4o-mini")
      expect(parsed.data.meta.turnId).toMatch(/^turn-\d+$/)
      expect(parsed.data.meta.methodPhase).toBe("diagnose")
    }
  })

  it("SOBRESCREVE meta parcial devolvido pelo LLM (server é fonte de verdade)", () => {
    const raw = {
      ...llmPayloadWithoutMeta(),
      meta: {
        generatedAt: "1999-01-01T00:00:00.000Z", // valor absurdo do LLM
        modelName: "modelo-que-o-llm-inventou",
        turnId: "id-inventado-pelo-llm",
      },
    }
    const withMeta = ensureServerMeta(raw, ctx())
    const meta = withMeta.meta as {
      generatedAt: string
      modelName: string
      turnId: string
    }
    // Server sobrescreve com valores próprios
    expect(meta.generatedAt).not.toBe("1999-01-01T00:00:00.000Z")
    expect(meta.modelName).toBe("openai:gpt-4o-mini")
    expect(meta.turnId).toMatch(/^turn-\d+$/)
    expect(meta.turnId).not.toBe("id-inventado-pelo-llm")
  })

  it("resistente a raw=null / undefined / array — devolve objeto com meta", () => {
    for (const bad of [null, undefined, [], "string qualquer", 42]) {
      const result = ensureServerMeta(bad, ctx())
      expect(result).toBeTypeOf("object")
      expect(result.meta).toBeDefined()
    }
  })

  it("outros campos do LLM são preservados inalterados", () => {
    const raw = llmPayloadWithoutMeta()
    const withMeta = ensureServerMeta(raw, ctx())
    expect(withMeta.claims).toEqual(raw.claims)
    expect(withMeta.evidences).toEqual(raw.evidences)
    expect(withMeta.sources).toEqual(raw.sources)
    expect(withMeta.primaryTakeaway).toBe(raw.primaryTakeaway)
    expect(withMeta.nextStep).toBe(raw.nextStep)
  })
})

describe("structuredResponseSchema — contrato final intocado", () => {
  it("continua exigindo meta obrigatório (regressão check)", () => {
    const rawWithoutMeta = llmPayloadWithoutMeta()
    const parsed = structuredResponseSchema.safeParse(rawWithoutMeta)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path.join("."))
      expect(paths).toContain("meta")
    }
  })
})

describe("ensureServerMeta — Fase 2B.7: sources[i].retrievedAt server-side", () => {
  it("injeta retrievedAt quando source omitiu o campo", () => {
    const raw = {
      ...llmPayloadWithoutMeta(),
      sources: [
        {
          id: "s1",
          type: "generated" as const,
          title: "Fonte sem retrievedAt",
          authorityTier: "generated" as const,
          // ← sem retrievedAt
          provenance: {
            status: "unverified" as const,
            verificationMethod: "none" as const,
          },
        },
      ],
    }
    const result = ensureServerMeta(raw, ctx())
    const sources = result.sources as Array<{ retrievedAt: string }>
    expect(sources[0].retrievedAt).toBeTruthy()
    expect(sources[0].retrievedAt).toMatch(/T.*Z$/)
  })

  it("injeta retrievedAt quando source tem string vazia", () => {
    const raw = {
      ...llmPayloadWithoutMeta(),
      sources: [
        {
          id: "s1",
          type: "generated" as const,
          title: "Fonte com retrievedAt vazio",
          authorityTier: "generated" as const,
          retrievedAt: "",
          provenance: {
            status: "unverified" as const,
            verificationMethod: "none" as const,
          },
        },
      ],
    }
    const result = ensureServerMeta(raw, ctx())
    const sources = result.sources as Array<{ retrievedAt: string }>
    expect(sources[0].retrievedAt.length).toBeGreaterThan(0)
    expect(sources[0].retrievedAt).not.toBe("")
  })

  it("PRESERVA retrievedAt quando source tem ISO válido (não sobrescreve)", () => {
    const isoDataset = "2024-05-01T12:00:00.000Z"
    const raw = {
      ...llmPayloadWithoutMeta(),
      sources: [
        {
          id: "s1",
          type: "textbook" as const,
          title: "Livro didático",
          authorityTier: "textbook" as const,
          retrievedAt: isoDataset,
          provenance: {
            status: "unverified" as const,
            verificationMethod: "none" as const,
          },
        },
      ],
    }
    const result = ensureServerMeta(raw, ctx())
    const sources = result.sources as Array<{ retrievedAt: string }>
    expect(sources[0].retrievedAt).toBe(isoDataset)
  })

  it("PROVA CENTRAL 2B.7: source LLM-generated SEM retrievedAt passa structuredResponseSchema completo", () => {
    const raw = {
      ...llmPayloadWithoutMeta(),
      sources: [
        {
          id: "s1",
          type: "generated" as const,
          title: "Fonte gerada, retrievedAt omitido pelo LLM",
          authorityTier: "generated" as const,
          provenance: {
            status: "unverified" as const,
            verificationMethod: "none" as const,
          },
        },
      ],
    }
    const withMeta = ensureServerMeta(raw, ctx())
    const parsed = structuredResponseSchema.safeParse(withMeta)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.sources[0].retrievedAt).toBeTruthy()
      expect(parsed.data.meta.generatedAt).toBeTruthy()
    }
  })

  it("array sources vazio: NÃO cria sources; meta ainda é injetado", () => {
    const raw = { ...llmPayloadWithoutMeta(), sources: [] }
    const result = ensureServerMeta(raw, ctx())
    expect(result.sources).toEqual([])
    expect(result.meta).toBeDefined()
  })
})
