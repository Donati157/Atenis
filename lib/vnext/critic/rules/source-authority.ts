// lib/vnext/critic/rules/source-authority.ts
//
// Regras sobre autoridade das Sources que sustentam Claims factuais.
// Trabalha em cima do `authorityTier` DECLARADO — a regra irmã
// `source-provenance` verifica se essa declaração tem verificação.

import type { CriticRule, RuleResult } from "../types"

const WEAK_AUTHORITY = new Set(["web-unknown", "generated"])

export const sourceAuthorityRule: CriticRule = {
  id: "source-authority",
  description:
    "Claims factuais precisam de ao menos uma Source com autoridade estabelecida.",
  check(response) {
    const results: RuleResult[] = []
    const sourcesById = new Map(response.sources.map((s) => [s.id, s]))
    const evidencesById = new Map(response.evidences.map((e) => [e.id, e]))

    response.claims.forEach((claim, ci) => {
      if (claim.type !== "fact") {
        results.push({ ruleId: "source-authority", passed: true })
        return
      }
      const evidences = claim.evidenceIds
        .map((eid) => evidencesById.get(eid))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
      if (evidences.length === 0) {
        // Outra regra (evidence-coverage) cuida disso.
        results.push({ ruleId: "source-authority", passed: true })
        return
      }
      const tiers = evidences
        .map((e) => sourcesById.get(e.sourceId)?.authorityTier)
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
      const allWeak = tiers.length > 0 && tiers.every((t) => WEAK_AUTHORITY.has(t))
      if (allWeak) {
        results.push({
          ruleId: "source-authority",
          passed: false,
          issue: {
            code: "FACT_WITHOUT_AUTHORITATIVE_SOURCE",
            category: "epistemic",
            severity: "error",
            message: `Claim factual "${claim.id}" é sustentado apenas por fontes fracas (${tiers.join(", ")}).`,
            location: `claims.${ci}`,
            evidence: { claimId: claim.id, snippet: claim.text.slice(0, 200) },
            ruleId: "source-authority",
            suggestion: {
              operation: "upgrade-source",
              targetPath: `claims.${ci}`,
              hint: `Adicione ou substitua Evidence pra citar fonte de autoridade estabelecida (primary-official, academic, textbook ou web-recognized) sobre "${claim.text.slice(0, 60)}...".`,
            },
          },
        })
        return
      }
      const anyWeak = tiers.some((t) => WEAK_AUTHORITY.has(t))
      if (anyWeak) {
        results.push({
          ruleId: "source-authority",
          passed: false,
          issue: {
            code: "FACT_HAS_WEAK_SOURCE",
            category: "epistemic",
            severity: "warn",
            message: `Claim factual "${claim.id}" inclui fonte fraca junto com fontes autoritativas.`,
            location: `claims.${ci}`,
            evidence: { claimId: claim.id },
            ruleId: "source-authority",
            suggestion: {
              operation: "upgrade-source",
              targetPath: `claims.${ci}`,
              hint: "Considere remover a evidence de autoridade fraca ou marcá-la como role=corroborating.",
            },
          },
        })
        return
      }
      results.push({ ruleId: "source-authority", passed: true })
    })
    return results
  },
}
