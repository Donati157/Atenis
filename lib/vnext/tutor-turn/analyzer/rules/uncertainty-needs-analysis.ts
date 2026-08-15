// lib/vnext/tutor-turn/analyzer/rules/uncertainty-needs-analysis.ts
//
// Regra: se o LLM DECLAROU incerteza (uncertaintyMarkers não vazio),
// deve preencher `analysis` explicando por que — senão o consumer não
// tem contexto pra decidir o que fazer com a incerteza.

import type { TurnRule, TurnRuleResult } from "./schema-shape"

export const uncertaintyNeedsAnalysisRule: TurnRule = {
  id: "uncertainty-needs-analysis",
  description:
    "uncertaintyMarkers não vazio exige analysis não vazia.",
  check(output) {
    if (output.uncertaintyMarkers.length === 0) {
      return [{ ruleId: "uncertainty-needs-analysis", passed: true }]
    }
    if (output.analysis && output.analysis.trim().length > 0) {
      return [{ ruleId: "uncertainty-needs-analysis", passed: true }]
    }
    return [
      {
        ruleId: "uncertainty-needs-analysis",
        passed: false,
        issue: {
          code: "uncertainty-without-analysis",
          category: "epistemic",
          severity: "warn",
          message:
            "uncertaintyMarkers presente mas analysis vazia — sem contexto pra decidir como tratar a incerteza.",
          location: "analysis",
          ruleId: "uncertainty-needs-analysis",
          suggestion: {
            operation: "rewrite-analysis",
            targetPath: "analysis",
            hint:
              "Explique brevemente o que foi decidido apesar da incerteza (ex: 'apresentei mesmo assim porque é conteúdo padrão do livro X').",
          },
        },
      },
    ]
  },
}
