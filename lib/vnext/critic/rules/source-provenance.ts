// lib/vnext/critic/rules/source-provenance.ts
//
// PRINCÍPIO CENTRAL da Fase 0.1:
//   LLM-generated metadata ≠ verified provenance.
//
// Uma Source pode DECLARAR authorityTier="primary-official" ou
// "academic", mas isso é apenas uma dica se `provenance.status` for
// "unverified". Só uma camada externa (Knowledge Registry, curador
// humano, verificação por API — verificationMethod ≠ "none") pode
// marcar `status="verified"`. LLM não pode se autopromover.
//
// Efeitos:
//
//  - Source com authorityTier ∈ {primary-official, academic, textbook}
//    e provenance.status="unverified" → warn (fonte de alta autoridade
//    DECLARADA sem verificação; consumidor deve tratar como suspeita).
//
//  - Source com provenance.status="disputed" (algum sistema externo
//    rejeitou a declaração) → error (não usar).
//
//  - Source com provenance.status="verified" mas sem verifiedAt ou
//    verificationMethod ainda "none" → error (declaração inconsistente
//    do gerador; verificação de verdade sempre tem timestamp e método).

import type { CriticRule, RuleResult } from "../types"

const HIGH_AUTHORITY_TIERS = new Set([
  "primary-official",
  "academic",
  "textbook",
])

export const sourceProvenanceRule: CriticRule = {
  id: "source-provenance",
  description:
    "authorityTier declarado pelo gerador não é verdade sem verificação externa (provenance.status=verified com method ≠ none e verifiedAt).",
  check(response) {
    const results: RuleResult[] = []
    response.sources.forEach((source, si) => {
      const { provenance, authorityTier } = source

      if (provenance.status === "disputed") {
        results.push({
          ruleId: "source-provenance",
          passed: false,
          issue: {
            code: "DISPUTED_SOURCE",
            category: "provenance",
            severity: "error",
            message: `Source "${source.id}" tem provenance.status="disputed" — algum sistema externo rejeitou essa fonte. Não deveria ser usada.`,
            location: `sources.${si}.provenance.status`,
            evidence: { sourceId: source.id },
            ruleId: "source-provenance",
            suggestion: {
              operation: "verify-source",
              targetPath: `sources.${si}`,
              hint: "Remova essa Source e as Evidences que apontam pra ela, ou substitua por fonte com provenance.status ∈ {verified, unverified}.",
            },
          },
        })
        return
      }

      if (provenance.status === "verified") {
        const badMethod = provenance.verificationMethod === "none"
        const missingTimestamp = !provenance.verifiedAt
        if (badMethod || missingTimestamp) {
          results.push({
            ruleId: "source-provenance",
            passed: false,
            issue: {
              code: "INCONSISTENT_VERIFICATION",
              category: "provenance",
              severity: "error",
              message: `Source "${source.id}" declara provenance.status="verified" mas ${badMethod ? "verificationMethod é 'none'" : "verifiedAt está ausente"}. Verificação legítima sempre tem método e timestamp.`,
              location: `sources.${si}.provenance`,
              evidence: { sourceId: source.id },
              ruleId: "source-provenance",
              // Sem suggestion — se um gerador declarou "verified" sem
              // método nem timestamp, provavelmente está mentindo; não
              // dá pra "refinar" auto-verificação. Fatal.
            },
          })
          return
        }
        results.push({ ruleId: "source-provenance", passed: true })
        return
      }

      // status === "unverified" (default)
      if (HIGH_AUTHORITY_TIERS.has(authorityTier)) {
        results.push({
          ruleId: "source-provenance",
          passed: false,
          issue: {
            code: "UNVERIFIED_HIGH_AUTHORITY_CLAIM",
            category: "provenance",
            severity: "warn",
            message: `Source "${source.id}" declara authorityTier="${authorityTier}" mas provenance.status="unverified". Autoridade não confirmada por sistema externo — consumidor deve tratar como suspeita.`,
            location: `sources.${si}.provenance.status`,
            evidence: { sourceId: source.id, snippet: source.title },
            ruleId: "source-provenance",
            suggestion: {
              operation: "verify-source",
              targetPath: `sources.${si}`,
              hint: "Encaminhe pra camada Knowledge/Source Registry pra validação, OU rebaixe authorityTier pra web-recognized se não houver como verificar.",
            },
          },
        })
        return
      }

      // Fonte de baixa autoridade + unverified = consistente. Passa.
      results.push({ ruleId: "source-provenance", passed: true })
    })
    return results
  },
}
