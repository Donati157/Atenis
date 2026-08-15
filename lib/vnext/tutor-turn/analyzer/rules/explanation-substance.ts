// lib/vnext/tutor-turn/analyzer/rules/explanation-substance.ts
//
// Regra mínima de substância: `explanation` MUITO curta indica turno
// sem conteúdo pedagógico (LLM devolveu placeholder). Threshold baixo
// (30 chars) — só pega casos óbvios.

import type { TurnRule, TurnRuleResult } from "./schema-shape"

const MIN_EXPLANATION_CHARS = 30

export const explanationSubstanceRule: TurnRule = {
  id: "explanation-substance",
  description:
    `explanation deve ter pelo menos ${MIN_EXPLANATION_CHARS} caracteres.`,
  check(output) {
    if (output.explanation.trim().length >= MIN_EXPLANATION_CHARS) {
      return [{ ruleId: "explanation-substance", passed: true }]
    }
    const result: TurnRuleResult = {
      ruleId: "explanation-substance",
      passed: false,
      issue: {
        code: "explanation-too-short",
        category: "pedagogical",
        severity: "warn",
        message: `explanation com ${output.explanation.trim().length} chars — provavelmente placeholder.`,
        location: "explanation",
        ruleId: "explanation-substance",
        suggestion: {
          operation: "rewrite-analysis",
          targetPath: "explanation",
          hint: "Ampliar a explicação com conteúdo real (definição, exemplo, ou passo).",
        },
      },
    }
    return [result]
  },
}
