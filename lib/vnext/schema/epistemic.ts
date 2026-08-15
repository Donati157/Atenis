// lib/vnext/schema/epistemic.ts
//
// Schemas Zod da camada epistêmica do Atenis vNext.
//
// Relacionamento explícito por ID (Claim → Evidence → Source; Analysis
// aponta pra Claim + Evidences que interpreta; Review aprova ou contesta
// Claim). O objetivo é impedir que "resposta estruturada" seja só um
// blob de texto disfarçado — a integridade referencial vira testável.
//
// Princípios (§ FASE 0 + FASE 0.1):
//
// - Sem números fingindo probabilidade de verdade. Enums qualitativos
//   (assertionLevel, authorityTier, supportStrength, role) deixam
//   explícito que é julgamento categórico, não estatística.
//
// - Toda relação é por ID. Facilita testes de integridade referencial e
//   permite renderização diferenciada na UI.
//
// - `SourceConflict` de primeira classe: gerador que reconhece conflito
//   DECLARA em vez de resolver silenciosamente.
//
// - Provenance (Fase 0.1): `authorityTier` é uma DECLARAÇÃO do gerador,
//   não verdade verificada. Toda Source carrega `provenance` que rastreia
//   se essa declaração foi ratificada por alguma camada externa
//   (Knowledge Registry, curador humano, verificação por API). LLM nunca
//   pode marcar sua própria Source como `provenance.status="verified"`.
//
// - Evidence.role (Fase 0.1): "primary" / "corroborating" / "opposing".
//   Permite distinguir "duas fontes concordantes" de "duas fontes que
//   realmente divergem" — essencial pra a regra source-conflict não
//   gerar falso positivo em resposta boa que cruza referências.
//
// - Limits (Fase 0.1): todo string / array tem `.max()`. Payload absurdo
//   é rejeitado pelo schema, não degrada o Critic silenciosamente.

import { z } from "zod"

// -----------------------------------------------------------------------
// LIMITS — publicados como constantes pra serem consumíveis em testes
// e mensagens de erro.
// -----------------------------------------------------------------------

export const LIMITS = {
  // strings
  SHORT_TEXT_MAX: 500, // primaryTakeaway, nextStep, source.title
  MEDIUM_TEXT_MAX: 2000, // claim.text, source.title extenso
  LONG_TEXT_MAX: 4000, // evidence.text, analysis.text
  ITEM_TEXT_MAX: 500, // items de inferences/counterarguments/uncertainty
  DOMAIN_MAX: 253, // domínio DNS máximo por RFC
  ID_MAX: 128,
  // arrays
  CLAIMS_MAX: 50,
  EVIDENCES_MAX: 200,
  SOURCES_MAX: 100,
  ANALYSES_MAX: 100,
  REVIEWS_MAX: 200,
  CONFLICTS_MAX: 50,
  INFERENCES_MAX: 20,
  EVIDENCE_IDS_PER_CLAIM_MAX: 30,
  EVIDENCE_IDS_PER_ANALYSIS_MAX: 30,
  SOURCE_IDS_PER_CONFLICT_MAX: 10,
} as const

const id = () => z.string().min(1).max(LIMITS.ID_MAX)
const isoDate = () => z.string().min(1).max(64)

// -----------------------------------------------------------------------
// SOURCE — origem verificável de informação
// -----------------------------------------------------------------------

export const sourceTypeSchema = z.enum([
  "primary", // fonte primária (documento oficial, dado bruto)
  "secondary", // fonte secundária (síntese, análise de terceiro)
  "official", // órgão oficial (MEC, INEP, gov)
  "textbook", // livro didático, ideal se PNLD-aprovado
  "web", // web genérica
  "generated", // gerado pelo LLM (marcado explicitamente pra transparência)
])

// AuthorityTier é enum qualitativo declarado pelo gerador. Serve como
// dica pro Critic. NÃO é verdade — só é confiável se `provenance.status`
// for "verified". Sem verificação, o Critic degrada o efeito.
export const authorityTierSchema = z.enum([
  "primary-official", // BNCC, DCN, INEP, .gov, órgãos oficiais
  "academic", // papers, .edu, journals, teses
  "textbook", // livro didático (PNLD, Cambridge, College Board CED)
  "web-recognized", // Wikipedia, portais educacionais reconhecidos
  "web-unknown", // blog, site sem autoridade estabelecida
  "user-provided", // o próprio aluno enviou
  "generated", // gerado pelo LLM sem base externa
])

// PROVENANCE — a distinção CRÍTICA entre "declarado" e "verificado".
//
// LLM pode preencher `authorityTier` ao produzir a resposta, mas só
// `provenance.status="verified"` significa que ALGUM sistema externo
// confirmou. Sem verificação, autoridade declarada é apenas uma dica —
// tratada pelo Critic como "suspect until proven".
export const provenanceStatusSchema = z.enum([
  "unverified", // declarado pelo gerador, sem checagem externa (default)
  "verified", // ratificado por Knowledge Registry / curador / API
  "disputed", // um verificador externo REPROVOU a declaração
])

export const verificationMethodSchema = z.enum([
  "none", // nenhum método aplicado (bate com status=unverified)
  "manual-curator", // pessoa humana revisou e aprovou
  "external-registry", // bateu com allowlist curada (ex: registry de fontes BNCC)
  "api-checked", // API externa (DOI, arXiv, IBGE, .gov) devolveu 200 e conteúdo esperado
])

export const externalIdentifierKindSchema = z.enum([
  "isbn",
  "doi",
  "arxiv",
  "bncc-code", // ex: "EM13MAT302"
  "gov-id", // identificador oficial (ex: número da lei)
  "url", // URL canônica quando não há identificador melhor
  "other",
])

export const externalIdentifierSchema = z.object({
  kind: externalIdentifierKindSchema,
  value: z.string().min(1).max(500),
})

export const provenanceSchema = z.object({
  status: provenanceStatusSchema.default("unverified"),
  verificationMethod: verificationMethodSchema.default("none"),
  verifiedAt: isoDate().optional(),
  canonicalUrl: z.string().url().max(2048).optional(),
  domain: z.string().min(1).max(LIMITS.DOMAIN_MAX).optional(),
  externalIdentifier: externalIdentifierSchema.optional(),
})

export type Provenance = z.infer<typeof provenanceSchema>

export const sourceSchema = z.object({
  id: id(),
  type: sourceTypeSchema,
  title: z.string().min(1).max(LIMITS.MEDIUM_TEXT_MAX),
  authorityTier: authorityTierSchema,
  url: z.string().url().max(2048).optional(),
  publishedAt: isoDate().optional(),
  retrievedAt: isoDate(),
  gradeSegment: z.enum(["middle", "high", "both"]).optional(),
  subject: z.string().max(100).optional(),
  provenance: provenanceSchema.default({
    status: "unverified",
    verificationMethod: "none",
  }),
})

export type Source = z.infer<typeof sourceSchema>

// -----------------------------------------------------------------------
// EVIDENCE — trecho concreto vindo de uma Source
// -----------------------------------------------------------------------

export const supportStrengthSchema = z.enum([
  "strong",
  "moderate",
  "weak",
])

// EvidenceRole — Fase 0.1.
// primary = trecho central que sustenta o Claim
// corroborating = fonte adicional que CONCORDA (útil pra reforço)
// opposing = fonte que DISCORDA — sinal explícito de conflito
export const evidenceRoleSchema = z.enum([
  "primary",
  "corroborating",
  "opposing",
])

export const evidenceSchema = z.object({
  id: id(),
  text: z.string().min(1).max(LIMITS.LONG_TEXT_MAX),
  sourceId: id(),
  supportStrength: supportStrengthSchema,
  quotationExact: z.boolean(),
  role: evidenceRoleSchema.default("primary"),
})

export type Evidence = z.infer<typeof evidenceSchema>

// -----------------------------------------------------------------------
// CLAIM — afirmação que a resposta faz
// -----------------------------------------------------------------------

export const claimTypeSchema = z.enum([
  "fact",
  "definition",
  "interpretation",
  "opinion",
  "hypothesis",
])

export const assertionLevelSchema = z.enum([
  "asserted",
  "hedged",
  "tentative",
])

export const claimSchema = z.object({
  id: id(),
  text: z.string().min(1).max(LIMITS.MEDIUM_TEXT_MAX),
  type: claimTypeSchema,
  assertionLevel: assertionLevelSchema,
  evidenceIds: z.array(id()).max(LIMITS.EVIDENCE_IDS_PER_CLAIM_MAX),
})

export type Claim = z.infer<typeof claimSchema>

// -----------------------------------------------------------------------
// ANALYSIS
// -----------------------------------------------------------------------

export const analysisSchema = z.object({
  id: id(),
  claimId: id(),
  evidenceIds: z.array(id()).max(LIMITS.EVIDENCE_IDS_PER_ANALYSIS_MAX),
  text: z.string().min(1).max(LIMITS.LONG_TEXT_MAX),
  inferences: z
    .array(z.string().max(LIMITS.ITEM_TEXT_MAX))
    .max(LIMITS.INFERENCES_MAX)
    .default([]),
  counterarguments: z
    .array(z.string().max(LIMITS.ITEM_TEXT_MAX))
    .max(LIMITS.INFERENCES_MAX)
    .default([]),
  uncertainty: z
    .array(z.string().max(LIMITS.ITEM_TEXT_MAX))
    .max(LIMITS.INFERENCES_MAX)
    .default([]),
})

export type Analysis = z.infer<typeof analysisSchema>

// -----------------------------------------------------------------------
// REVIEW
// -----------------------------------------------------------------------

export const reviewVerdictSchema = z.enum([
  "confirmed",
  "contested",
  "insufficient-evidence",
])

export const reviewerTypeSchema = z.enum(["critic-rules", "critic-llm", "human"])

export const reviewSchema = z.object({
  id: id(),
  claimId: id(),
  verdict: reviewVerdictSchema,
  reviewerType: reviewerTypeSchema,
  notes: z.string().max(LIMITS.MEDIUM_TEXT_MAX).optional(),
})

export type Review = z.infer<typeof reviewSchema>

// -----------------------------------------------------------------------
// SOURCE CONFLICT
// -----------------------------------------------------------------------

export const sourceConflictSchema = z.object({
  claimId: id(),
  sourceIds: z
    .array(id())
    .min(2)
    .max(LIMITS.SOURCE_IDS_PER_CONFLICT_MAX),
  description: z.string().min(1).max(LIMITS.MEDIUM_TEXT_MAX),
})

export type SourceConflict = z.infer<typeof sourceConflictSchema>

// -----------------------------------------------------------------------
// STRUCTURED RESPONSE
// -----------------------------------------------------------------------

export const structuredResponseMetaSchema = z.object({
  generatedAt: isoDate(),
  modelName: z.string().min(1).max(200),
  turnId: id(),
  methodPhase: z.string().max(100).optional(),
})

export const structuredResponseSchema = z.object({
  claims: z.array(claimSchema).max(LIMITS.CLAIMS_MAX),
  evidences: z.array(evidenceSchema).max(LIMITS.EVIDENCES_MAX),
  sources: z.array(sourceSchema).max(LIMITS.SOURCES_MAX),
  analyses: z.array(analysisSchema).max(LIMITS.ANALYSES_MAX),
  reviews: z.array(reviewSchema).max(LIMITS.REVIEWS_MAX).default([]),
  detectedConflicts: z
    .array(sourceConflictSchema)
    .max(LIMITS.CONFLICTS_MAX)
    .default([]),
  primaryTakeaway: z.string().min(1).max(LIMITS.SHORT_TEXT_MAX),
  nextStep: z.string().min(1).max(LIMITS.SHORT_TEXT_MAX),
  meta: structuredResponseMetaSchema,
})

export type StructuredResponse = z.infer<typeof structuredResponseSchema>

// -----------------------------------------------------------------------
// LLM-FACING VARIANT — Fase 2B.6.3
// -----------------------------------------------------------------------
//
// Idêntico ao `structuredResponseSchema` COM UMA ÚNICA DIFERENÇA: `meta`
// é **opcional**. Motivo: `meta` (generatedAt, modelName, turnId,
// methodPhase) é metadata de INFRAESTRUTURA — o server naturalmente
// sabe todos os valores; pedir pro LLM gerar é design errado (smokes
// reais 2B.6.1 e 2B.6.2 mostraram que gpt-4o-mini falha consistentemente
// em `meta`, provavelmente porque interpreta o nome como "sistema
// preenche automaticamente").
//
// Fluxo:
//   1. `gateway.structured({..., schema: structuredResponseSchemaForLlm})`
//   2. LLM devolve objeto SEM meta (ou com meta parcial)
//   3. Refiner injeta `meta` via `ensureServerMeta(raw, ctx)`
//   4. Refiner revalida com `structuredResponseSchema` completo antes
//      de passar pro Critic — invariante do contrato final intacta.
//
// O `structuredResponseSchema` original NÃO MUDA — Critic, UI, storage
// continuam vendo o schema completo com meta obrigatório.
//
// Fase 2B.7.1: `sources[*].retrievedAt` também vira opcional na visão
// LLM. Mesmo raciocínio de `meta`: modelo NÃO recupera fontes externas;
// `retrievedAt` reflete o timestamp do turno e é responsabilidade do
// server (Fase 2B.7 estendeu `ensureServerMeta` para injetar). Sem
// relaxar aqui, o SDK aborta ANTES do server ter chance de injetar.
export const sourceSchemaForLlm = sourceSchema.extend({
  retrievedAt: isoDate().optional(),
})

export const structuredResponseSchemaForLlm = structuredResponseSchema.extend({
  meta: structuredResponseMetaSchema.optional(),
  sources: z.array(sourceSchemaForLlm).max(LIMITS.SOURCES_MAX),
})

export type StructuredResponseFromLlm = z.infer<
  typeof structuredResponseSchemaForLlm
>
