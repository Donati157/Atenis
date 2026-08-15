// test/vnext/critic/rules.test.ts

import { describe, it, expect } from "vitest"
import { schemaIntegrityRule } from "../../../lib/vnext/critic/rules/schema-integrity"
import { evidenceCoverageRule } from "../../../lib/vnext/critic/rules/evidence-coverage"
import { sourceAuthorityRule } from "../../../lib/vnext/critic/rules/source-authority"
import { sourceProvenanceRule } from "../../../lib/vnext/critic/rules/source-provenance"
import { factualSupportRule } from "../../../lib/vnext/critic/rules/factual-support"
import {
  analysisNotRepetitionRule,
  jaccardBigrams,
} from "../../../lib/vnext/critic/rules/analysis-not-repetition"
import { sourceConflictRule } from "../../../lib/vnext/critic/rules/source-conflict"
import { factualValidatorHookRule } from "../../../lib/vnext/critic/rules/factual-validator-hook"
import type { StructuredResponse } from "../../../lib/vnext/schema/epistemic"

function baseResponse(): StructuredResponse {
  return {
    claims: [],
    evidences: [],
    sources: [],
    analyses: [],
    reviews: [],
    detectedConflicts: [],
    primaryTakeaway: "x",
    nextStep: "y",
    meta: {
      generatedAt: "2026-08-11T00:00:00Z",
      modelName: "mock-v1",
      turnId: "t",
    },
  }
}

function makeSource(
  id: string,
  authorityTier: StructuredResponse["sources"][number]["authorityTier"],
  provenance: Partial<
    StructuredResponse["sources"][number]["provenance"]
  > = {},
): StructuredResponse["sources"][number] {
  return {
    id,
    type: "textbook",
    title: id,
    authorityTier,
    retrievedAt: "2026-01-01T00:00:00Z",
    provenance: {
      status: "unverified",
      verificationMethod: "none",
      ...provenance,
    },
  }
}

// ============================================================
// schema-integrity
// ============================================================
describe("rule: schema-integrity", () => {
  it("passa quando referências estão íntegras", () => {
    const r = baseResponse()
    r.sources.push(makeSource("s1", "textbook"))
    r.evidences.push({
      id: "e1",
      text: "t",
      sourceId: "s1",
      supportStrength: "strong",
      quotationExact: false,
      role: "primary",
    })
    r.claims.push({
      id: "c1",
      text: "t",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1"],
    })
    const results = schemaIntegrityRule.check(r, {})
    expect(results.every((x) => x.passed)).toBe(true)
  })

  it("falha quando evidenceId referenciado por Claim não existe — sem suggestion (fatal)", () => {
    const r = baseResponse()
    r.claims.push({
      id: "c1",
      text: "t",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["ev-fantasma"],
    })
    const results = schemaIntegrityRule.check(r, {})
    const failed = results.filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.code).toBe("BROKEN_REFERENCE")
    expect(failed[0].issue?.location).toBe("claims.0.evidenceIds.0")
    // BROKEN_REFERENCE é fatal — sem suggestion
    expect(failed[0].issue?.suggestion).toBeUndefined()
  })

  it("falha com location correto quando sourceId em Evidence não existe", () => {
    const r = baseResponse()
    r.evidences.push({
      id: "e1",
      text: "t",
      sourceId: "src-fantasma",
      supportStrength: "strong",
      quotationExact: false,
      role: "primary",
    })
    const results = schemaIntegrityRule.check(r, {})
    const failed = results.filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.location).toBe("evidences.0.sourceId")
  })
})

// ============================================================
// evidence-coverage
// ============================================================
describe("rule: evidence-coverage", () => {
  it("falha (error) com suggestion add-evidence", () => {
    const r = baseResponse()
    r.claims.push({
      id: "c1",
      text: "t",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: [],
    })
    const results = evidenceCoverageRule.check(r, {})
    const failed = results.filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.code).toBe("MISSING_EVIDENCE")
    expect(failed[0].issue?.location).toBe("claims.0.evidenceIds")
    expect(failed[0].issue?.suggestion?.operation).toBe("add-evidence")
  })

  it("aceita Claim opinion sem evidences", () => {
    const r = baseResponse()
    r.claims.push({
      id: "c1",
      text: "t",
      type: "opinion",
      assertionLevel: "asserted",
      evidenceIds: [],
    })
    expect(evidenceCoverageRule.check(r, {}).every((x) => x.passed)).toBe(true)
  })
})

// ============================================================
// source-authority
// ============================================================
describe("rule: source-authority", () => {
  it("error com suggestion upgrade-source quando fact só tem web-unknown", () => {
    const r = baseResponse()
    r.sources.push(makeSource("s-blog", "web-unknown"))
    r.evidences.push({
      id: "e1",
      text: "t",
      sourceId: "s-blog",
      supportStrength: "strong",
      quotationExact: false,
      role: "primary",
    })
    r.claims.push({
      id: "c1",
      text: "t",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1"],
    })
    const failed = sourceAuthorityRule.check(r, {}).filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.severity).toBe("error")
    expect(failed[0].issue?.suggestion?.operation).toBe("upgrade-source")
  })

  it("warn quando fact mistura web-unknown com fonte forte", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s-blog", "web-unknown"),
      makeSource("s-bncc", "primary-official"),
    )
    r.evidences.push(
      {
        id: "e-blog",
        text: "t",
        sourceId: "s-blog",
        supportStrength: "moderate",
        quotationExact: false,
        role: "primary",
      },
      {
        id: "e-bncc",
        text: "t",
        sourceId: "s-bncc",
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
    )
    r.claims.push({
      id: "c1",
      text: "t",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e-blog", "e-bncc"],
    })
    const failed = sourceAuthorityRule.check(r, {}).filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.severity).toBe("warn")
  })
})

// ============================================================
// source-provenance (nova regra Fase 0.1)
// ============================================================
describe("rule: source-provenance", () => {
  it("warn quando authorityTier alto declarado com provenance unverified", () => {
    const r = baseResponse()
    r.sources.push(makeSource("s1", "primary-official"))
    const failed = sourceProvenanceRule.check(r, {}).filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.code).toBe("UNVERIFIED_HIGH_AUTHORITY_CLAIM")
    expect(failed[0].issue?.severity).toBe("warn")
    expect(failed[0].issue?.suggestion?.operation).toBe("verify-source")
  })

  it("passa quando provenance é verified com method e verifiedAt", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s1", "primary-official", {
        status: "verified",
        verificationMethod: "manual-curator",
        verifiedAt: "2026-06-01T00:00:00Z",
      }),
    )
    expect(sourceProvenanceRule.check(r, {}).every((x) => x.passed)).toBe(true)
  })

  it("error quando verified mas sem verificationMethod (fatal, sem suggestion)", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s1", "primary-official", {
        status: "verified",
        verificationMethod: "none",
        verifiedAt: "2026-06-01T00:00:00Z",
      }),
    )
    const failed = sourceProvenanceRule.check(r, {}).filter((x) => !x.passed)
    expect(failed[0].issue?.code).toBe("INCONSISTENT_VERIFICATION")
    expect(failed[0].issue?.suggestion).toBeUndefined()
  })

  it("error quando disputed", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s1", "primary-official", { status: "disputed" }),
    )
    const failed = sourceProvenanceRule.check(r, {}).filter((x) => !x.passed)
    expect(failed[0].issue?.code).toBe("DISPUTED_SOURCE")
  })

  it("passa silenciosamente quando fonte de baixa autoridade fica unverified", () => {
    const r = baseResponse()
    r.sources.push(makeSource("s1", "web-unknown"))
    expect(sourceProvenanceRule.check(r, {}).every((x) => x.passed)).toBe(true)
  })
})

// ============================================================
// factual-support
// ============================================================
describe("rule: factual-support", () => {
  it("error com suggestion add-evidence quando todas weak", () => {
    const r = baseResponse()
    r.sources.push(makeSource("s", "textbook"))
    r.evidences.push(
      {
        id: "e1",
        text: "t",
        sourceId: "s",
        supportStrength: "weak",
        quotationExact: false,
        role: "primary",
      },
      {
        id: "e2",
        text: "t",
        sourceId: "s",
        supportStrength: "weak",
        quotationExact: false,
        role: "primary",
      },
    )
    r.claims.push({
      id: "c1",
      text: "t",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1", "e2"],
    })
    const failed = factualSupportRule.check(r, {}).filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.code).toBe("WEAK_SUPPORT_FOR_FACT")
    expect(failed[0].issue?.suggestion?.operation).toBe("add-evidence")
  })
})

// ============================================================
// analysis-not-repetition
// ============================================================
describe("rule: analysis-not-repetition", () => {
  it("jaccardBigrams: idênticos → 1", () => {
    const s = "isso é um teste"
    expect(jaccardBigrams(s, s)).toBeCloseTo(1)
  })

  it("jaccardBigrams: disjuntos → 0", () => {
    expect(jaccardBigrams("gato preto", "sol azul")).toBe(0)
  })

  it("warn com suggestion rewrite-analysis quando copia literal", () => {
    const r = baseResponse()
    r.sources.push(makeSource("s", "textbook"))
    const texto =
      "A célula eucariótica possui núcleo definido delimitado por membrana nuclear."
    r.evidences.push({
      id: "e1",
      text: texto,
      sourceId: "s",
      supportStrength: "strong",
      quotationExact: true,
      role: "primary",
    })
    r.claims.push({
      id: "c1",
      text: "célula tem núcleo",
      type: "definition",
      assertionLevel: "asserted",
      evidenceIds: ["e1"],
    })
    r.analyses.push({
      id: "a1",
      claimId: "c1",
      evidenceIds: ["e1"],
      text: texto,
      inferences: [],
      counterarguments: [],
      uncertainty: [],
    })
    const failed = analysisNotRepetitionRule
      .check(r, {})
      .filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.code).toBe("ANALYSIS_REPEATS_EVIDENCE")
    expect(failed[0].issue?.suggestion?.operation).toBe("rewrite-analysis")
  })
})

// ============================================================
// source-conflict (Fase 0.1 usa Evidence.role)
// ============================================================
describe("rule: source-conflict", () => {
  it("(a) error quando declared sem tratamento", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s1", "primary-official"),
      makeSource("s2", "web-unknown"),
    )
    r.evidences.push(
      {
        id: "e1",
        text: "a",
        sourceId: "s1",
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
      {
        id: "e2",
        text: "b",
        sourceId: "s2",
        supportStrength: "moderate",
        quotationExact: false,
        role: "primary",
      },
    )
    r.claims.push({
      id: "c1",
      text: "x",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1", "e2"],
    })
    r.detectedConflicts.push({
      claimId: "c1",
      sourceIds: ["s1", "s2"],
      description: "d",
    })
    const failed = sourceConflictRule.check(r, {}).filter((x) => !x.passed)
    expect(failed.some((f) => f.issue?.code === "UNMARKED_CONFLICT")).toBe(true)
  })

  it("(a) passa quando declared tem Review contested", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s1", "primary-official"),
      makeSource("s2", "web-unknown"),
    )
    r.evidences.push(
      {
        id: "e1",
        text: "a",
        sourceId: "s1",
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
      {
        id: "e2",
        text: "b",
        sourceId: "s2",
        supportStrength: "moderate",
        quotationExact: false,
        role: "primary",
      },
    )
    r.claims.push({
      id: "c1",
      text: "x",
      type: "fact",
      assertionLevel: "hedged",
      evidenceIds: ["e1", "e2"],
    })
    r.detectedConflicts.push({
      claimId: "c1",
      sourceIds: ["s1", "s2"],
      description: "d",
    })
    r.reviews.push({
      id: "r1",
      claimId: "c1",
      verdict: "contested",
      reviewerType: "critic-rules",
    })
    expect(sourceConflictRule.check(r, {}).every((x) => x.passed)).toBe(true)
  })

  it("(b) warn quando Evidence opposing sem declaração", () => {
    const r = baseResponse()
    r.sources.push(makeSource("s1", "textbook"), makeSource("s2", "textbook"))
    r.evidences.push(
      {
        id: "e1",
        text: "a favor",
        sourceId: "s1",
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
      {
        id: "e2",
        text: "contra",
        sourceId: "s2",
        supportStrength: "strong",
        quotationExact: false,
        role: "opposing",
      },
    )
    r.claims.push({
      id: "c1",
      text: "x",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1", "e2"],
    })
    const failed = sourceConflictRule.check(r, {}).filter((x) => !x.passed)
    expect(
      failed.some((f) => f.issue?.code === "OPPOSING_EVIDENCE_UNDECLARED"),
    ).toBe(true)
  })

  it("(c) heurística NÃO dispara quando fonte fraca é corroborating (uso legítimo)", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s-oficial", "primary-official"),
      makeSource("s-wiki", "web-unknown"),
    )
    r.evidences.push(
      {
        id: "e-oficial",
        text: "fato",
        sourceId: "s-oficial",
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
      {
        id: "e-wiki",
        text: "conferência auxiliar",
        sourceId: "s-wiki",
        supportStrength: "moderate",
        quotationExact: false,
        role: "corroborating",
      },
    )
    r.claims.push({
      id: "c1",
      text: "x",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e-oficial", "e-wiki"],
    })
    const failed = sourceConflictRule.check(r, {}).filter((x) => !x.passed)
    expect(
      failed.some((f) => f.issue?.code === "POSSIBLE_UNDECLARED_CONFLICT"),
    ).toBe(false)
  })

  it("(c) heurística DISPARA quando 2 primary de autoridades opostas sem tratamento", () => {
    const r = baseResponse()
    r.sources.push(
      makeSource("s-oficial", "primary-official"),
      makeSource("s-blog", "web-unknown"),
    )
    r.evidences.push(
      {
        id: "e1",
        text: "a",
        sourceId: "s-oficial",
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
      {
        id: "e2",
        text: "b",
        sourceId: "s-blog",
        supportStrength: "moderate",
        quotationExact: false,
        role: "primary",
      },
    )
    r.claims.push({
      id: "c1",
      text: "x",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1", "e2"],
    })
    const failed = sourceConflictRule.check(r, {}).filter((x) => !x.passed)
    expect(
      failed.some((f) => f.issue?.code === "POSSIBLE_UNDECLARED_CONFLICT"),
    ).toBe(true)
  })
})

// ============================================================
// factual-validator-hook (Fase 0.1 novo contrato)
// ============================================================
describe("rule: factual-validator-hook", () => {
  it("é NO-OP sem validator", () => {
    const r = baseResponse()
    r.claims.push({
      id: "c1",
      text: "t",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: [],
    })
    expect(factualValidatorHookRule.check(r, {})).toEqual([])
  })

  it("com validator retornando verdicts estruturados, gera Issue detalhada", () => {
    const r = baseResponse()
    r.claims.push({
      id: "c1",
      text: "2+2=5",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: [],
    })
    const results = factualValidatorHookRule.check(r, {
      factualValidator: {
        id: "mock-math",
        validateClaim: ({ claim }) => ({
          ok: false,
          verdicts: [
            {
              claimId: claim.id,
              expression: "2+2",
              reason: "avalia pra 4, não 5",
              location: "claims.0.text",
              suggestedCorrection: "reescrever como '2+2=4'",
            },
          ],
        }),
      },
    })
    const failed = results.filter((x) => !x.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].issue?.code).toBe("FACTUAL_VALIDATION_FAILED")
    expect(failed[0].issue?.location).toBe("claims.0.text")
    expect(failed[0].issue?.message).toContain("2+2")
    expect(failed[0].issue?.message).toContain("avalia pra 4, não 5")
    expect(failed[0].issue?.suggestion?.hint).toContain("2+2=4")
  })

  it("validator sem suggestedCorrection gera Issue SEM suggestion (fatal)", () => {
    const r = baseResponse()
    r.claims.push({
      id: "c1",
      text: "erro",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: [],
    })
    const results = factualValidatorHookRule.check(r, {
      factualValidator: {
        id: "v",
        validateClaim: ({ claim }) => ({
          ok: false,
          verdicts: [
            {
              claimId: claim.id,
              reason: "erro genérico",
              location: "claims.0",
            },
          ],
        }),
      },
    })
    expect(results[0].issue?.suggestion).toBeUndefined()
  })

  it("ignora silenciosamente quando validator devolve null", () => {
    const r = baseResponse()
    r.claims.push({
      id: "c1",
      text: "?",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: [],
    })
    const results = factualValidatorHookRule.check(r, {
      factualValidator: { id: "v", validateClaim: () => null },
    })
    expect(results).toEqual([])
  })
})
