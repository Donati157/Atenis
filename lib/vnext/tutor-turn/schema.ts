// lib/vnext/tutor-turn/schema.ts
//
// Fase 2B.1: schema Zod pra saída do LLM em um turno pedagógico.
//
// PRINCÍPIOS:
//
// - Menor que a `StructuredResponse` epistêmica (claims/evidences/…).
//   Suficiente pra Vertical Slice inicial; cresce conforme necessidade.
//
// - Campos separam: (a) corpo pedagógico (`explanation`), (b) ação
//   sugerida (`suggestedNextAction` — HINT, não decisão), (c) pergunta
//   opcional (`followUpQuestion` — ausente quando questão já veio do
//   Question Bank), (d) análise breve (opcional; útil pra debug/critic),
//   (e) sinais de incerteza explícitos.
//
// - `suggestedNextAction` é DICA — o Runtime decide próxima phase via
//   Method Engine, ignorando o hint se contradizer o estado. O LLM
//   NUNCA controla state.
//
// - `uncertaintyMarkers` obriga o LLM a declarar limites do que sabe.
//   Analyzer verifica se markers vieram acompanhados de `analysis`.

import { z } from "zod"

// Ação pedagógica que o LLM SUGERE. Runtime pode ignorar.
export const suggestedNextActionSchema = z.enum([
  "present-example", // trazer exemplo trabalhado
  "invite-attempt", // pedir tentativa
  "check-understanding", // pedir verbalização/parafraseamento
  "reinforce-concept", // reforçar conceito antes de avançar
  "escalate", // aluno travou; pedir apoio humano
])
export type SuggestedNextAction = z.infer<typeof suggestedNextActionSchema>

export const followUpQuestionKindSchema = z.enum([
  "clarifying", // "você poderia explicar o que entendeu?"
  "practice", // exercício de aplicação
  "verification", // prova de prontidão
])
export type FollowUpQuestionKind = z.infer<typeof followUpQuestionKindSchema>

export const followUpQuestionSchema = z.object({
  text: z.string().min(1).max(1000),
  kind: followUpQuestionKindSchema,
})
export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>

export const uncertaintyMarkerSchema = z.object({
  what: z.string().min(1).max(300),
  reason: z.string().min(1).max(500),
})
export type UncertaintyMarker = z.infer<typeof uncertaintyMarkerSchema>

export const tutorTurnMetaSchema = z.object({
  generatedAt: z.string().min(1).max(64),
  // Provider preenche modelHint quando disponível — só metadata,
  // não influencia lógica.
  modelHint: z.string().max(200).optional(),
})

export const tutorTurnOutputSchema = z.object({
  explanation: z.string().min(1).max(4000),
  suggestedNextAction: suggestedNextActionSchema,
  followUpQuestion: followUpQuestionSchema.optional(),
  analysis: z.string().max(2000).optional(),
  uncertaintyMarkers: z
    .array(uncertaintyMarkerSchema)
    .max(10)
    .default([]),
  meta: tutorTurnMetaSchema,
})

export type TutorTurnOutput = z.infer<typeof tutorTurnOutputSchema>
