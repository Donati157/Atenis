// lib/vnext/critic/index.ts
//
// Orquestrador do Critic determinístico.
//
// analyze(response, options?) roda todas as regras, agrega Issues,
// deriva RefinementHints, decide recommendedAction, e devolve o
// CriticReport.
//
// Decisão (Fase 0.1):
//
//   SCHEMA_INVALID                                    → reject
//   qualquer error SEM suggestion                     → reject
//   apenas errors, todos com suggestion               → refine
//   sem errors, com warns ou infos                    → accept
//   sem issues                                        → accept
//
// Justificativa: refine é útil só quando o Critic sabe DIZER o que
// consertar. Issue sem suggestion (ex: BROKEN_REFERENCE, SCHEMA_INVALID,
// INCONSISTENT_VERIFICATION) é fatal — não dá pra pedir refino sensato
// sem saber o que o gerador pretendia.
//
// checksPassedRatio foi REMOVIDO — counts crus (checksExecuted /
// checksFailed) só, pra evitar leitura como "confidence".

import type {
  CriticReport,
  Issue,
  RecommendedAction,
  RefinementHint,
} from "../schema/critic"
import { structuredResponseSchema } from "../schema/epistemic"
import type { StructuredResponse } from "../schema/epistemic"
import { DEFAULT_RULES } from "./rules"
import type { CriticRule, RuleContext } from "./types"

export interface CriticOptions {
  rules?: CriticRule[]
  context?: RuleContext
  validateSchemaFirst?: boolean
}

export function analyze(
  response: StructuredResponse | unknown,
  options: CriticOptions = {},
): CriticReport {
  const rules = options.rules ?? DEFAULT_RULES
  const ctx: RuleContext = options.context ?? {}
  const validateSchemaFirst = options.validateSchemaFirst ?? true

  let parsed: StructuredResponse
  if (validateSchemaFirst) {
    const result = structuredResponseSchema.safeParse(response)
    if (!result.success) {
      const issue: Issue = {
        code: "SCHEMA_INVALID",
        category: "schema",
        severity: "error",
        message: `Resposta não bate no schema StructuredResponse: ${summarizeZodIssues(result.error.issues)}`,
        location: pathFromZodIssue(result.error.issues[0]),
        ruleId: "schema-validation",
        // sem suggestion — se schema falha, não sabemos o que refinar
      }
      return {
        issues: [issue],
        checksExecuted: 1,
        checksFailed: 1,
        recommendedAction: "reject",
        actionReason: "Reject: resposta rejeitada por falhar validação de schema Zod.",
        refinementHints: [],
        ruleIdsRun: ["schema-validation"],
      }
    }
    parsed = result.data
  } else {
    parsed = response as StructuredResponse
  }

  const allResults = rules.flatMap((rule) => rule.check(parsed, ctx))
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
        reason: `Reject: ${withoutSuggestion.length} error(s) sem suggestion (${codes}) — não sabemos como refinar automaticamente.`,
      }
    }
    const codes = uniqueCodes(errors)
    return {
      action: "refine",
      reason: `Refine: ${errors.length} error(s) todos com suggestion (${codes}) — Runtime pode tentar reparo dirigido.`,
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
  return { action: "accept", reason: "Accept limpo. Nenhuma issue." }
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

function summarizeZodIssues(zodIssues: unknown): string {
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

export { DEFAULT_RULES } from "./rules"
export type {
  CriticRule,
  RuleContext,
  RuleResult,
  FactualValidator,
  FactualValidationResult,
  FactualValidatorInput,
  FactualVerdict,
} from "./types"
