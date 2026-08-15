// lib/vnext/critic/rules/schema-integrity.ts
//
// Verifica integridade referencial DENTRO de uma StructuredResponse.
//
// Todas as issues incluem `location` (JSON path) e — quando aplicável —
// `suggestion` estruturada. Referência quebrada não tem `suggestion`
// porque não sabemos o que o gerador PRETENDIA — é fatal (reject).

import type { CriticRule, RuleResult } from "../types"

export const schemaIntegrityRule: CriticRule = {
  id: "schema-integrity",
  description:
    "Toda referência por ID precisa apontar pra objeto existente na resposta.",
  check(response) {
    const results: RuleResult[] = []
    const claimIds = new Set(response.claims.map((c) => c.id))
    const evidenceIds = new Set(response.evidences.map((e) => e.id))
    const sourceIds = new Set(response.sources.map((s) => s.id))

    response.claims.forEach((claim, ci) => {
      claim.evidenceIds.forEach((eid, ei) => {
        results.push(
          checkRef(
            evidenceIds.has(eid),
            `Claim "${claim.id}" cita evidenceId "${eid}" que não existe.`,
            `claims.${ci}.evidenceIds.${ei}`,
            { claimId: claim.id, evidenceId: eid },
          ),
        )
      })
    })

    response.evidences.forEach((evidence, ei) => {
      results.push(
        checkRef(
          sourceIds.has(evidence.sourceId),
          `Evidence "${evidence.id}" cita sourceId "${evidence.sourceId}" que não existe.`,
          `evidences.${ei}.sourceId`,
          { evidenceId: evidence.id, sourceId: evidence.sourceId },
        ),
      )
    })

    response.analyses.forEach((analysis, ai) => {
      results.push(
        checkRef(
          claimIds.has(analysis.claimId),
          `Analysis "${analysis.id}" cita claimId "${analysis.claimId}" que não existe.`,
          `analyses.${ai}.claimId`,
          { analysisId: analysis.id, claimId: analysis.claimId },
        ),
      )
      analysis.evidenceIds.forEach((eid, ei) => {
        results.push(
          checkRef(
            evidenceIds.has(eid),
            `Analysis "${analysis.id}" cita evidenceId "${eid}" que não existe.`,
            `analyses.${ai}.evidenceIds.${ei}`,
            { analysisId: analysis.id, evidenceId: eid },
          ),
        )
      })
    })

    response.reviews.forEach((review, ri) => {
      results.push(
        checkRef(
          claimIds.has(review.claimId),
          `Review "${review.id}" cita claimId "${review.claimId}" que não existe.`,
          `reviews.${ri}.claimId`,
          { reviewId: review.id, claimId: review.claimId },
        ),
      )
    })

    response.detectedConflicts.forEach((conflict, ci) => {
      results.push(
        checkRef(
          claimIds.has(conflict.claimId),
          `SourceConflict cita claimId "${conflict.claimId}" que não existe.`,
          `detectedConflicts.${ci}.claimId`,
          { claimId: conflict.claimId },
        ),
      )
      conflict.sourceIds.forEach((sid, si) => {
        results.push(
          checkRef(
            sourceIds.has(sid),
            `SourceConflict cita sourceId "${sid}" que não existe.`,
            `detectedConflicts.${ci}.sourceIds.${si}`,
            { sourceId: sid, claimId: conflict.claimId },
          ),
        )
      })
    })

    return results
  },
}

function checkRef(
  ok: boolean,
  message: string,
  location: string,
  ev: {
    claimId?: string
    evidenceId?: string
    sourceId?: string
    analysisId?: string
    reviewId?: string
  },
): RuleResult {
  if (ok) return { ruleId: "schema-integrity", passed: true }
  return {
    ruleId: "schema-integrity",
    passed: false,
    issue: {
      code: "BROKEN_REFERENCE",
      category: "schema",
      severity: "error",
      message,
      location,
      evidence: ev,
      ruleId: "schema-integrity",
      // Sem suggestion — não sabemos o que o gerador pretendia referenciar.
      // Runtime não pode refinar; precisa rejeitar e re-gerar do zero.
    },
  }
}
