// lib/vnext/critic/rules/analysis-not-repetition.ts
//
// Analysis.text não pode ser paráfrase da Evidence citada.
// Detecção: Jaccard bigrams >= 0.65.

import type { CriticRule, RuleResult } from "../types"

const SIMILARITY_THRESHOLD = 0.65

export const analysisNotRepetitionRule: CriticRule = {
  id: "analysis-not-repetition",
  description: `Analysis não pode ter similaridade Jaccard (bigrams) >= ${SIMILARITY_THRESHOLD} com nenhuma Evidence citada.`,
  check(response) {
    const results: RuleResult[] = []
    const evidencesById = new Map(response.evidences.map((e) => [e.id, e]))
    response.analyses.forEach((analysis, ai) => {
      const evidences = analysis.evidenceIds
        .map((eid) => evidencesById.get(eid))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
      if (evidences.length === 0) {
        results.push({ ruleId: "analysis-not-repetition", passed: true })
        return
      }
      let worst: { evidenceId: string; sim: number } | null = null
      for (const e of evidences) {
        const sim = jaccardBigrams(analysis.text, e.text)
        if (!worst || sim > worst.sim) worst = { evidenceId: e.id, sim }
      }
      if (worst && worst.sim >= SIMILARITY_THRESHOLD) {
        results.push({
          ruleId: "analysis-not-repetition",
          passed: false,
          issue: {
            code: "ANALYSIS_REPEATS_EVIDENCE",
            category: "epistemic",
            severity: "warn",
            message: `Analysis "${analysis.id}" tem similaridade ${worst.sim.toFixed(2)} com Evidence "${worst.evidenceId}" — parece paráfrase, não interpretação.`,
            location: `analyses.${ai}.text`,
            evidence: {
              analysisId: analysis.id,
              evidenceId: worst.evidenceId,
              snippet: analysis.text.slice(0, 200),
            },
            ruleId: "analysis-not-repetition",
            suggestion: {
              operation: "rewrite-analysis",
              targetPath: `analyses.${ai}.text`,
              hint: "Reescreva Analysis pra interpretar (o que a Evidence implica? qual limitação? como se conecta com outras Claims?), não pra repetir com sinônimos.",
            },
          },
        })
      } else {
        results.push({ ruleId: "analysis-not-repetition", passed: true })
      }
    })
    return results
  },
}

// -----------------------------------------------------------------------
// Jaccard sobre bigrams de palavras. Sem dependência externa. Pega
// paráfrase óbvia; não pega repetição semântica com sinônimos.
// -----------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
}

function bigrams(tokens: string[]): Set<string> {
  const s = new Set<string>()
  for (let i = 0; i < tokens.length - 1; i++) {
    s.add(`${tokens[i]}|${tokens[i + 1]}`)
  }
  return s
}

export function jaccardBigrams(a: string, b: string): number {
  const A = bigrams(tokenize(a))
  const B = bigrams(tokenize(b))
  if (A.size === 0 && B.size === 0) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}
