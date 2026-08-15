// lib/vnext/critic/rules/factual-validator-hook.ts
//
// Ponto de plug pra validadores factuais externos (matemática simbólica,
// verificação contra Knowledge, checagem de datas históricas, etc.).
//
// FASE 0.1 usa o novo FactualValidator contract:
//   input:  { claim: Claim, evidences: Evidence[] }
//   output: { ok, verdicts?: FactualVerdict[] } | null
//
// verdicts é uma lista estruturada — cada verdict vira uma Issue própria
// com location, expression analisada, reason e suggestion. Assim um
// validator matemático pode dizer "Claim 2 está errada porque a
// expressão '2+2=5' avalia pra 4, sugestão: reescrever pra '2+2=4'"
// e o Runtime consegue trabalhar em cima disso.

import type { CriticRule, RuleResult } from "../types"

export const factualValidatorHookRule: CriticRule = {
  id: "factual-validator-hook",
  description:
    "Roda validador factual externo (se registrado) sobre Claims de tipo fact. Sem validator, é NO-OP.",
  check(response, ctx) {
    const results: RuleResult[] = []
    const validator = ctx.factualValidator
    if (!validator) return results
    const evidencesById = new Map(response.evidences.map((e) => [e.id, e]))

    response.claims.forEach((claim, ci) => {
      if (claim.type !== "fact") return
      const evidences = claim.evidenceIds
        .map((eid) => evidencesById.get(eid))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
      const result = validator.validateClaim({ claim, evidences })
      if (result === null) return // validator não sabe julgar; silencioso
      if (result.ok) {
        results.push({ ruleId: "factual-validator-hook", passed: true })
        return
      }
      const verdicts =
        result.verdicts && result.verdicts.length > 0
          ? result.verdicts
          : [
              {
                claimId: claim.id,
                reason: "Validator externo reprovou sem detalhe.",
                location: `claims.${ci}`,
              },
            ]
      for (const v of verdicts) {
        results.push({
          ruleId: "factual-validator-hook",
          passed: false,
          issue: {
            code: "FACTUAL_VALIDATION_FAILED",
            category: "factual",
            severity: "error",
            message: [
              `Validator "${validator.id}" reprovou Claim "${v.claimId}"`,
              v.expression ? `expressão: ${v.expression}` : null,
              `motivo: ${v.reason}`,
            ]
              .filter(Boolean)
              .join(" — "),
            location: v.location,
            evidence: v.evidence ?? {
              claimId: claim.id,
              snippet: claim.text.slice(0, 200),
            },
            ruleId: "factual-validator-hook",
            // Só marcamos como refinável se o validator sugeriu correção.
            // Sem sugestão explícita = fatal (reject).
            suggestion: v.suggestedCorrection
              ? {
                  operation: "change-claim-type",
                  targetPath: v.location,
                  hint: v.suggestedCorrection,
                }
              : undefined,
          },
        })
      }
    })
    return results
  },
}
