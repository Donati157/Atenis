// lib/vnext/critic/rules/source-conflict.ts
//
// Regras de conflito entre fontes (Fase 0.1 usa Evidence.role):
//
//  (a) Conflito declarado em `detectedConflicts` sem tratamento:
//      Se detectedConflicts inclui claim X, então X DEVE ter:
//        - Review.verdict="contested", OU
//        - Analysis.counterarguments não vazio, OU
//        - alguma Evidence com role="opposing"
//      Senão a resposta reconheceu o conflito mas resolveu silenciosamente.
//
//  (b) Evidence role="opposing" SEM declaração em detectedConflicts:
//      Se um Claim tem Evidence com role="opposing" mas não há entry
//      em detectedConflicts pra ele, é `warn` — o gerador reconheceu
//      divergência via role mas não declarou como conflito formal.
//
//  (c) HEURÍSTICA pra conflito NÃO declarado (Fase 0):
//      Claim com >=2 Evidences primary (não corroborating/opposing)
//      de Sources com authorityTier em faixas opostas
//      (primary-official + web-unknown, por exemplo) SEM declaração →
//      warn. Fase 0.1 reduz falso positivo ignorando pares onde uma
//      das Evidences é role=corroborating (uso legítimo de conferência).

import type { CriticRule, RuleResult } from "../types"
import type { StructuredResponse } from "../../schema/epistemic"

const HIGH_AUTHORITY = new Set(["primary-official", "academic", "textbook"])
const LOW_AUTHORITY = new Set(["web-unknown", "generated"])

export const sourceConflictRule: CriticRule = {
  id: "source-conflict",
  description:
    "Conflitos declarados exigem tratamento; Evidences opposing exigem declaração; heurística pra conflitos não declarados considera Evidence.role.",
  check(response) {
    const results: RuleResult[] = []
    const evidencesById = new Map(response.evidences.map((e) => [e.id, e]))
    const sourcesById = new Map(response.sources.map((s) => [s.id, s]))
    const claimIndex = new Map(response.claims.map((c, i) => [c.id, i]))
    const declaredConflictClaims = new Set(
      response.detectedConflicts.map((c) => c.claimId),
    )

    // (a) conflitos declarados sem tratamento
    response.detectedConflicts.forEach((conflict, ci) => {
      const treated = hasConflictTreatment(response, conflict.claimId)
      if (treated) {
        results.push({ ruleId: "source-conflict", passed: true })
      } else {
        results.push({
          ruleId: "source-conflict",
          passed: false,
          issue: {
            code: "UNMARKED_CONFLICT",
            category: "epistemic",
            severity: "error",
            message: `Conflito declarado pra Claim "${conflict.claimId}" mas não há tratamento (nem Review contested, nem counterargument, nem Evidence opposing).`,
            location: `detectedConflicts.${ci}`,
            evidence: { claimId: conflict.claimId },
            ruleId: "source-conflict",
            suggestion: {
              operation: "add-counterargument",
              targetPath: `analyses[claimId=${conflict.claimId}].counterarguments`,
              hint: "Adicione counterargument na Analysis que trata dessa Claim, ou adicione Review.verdict=contested, ou marque a Evidence divergente com role=opposing.",
            },
          },
        })
      }
    })

    // (b) Evidences opposing sem detectedConflicts declarados
    for (const claim of response.claims) {
      const evidences = claim.evidenceIds
        .map((eid) => evidencesById.get(eid))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
      const hasOpposing = evidences.some((e) => e.role === "opposing")
      if (!hasOpposing) continue
      if (declaredConflictClaims.has(claim.id)) continue // já tratado em (a)
      const ci = claimIndex.get(claim.id) ?? 0
      results.push({
        ruleId: "source-conflict",
        passed: false,
        issue: {
          code: "OPPOSING_EVIDENCE_UNDECLARED",
          category: "epistemic",
          severity: "warn",
          message: `Claim "${claim.id}" tem Evidence com role="opposing" mas não há entrada em detectedConflicts pra ela.`,
          location: `claims.${ci}`,
          evidence: { claimId: claim.id },
          ruleId: "source-conflict",
          suggestion: {
            operation: "declare-conflict",
            targetPath: "detectedConflicts",
            hint: `Adicione entrada em detectedConflicts pra claim "${claim.id}" descrevendo a divergência entre as Sources envolvidas.`,
          },
        },
      })
    }

    // (c) heurística: mistura de autoridades ALTAS e BAIXAS em Evidences
    // PRIMARY sem declaração. Corroborating não conta (uso legítimo).
    for (const claim of response.claims) {
      if (claim.type !== "fact" && claim.type !== "interpretation") continue
      const primaryEvidences = claim.evidenceIds
        .map((eid) => evidencesById.get(eid))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .filter((e) => e.role === "primary")
      if (primaryEvidences.length < 2) continue
      const tiers = primaryEvidences
        .map((e) => sourcesById.get(e.sourceId)?.authorityTier)
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
      const hasHigh = tiers.some((t) => HIGH_AUTHORITY.has(t))
      const hasLow = tiers.some((t) => LOW_AUTHORITY.has(t))
      if (!(hasHigh && hasLow)) continue
      if (declaredConflictClaims.has(claim.id)) continue
      if (hasConflictTreatment(response, claim.id)) continue
      const ci = claimIndex.get(claim.id) ?? 0
      results.push({
        ruleId: "source-conflict",
        passed: false,
        issue: {
          code: "POSSIBLE_UNDECLARED_CONFLICT",
          category: "epistemic",
          severity: "warn",
          message: `Claim "${claim.id}" mistura Evidences primary de fontes com autoridade alta (${tiers.filter((t) => HIGH_AUTHORITY.has(t)).join(",")}) e baixa (${tiers.filter((t) => LOW_AUTHORITY.has(t)).join(",")}) sem declaração de conflito nem tratamento.`,
          location: `claims.${ci}`,
          evidence: { claimId: claim.id },
          ruleId: "source-conflict",
          suggestion: {
            operation: "declare-conflict",
            targetPath: "detectedConflicts",
            hint: "Se são pontos de vista realmente divergentes, declare em detectedConflicts e trate. Se a fonte fraca só está corroborando, marque suas Evidences como role=corroborating pra deixar explícito.",
          },
        },
      })
    }

    // Se nada foi checado, marca um pass simbólico pra evitar ratio=NaN
    // em consumidores.
    if (
      response.detectedConflicts.length === 0 &&
      results.length === 0
    ) {
      results.push({ ruleId: "source-conflict", passed: true })
    }

    return results
  },
}

function hasConflictTreatment(
  response: StructuredResponse,
  claimId: string,
): boolean {
  const contested = response.reviews.some(
    (r) => r.claimId === claimId && r.verdict === "contested",
  )
  if (contested) return true
  const counterargued = response.analyses.some(
    (a) => a.claimId === claimId && a.counterarguments.length > 0,
  )
  if (counterargued) return true
  // Evidence role="opposing" também conta como tratamento — declara que
  // pelo menos uma das fontes vai na direção contrária.
  const claim = response.claims.find((c) => c.id === claimId)
  if (!claim) return false
  const evidencesById = new Map(response.evidences.map((e) => [e.id, e]))
  return claim.evidenceIds.some(
    (eid) => evidencesById.get(eid)?.role === "opposing",
  )
}
