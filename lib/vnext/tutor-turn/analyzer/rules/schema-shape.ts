// lib/vnext/tutor-turn/analyzer/rules/schema-shape.ts
//
// Regra determinística: coerência entre `suggestedNextAction` e o resto
// dos campos.
//
//   - "invite-attempt" → followUpQuestion opcional; se presente, kind !=
//     "verification".
//   - "check-understanding" → followUpQuestion RECOMENDADO; se ausente,
//     warn.
//   - "escalate" → analysis DEVE estar preenchida (warn se ausente).
//   - "present-example" / "reinforce-concept" → sem exigências fortes.

import type { Issue } from "../../../schema/critic"
import type { TutorTurnOutput } from "../../schema"

export interface TurnRuleResult {
  ruleId: string
  passed: boolean
  issue?: Issue
}

export interface TurnRule {
  readonly id: string
  readonly description: string
  check(output: TutorTurnOutput): TurnRuleResult[]
}

export const schemaShapeRule: TurnRule = {
  id: "schema-shape",
  description:
    "Coerência entre suggestedNextAction e followUpQuestion/analysis.",
  check(output) {
    const results: TurnRuleResult[] = []
    switch (output.suggestedNextAction) {
      case "check-understanding":
        if (!output.followUpQuestion) {
          results.push(
            warn(
              "check-understanding sem followUpQuestion — como o aluno vai verbalizar?",
              "action-without-question",
              "followUpQuestion",
            ),
          )
        } else if (output.followUpQuestion.kind !== "clarifying") {
          results.push(
            warn(
              `check-understanding com followUpQuestion.kind="${output.followUpQuestion.kind}" — esperado "clarifying".`,
              "action-question-kind-mismatch",
              "followUpQuestion.kind",
            ),
          )
        }
        break
      case "invite-attempt":
        if (
          output.followUpQuestion &&
          output.followUpQuestion.kind === "verification"
        ) {
          results.push(
            warn(
              "invite-attempt com followUpQuestion.kind=verification — verify é phase de Runtime, não ação do LLM.",
              "action-question-kind-mismatch",
              "followUpQuestion.kind",
            ),
          )
        }
        break
      case "escalate":
        if (!output.analysis || output.analysis.trim().length === 0) {
          results.push(
            error(
              "escalate sem analysis — impossível justificar escalonamento.",
              "escalate-without-analysis",
              "analysis",
            ),
          )
        }
        break
      case "present-example":
      case "reinforce-concept":
        // Sem exigências fortes.
        break
    }
    if (results.length === 0) {
      results.push({ ruleId: "schema-shape", passed: true })
    }
    return results
  },
}

function warn(
  message: string,
  code: string,
  location: string,
): TurnRuleResult {
  return {
    ruleId: "schema-shape",
    passed: false,
    issue: {
      code,
      category: "ux",
      severity: "warn",
      message,
      location,
      ruleId: "schema-shape",
      suggestion: {
        operation: "rewrite-analysis",
        targetPath: location,
        hint:
          "Ajustar suggestedNextAction OU preencher o campo esperado pra alinhar o turno.",
      },
    },
  }
}

function error(
  message: string,
  code: string,
  location: string,
): TurnRuleResult {
  return {
    ruleId: "schema-shape",
    passed: false,
    issue: {
      code,
      category: "pedagogical",
      severity: "error",
      message,
      location,
      ruleId: "schema-shape",
      suggestion: {
        operation: "rewrite-analysis",
        targetPath: location,
        hint:
          "Preencha analysis com a justificativa do escalonamento (o que travou, o que já foi tentado).",
      },
    },
  }
}
