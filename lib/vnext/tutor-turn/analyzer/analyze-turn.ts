// lib/vnext/tutor-turn/analyzer/analyze-turn.ts
//
// analyzeTurn — Critic específico do Vertical Slice.
//
// Reusa o SHAPE de CriticReport da 0.1 (issues, checksExecuted,
// checksFailed, recommendedAction, refinementHints, ruleIdsRun) pra
// consumers não precisarem de dois tipos distintos.
//
// Comportamento: aplica todas as regras, decide accept/refine/reject
// pela mesma lógica que o Critic existente:
//   - qualquer error com suggestion → refine
//   - qualquer error sem suggestion → reject
//   - só warns/infos → accept
//
// NÃO invoca Gateway. NÃO acessa Provider. Pura análise sobre um objeto
// TutorTurnOutput já validado.

import type {
  CriticReport,
  Issue,
  RecommendedAction,
  RefinementHint,
} from "../../schema/critic"
import { tutorTurnOutputSchema } from "../schema"
import type { TutorTurnOutput } from "../schema"
import { DEFAULT_TURN_RULES } from "./rules"
import type { TurnRule } from "./rules"

export interface AnalyzeTurnOptions {
  rules?: TurnRule[]
  validateSchemaFirst?: boolean
}

export function analyzeTurn(
  raw: unknown,
  options: AnalyzeTurnOptions = {},
): CriticReport {
  const rules = options.rules ?? DEFAULT_TURN_RULES
  const validateSchemaFirst = options.validateSchemaFirst ?? true

  let parsed: TutorTurnOutput
  if (validateSchemaFirst) {
    const result = tutorTurnOutputSchema.safeParse(raw)
    if (!result.success) {
      const issue: Issue = {
        code: "SCHEMA_INVALID",
        category: "schema",
        severity: "error",
        message: `TutorTurnOutput não bate no schema: ${summarize(result.error.issues)}`,
        location: pathFromZodIssue(result.error.issues[0]),
        ruleId: "schema-validation",
      }
      return {
        issues: [issue],
        checksExecuted: 1,
        checksFailed: 1,
        recommendedAction: "reject",
        actionReason:
          "Reject: TutorTurnOutput rejeitado por falhar validação Zod.",
        refinementHints: [],
        ruleIdsRun: ["schema-validation"],
      }
    }
    parsed = result.data
  } else {
    parsed = raw as TutorTurnOutput
  }

  const allResults = rules.flatMap((rule) => rule.check(parsed))
  const issues: Issue[] = []
  let executed = 0
  let failed = 0
  for (const r of allResults) {
    executed++
    if (!r.passed) {
      failed++
      if (r.issue) issues.push(r.issue)
    }
  }
  const refinementHints = deriveHints(issues)
  const { action, reason } = decideAction(issues)
  return {
    issues,
    checksExecuted: executed,
    checksFailed: failed,
    recommendedAction: action,
    actionReason: reason,
    refinementHints,
    ruleIdsRun: rules.map((r) => r.id),
  }
}

function decideAction(issues: Issue[]): {
  action: RecommendedAction
  reason: string
} {
  const errors = issues.filter((i) => i.severity === "error")
  if (errors.length > 0) {
    const withoutSuggestion = errors.filter((e) => !e.suggestion)
    if (withoutSuggestion.length > 0) {
      const codes = uniqueCodes(withoutSuggestion)
      return {
        action: "reject",
        reason: `Reject: ${withoutSuggestion.length} error(s) sem suggestion (${codes}).`,
      }
    }
    const codes = uniqueCodes(errors)
    return {
      action: "refine",
      reason: `Refine: ${errors.length} error(s) com suggestion (${codes}).`,
    }
  }
  const warns = issues.filter((i) => i.severity === "warn")
  if (warns.length > 0) {
    const codes = uniqueCodes(warns)
    return {
      action: "accept",
      reason: `Accept com ${warns.length} warn(s) (${codes}).`,
    }
  }
  return { action: "accept", reason: "Accept limpo." }
}

function deriveHints(issues: Issue[]): RefinementHint[] {
  const hints: RefinementHint[] = []
  for (const issue of issues) {
    if (!issue.suggestion) continue
    hints.push({
      issueCode: issue.code,
      location: issue.location,
      operation: issue.suggestion.operation,
      hint: issue.suggestion.hint,
      priority:
        issue.severity === "error"
          ? "high"
          : issue.severity === "warn"
            ? "medium"
            : "low",
    })
  }
  return hints
}

function uniqueCodes(issues: Issue[]): string {
  return Array.from(new Set(issues.map((i) => i.code))).join(", ")
}

function summarize(zodIssues: unknown): string {
  if (!Array.isArray(zodIssues)) return "unknown format"
  return zodIssues
    .slice(0, 3)
    .map((i: { path?: unknown[]; message?: string }) => {
      const path = Array.isArray(i.path) ? i.path.join(".") : "?"
      return `${path}: ${i.message ?? "?"}`
    })
    .join("; ")
}

function pathFromZodIssue(zodIssue: unknown): string {
  if (
    zodIssue &&
    typeof zodIssue === "object" &&
    "path" in zodIssue &&
    Array.isArray((zodIssue as { path?: unknown[] }).path)
  ) {
    const path = (zodIssue as { path: unknown[] }).path
    return path.length > 0 ? path.join(".") : "(root)"
  }
  return "(root)"
}

export { DEFAULT_TURN_RULES } from "./rules"
export type { TurnRule, TurnRuleResult } from "./rules"
