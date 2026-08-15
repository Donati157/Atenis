// lib/vnext/critic/rules/factual-support.ts

import type { CriticRule, RuleResult } from "../types"

export const factualSupportRule: CriticRule = {
  id: "factual-support",
  description:
    "Claims factuais precisam de ao menos uma Evidence com supportStrength=strong ou moderate.",
  check(response) {
    const results: RuleResult[] = []
    const evidencesById = new Map(response.evidences.map((e) => [e.id, e]))
    response.claims.forEach((claim, ci) => {
      if (claim.type !== "fact") {
        results.push({ ruleId: "factual-support", passed: true })
        return
      }
      const evidences = claim.evidenceIds
        .map((eid) => evidencesById.get(eid))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
      if (evidences.length === 0) {
        results.push({ ruleId: "factual-support", passed: true })
        return
      }
      const allWeak = evidences.every((e) => e.supportStrength === "weak")
      if (allWeak) {
        results.push({
          ruleId: "factual-support",
          passed: false,
          issue: {
            code: "WEAK_SUPPORT_FOR_FACT",
            category: "epistemic",
            severity: "error",
            message: `Claim factual "${claim.id}" só tem Evidences com supportStrength=weak.`,
            location: `claims.${ci}`,
            evidence: { claimId: claim.id, snippet: claim.text.slice(0, 200) },
            ruleId: "factual-support",
            suggestion: {
              operation: "add-evidence",
              targetPath: `claims.${ci}`,
              hint: "Adicione uma Evidence com trecho literal ou paráfrase direta (supportStrength=strong ou moderate) da fonte, ou reclassifique a Claim como interpretation/hypothesis.",
            },
          },
        })
      } else {
        results.push({ ruleId: "factual-support", passed: true })
      }
    })
    return results
  },
}
