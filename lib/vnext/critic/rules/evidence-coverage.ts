// lib/vnext/critic/rules/evidence-coverage.ts

import type { CriticRule, RuleResult } from "../types"

const REQUIRES_EVIDENCE = new Set(["fact", "definition", "interpretation"])

export const evidenceCoverageRule: CriticRule = {
  id: "evidence-coverage",
  description:
    "Claims factuais, definições e interpretações precisam de ao menos uma Evidence.",
  check(response) {
    const results: RuleResult[] = []
    response.claims.forEach((claim, ci) => {
      if (!REQUIRES_EVIDENCE.has(claim.type)) {
        results.push({ ruleId: "evidence-coverage", passed: true })
        return
      }
      const ok = claim.evidenceIds.length > 0
      if (ok) {
        results.push({ ruleId: "evidence-coverage", passed: true })
      } else {
        results.push({
          ruleId: "evidence-coverage",
          passed: false,
          issue: {
            code: "MISSING_EVIDENCE",
            category: "epistemic",
            severity: "error",
            message: `Claim "${claim.id}" é do tipo "${claim.type}" e não tem nenhuma Evidence associada.`,
            location: `claims.${ci}.evidenceIds`,
            evidence: { claimId: claim.id, snippet: claim.text.slice(0, 200) },
            ruleId: "evidence-coverage",
            suggestion: {
              operation: "add-evidence",
              targetPath: `claims.${ci}`,
              hint: `Adicione ao menos uma Evidence citando fonte autoritativa que sustente "${claim.text.slice(0, 60)}...". Ou reclassifique como opinion/hypothesis se não pretende afirmar como fato.`,
            },
          },
        })
      }
    })
    return results
  },
}
