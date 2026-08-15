// lib/vnext/schema/critic.ts
//
// Contratos do Critic. O Critic recebe uma StructuredResponse do gerador
// e devolve um CriticReport — quais regras falharam, com que severidade,
// e qual ação recomendar (accept / refine / reject).
//
// Decisões (§ FASE 0 + FASE 0.1):
//
// - `Severity`: error bloqueia, warn passa mas registra, info é telemetria.
//
// - `Issue.location` (Fase 0.1): JSON path (`claims.0.evidenceIds`) que
//   aponta pro pedaço da resposta que falhou. Permite highlight preciso
//   na UI e permite Runtime/Decision saber ONDE consertar.
//
// - `Issue.suggestion` (Fase 0.1): dica ESTRUTURADA de correção. Se
//   presente, indica que a issue é REFINÁVEL — Runtime pode tentar
//   re-gerar com feedback. Se ausente, a issue é fatal (rejeitar).
//
// - `RecommendedAction` (Fase 0.1): agora inclui "refine". Decisão do
//   Critic:
//     • qualquer error SEM suggestion → reject
//     • qualquer error mas todos com suggestion → refine
//     • só warns/infos → accept
//     • SCHEMA_INVALID → reject sempre (não sabemos o que refinar)
//
// - `RefinementHint` (Fase 0.1): agregação por-Issue com prioridade,
//   pronta pra ser consumida pelo futuro Decision component.
//
// - REMOVIDO `checksPassedRatio`. Motivo (§ crítica hostil da Fase 0):
//   qualquer número no CriticReport é lido como "chance de estar certo",
//   mesmo com nome operacional. Mantemos apenas `checksExecuted` e
//   `checksFailed` — counts crus, sem viés interpretativo.

import { z } from "zod"

// -----------------------------------------------------------------------
// SEVERITY, CATEGORY, ACTION
// -----------------------------------------------------------------------

export const severitySchema = z.enum(["error", "warn", "info"])
export type Severity = z.infer<typeof severitySchema>

export const issueCategorySchema = z.enum([
  "schema",
  "epistemic",
  "factual",
  "pedagogical",
  "ux",
  "provenance", // Fase 0.1: autoridade declarada sem verificação
])
export type IssueCategory = z.infer<typeof issueCategorySchema>

export const recommendedActionSchema = z.enum(["accept", "refine", "reject"])
export type RecommendedAction = z.infer<typeof recommendedActionSchema>

// -----------------------------------------------------------------------
// ISSUE — uma violação individual
// -----------------------------------------------------------------------

export const issueEvidenceSchema = z.object({
  claimId: z.string().optional(),
  evidenceId: z.string().optional(),
  analysisId: z.string().optional(),
  sourceId: z.string().optional(),
  reviewId: z.string().optional(),
  snippet: z.string().max(1000).optional(),
})

// SuggestedFix — orientação estruturada pro Runtime saber COMO refinar.
// operation:
//   - add-evidence: precisa adicionar Evidence pra sustentar a Claim
//   - add-source: precisa adicionar Source (autoritativa) pra Evidence
//   - upgrade-source: trocar fonte fraca por fonte melhor
//   - rewrite-analysis: reescrever análise pra não parafrasear
//   - declare-conflict: adicionar entrada em detectedConflicts
//   - add-counterargument: adicionar counterargument em Analysis
//   - change-claim-type: mudar type (ex: fact → interpretation)
//   - add-review: adicionar Review contested
//   - unsatisfiable: não há como refinar automaticamente
export const suggestedFixOperationSchema = z.enum([
  "add-evidence",
  "add-source",
  "upgrade-source",
  "rewrite-analysis",
  "declare-conflict",
  "add-counterargument",
  "change-claim-type",
  "add-review",
  "verify-source",
  "unsatisfiable",
])

export const suggestedFixSchema = z.object({
  operation: suggestedFixOperationSchema,
  targetPath: z.string().max(200), // ex: "claims.0", "sources.2.provenance"
  hint: z.string().min(1).max(500), // texto humano curto explicando o que fazer
})
export type SuggestedFix = z.infer<typeof suggestedFixSchema>

export const issueSchema = z.object({
  code: z.string().min(1).max(64),
  category: issueCategorySchema,
  severity: severitySchema,
  message: z.string().min(1).max(1000),
  // location: JSON path relativo à StructuredResponse. Ex:
  //   "claims.0.evidenceIds"     (array vazio de evidenceIds na claim 0)
  //   "evidences.2.sourceId"     (evidence 2 aponta pra source inexistente)
  //   "analyses.1.text"          (analysis 1 repete evidence)
  location: z.string().min(1).max(200),
  evidence: issueEvidenceSchema.optional(),
  ruleId: z.string().min(1).max(64),
  // suggestion presente = issue é refinável; ausente = fatal
  suggestion: suggestedFixSchema.optional(),
})
export type Issue = z.infer<typeof issueSchema>

// -----------------------------------------------------------------------
// REFINEMENT HINT — agregado no report pra consumo pelo Decision
// -----------------------------------------------------------------------

export const refinementPrioritySchema = z.enum(["high", "medium", "low"])

export const refinementHintSchema = z.object({
  issueCode: z.string(),
  location: z.string(),
  operation: suggestedFixOperationSchema,
  hint: z.string(),
  priority: refinementPrioritySchema,
})
export type RefinementHint = z.infer<typeof refinementHintSchema>

// -----------------------------------------------------------------------
// CRITIC REPORT
// -----------------------------------------------------------------------
// Note: NÃO tem checksPassedRatio. counts crus só.

export const criticReportSchema = z.object({
  issues: z.array(issueSchema).max(500),
  checksExecuted: z.number().int().min(0),
  checksFailed: z.number().int().min(0),
  recommendedAction: recommendedActionSchema,
  actionReason: z.string().max(1000),
  refinementHints: z.array(refinementHintSchema).max(200).default([]),
  ruleIdsRun: z.array(z.string()).max(100),
})
export type CriticReport = z.infer<typeof criticReportSchema>
