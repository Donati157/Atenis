// test/vnext/critic/analyze.test.ts
//
// E2E do Critic contra fixtures adversariais A-H.
// Fase 0.1: assertions atualizadas pra novo shape (sem checksPassedRatio,
// com refinementHints, com recommendedAction podendo ser "refine").

import { describe, it, expect } from "vitest"
import { analyze } from "../../../lib/vnext/critic"
import type { FactualValidator } from "../../../lib/vnext/critic"

import fixtureA from "../fixtures/responses/A-valid.json"
import fixtureB from "../fixtures/responses/B-claim-without-evidence.json"
import fixtureC from "../fixtures/responses/C-evidence-without-valid-source.json"
import fixtureD from "../fixtures/responses/D-fact-without-strong-support.json"
import fixtureE from "../fixtures/responses/E-mathematically-incorrect.json"
import fixtureF from "../fixtures/responses/F-well-written-epistemically-weak.json"
import fixtureG from "../fixtures/responses/G-analysis-repeats-evidence.json"
import fixtureH from "../fixtures/responses/H-unmarked-source-conflict.json"

const rejectAllWithFix: FactualValidator = {
  id: "reject-all-with-fix",
  validateClaim: ({ claim }) => ({
    ok: false,
    verdicts: [
      {
        claimId: claim.id,
        reason: "stub sempre rejeita",
        location: "claims.0.text",
        suggestedCorrection: "reformular",
      },
    ],
  }),
}

describe("Critic.analyze — Fixture A (válida, mas com Sources unverified)", () => {
  it("ainda tem warns de provenance (fontes declaradas mas não verificadas)", () => {
    const report = analyze(fixtureA)
    // A resposta é epistemicamente OK mas nenhuma Source foi verificada
    // externamente → warns esperados de UNVERIFIED_HIGH_AUTHORITY_CLAIM.
    // Sem errors, então recommendedAction=accept.
    expect(report.recommendedAction).toBe("accept")
    expect(report.issues.filter((i) => i.severity === "error")).toEqual([])
    expect(
      report.issues.some((i) => i.code === "UNVERIFIED_HIGH_AUTHORITY_CLAIM"),
    ).toBe(true)
    expect(report.checksExecuted).toBeGreaterThan(0)
  })

  it("refinementHints inclui verify-source pras Sources não verificadas", () => {
    const report = analyze(fixtureA)
    expect(
      report.refinementHints.some((h) => h.operation === "verify-source"),
    ).toBe(true)
  })
})

describe("Critic.analyze — Fixture B (claim sem evidence)", () => {
  it("recommendedAction=refine (error com suggestion add-evidence)", () => {
    const report = analyze(fixtureB)
    expect(report.recommendedAction).toBe("refine")
    expect(report.issues.some((i) => i.code === "MISSING_EVIDENCE")).toBe(true)
    expect(
      report.refinementHints.some((h) => h.operation === "add-evidence"),
    ).toBe(true)
  })
})

describe("Critic.analyze — Fixture C (evidence sem source)", () => {
  it("reject (BROKEN_REFERENCE não tem suggestion)", () => {
    const report = analyze(fixtureC)
    expect(report.recommendedAction).toBe("reject")
    expect(report.issues.some((i) => i.code === "BROKEN_REFERENCE")).toBe(true)
  })
})

describe("Critic.analyze — Fixture D (fact sem suporte forte)", () => {
  it("recommendedAction=refine", () => {
    const report = analyze(fixtureD)
    expect(report.recommendedAction).toBe("refine")
    expect(
      report.issues.some((i) => i.code === "WEAK_SUPPORT_FOR_FACT"),
    ).toBe(true)
  })
})

describe("Critic.analyze — Fixture E (matematicamente incorreto)", () => {
  it("sem validator, passa estruturalmente (sem issues factuais)", () => {
    const report = analyze(fixtureE)
    expect(report.issues.filter((i) => i.category === "factual")).toEqual([])
  })

  it("com validator (que sugere correção) → refine", () => {
    const report = analyze(fixtureE, {
      context: { factualValidator: rejectAllWithFix },
    })
    expect(report.recommendedAction).toBe("refine")
    expect(
      report.issues.some((i) => i.code === "FACTUAL_VALIDATION_FAILED"),
    ).toBe(true)
  })

  it("com validator SEM suggestion → reject", () => {
    const report = analyze(fixtureE, {
      context: {
        factualValidator: {
          id: "v",
          validateClaim: ({ claim }) => ({
            ok: false,
            verdicts: [
              {
                claimId: claim.id,
                reason: "sem sugestão",
                location: "claims.0",
              },
            ],
          }),
        },
      },
    })
    expect(report.recommendedAction).toBe("reject")
  })
})

describe("Critic.analyze — Fixture F (bem escrita, fraca)", () => {
  it("refine (FACT_WITHOUT_AUTHORITATIVE_SOURCE tem suggestion upgrade-source)", () => {
    const report = analyze(fixtureF)
    expect(report.recommendedAction).toBe("refine")
    expect(
      report.issues.some(
        (i) => i.code === "FACT_WITHOUT_AUTHORITATIVE_SOURCE",
      ),
    ).toBe(true)
  })
})

describe("Critic.analyze — Fixture G (analysis repete evidence)", () => {
  it("accept com warn ANALYSIS_REPEATS_EVIDENCE", () => {
    const report = analyze(fixtureG)
    expect(report.recommendedAction).toBe("accept")
    expect(
      report.issues.some((i) => i.code === "ANALYSIS_REPEATS_EVIDENCE"),
    ).toBe(true)
  })
})

describe("Critic.analyze — Fixture H (fontes conflitantes não tratadas)", () => {
  it("levanta warn POSSIBLE_UNDECLARED_CONFLICT", () => {
    const report = analyze(fixtureH)
    expect(
      report.issues.some((i) => i.code === "POSSIBLE_UNDECLARED_CONFLICT"),
    ).toBe(true)
  })
})

describe("Critic.analyze — comportamento geral", () => {
  it("reject com SCHEMA_INVALID quando input não bate", () => {
    const report = analyze({ obviously: "wrong" })
    expect(report.recommendedAction).toBe("reject")
    expect(report.issues[0].code).toBe("SCHEMA_INVALID")
    // SCHEMA_INVALID nunca tem suggestion
    expect(report.issues[0].suggestion).toBeUndefined()
  })

  it("NÃO retorna checksPassedRatio no report (Fase 0.1)", () => {
    const report = analyze(fixtureA)
    expect("checksPassedRatio" in report).toBe(false)
  })

  it("refinementHints é derivado de issues com suggestion", () => {
    const report = analyze(fixtureB)
    expect(report.refinementHints.length).toBeGreaterThan(0)
    for (const h of report.refinementHints) {
      // toda hint precisa apontar pra uma issue existente pelo code
      expect(report.issues.some((i) => i.code === h.issueCode)).toBe(true)
    }
  })

  it("refine é distinto de reject pra decisão do Runtime futuro", () => {
    // B tem suggestion → refine, C não tem → reject
    expect(analyze(fixtureB).recommendedAction).toBe("refine")
    expect(analyze(fixtureC).recommendedAction).toBe("reject")
  })
})
