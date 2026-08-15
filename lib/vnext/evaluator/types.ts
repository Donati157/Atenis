// lib/vnext/evaluator/types.ts
//
// StudentAnswerEvaluator — abstração pra avaliar a resposta do aluno.
//
// Fase 1.1: interface só. Fase futura terá LLM-backed evaluator usando
// o AI Gateway. A intenção é que Runtime NUNCA dependa de "correct:
// boolean" chegando pronto do consumer — ele delega pra o evaluator, que
// devolve estrutura granular.
//
// Retorno é EvaluationResult com:
//   - outcome: enum qualitativo (não boolean)
//   - correctness: score OPERACIONAL 0..1 (não probabilidade de verdade)
//   - detectedConcepts: o que o aluno demonstrou entender
//   - errors: erros identificados com localização
//   - evidence: trecho da resposta do aluno que suporta o veredicto
//   - reasoning: por que o evaluator chegou nessa conclusão
//   - recommendedNextAction: dica pro Runtime (opcional, não vinculante)

import { z } from "zod"

export const evaluationOutcomeSchema = z.enum([
  "correct", // resposta certa e bem justificada
  "partial", // parcialmente correta; parte importante certa mas com lacuna
  "incorrect", // resposta errada
  "unclear", // não deu pra decidir (resposta ambígua, vazia, ou fora do escopo)
])
export type EvaluationOutcome = z.infer<typeof evaluationOutcomeSchema>

export const detectedConceptSchema = z.object({
  concept: z.string().min(1).max(200),
  strength: z.enum(["strong", "moderate", "weak"]),
})
export type DetectedConcept = z.infer<typeof detectedConceptSchema>

// Fase 2A.1: severity + evidence estruturada + code opcional.
// `code` DEVE bater com `commonErrors.code` da Question quando
// aplicável — permite Runtime rastrear misconceptions específicas.
export const evaluationErrorSeveritySchema = z.enum([
  "minor", // desatenção; não bloqueia domínio
  "major", // erro real; precisa retomar
  "critical", // conceito fundamental ausente
])
export type EvaluationErrorSeverity = z.infer<
  typeof evaluationErrorSeveritySchema
>

export const evaluationErrorEvidenceSchema = z.object({
  studentQuote: z.string().max(1000).optional(),
  expectedQuote: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
})
export type EvaluationErrorEvidence = z.infer<
  typeof evaluationErrorEvidenceSchema
>

export const evaluationErrorSchema = z.object({
  kind: z.enum([
    "conceptual",
    "procedural",
    "algebraic",
    "reading",
    "notation",
    "off-topic",
    "other",
  ]),
  code: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(500),
  misconception: z.string().max(500).optional(),
  severity: evaluationErrorSeveritySchema.default("major"),
  evidence: evaluationErrorEvidenceSchema.optional(),
  location: z.string().max(200).optional(),
})
export type EvaluationError = z.infer<typeof evaluationErrorSchema>

export const evaluationEvidenceSchema = z.object({
  studentQuote: z.string().max(1000).optional(),
  expectedQuote: z.string().max(1000).optional(),
})
export type EvaluationEvidence = z.infer<typeof evaluationEvidenceSchema>

// Fase 1.1: recommendedNextAction é HINT pro Runtime — Runtime pode
// ignorar. Serve pra evaluator sofisticado sinalizar coisas como
// "esse aluno demonstrou entender vector básico mas errou o passo de
// projeção → sugerir reforço em projeção antes de avançar".
export const recommendedNextActionSchema = z.enum([
  "advance", // aluno demonstrou domínio; pode avançar
  "reinforce-same-strategy", // erro pequeno; tentar de novo com mesma abordagem
  "switch-strategy", // erro sistemático; trocar de estratégia
  "revisit-prerequisite", // o problema está no pré-requisito
  "check-conditions", // rever enunciado com o aluno (interpretação)
  "unknown",
])
export type RecommendedNextAction = z.infer<
  typeof recommendedNextActionSchema
>

export const evaluationResultSchema = z.object({
  outcome: evaluationOutcomeSchema,
  // correctness ∈ [0, 1] é MÉTRICA OPERACIONAL — não é "chance de estar
  // certo" nem probabilidade calibrada. É um score derivado de rubricas
  // pra permitir thresholds. O consumidor NÃO deve mostrar isso ao aluno
  // como "você está 87% certo".
  correctness: z.number().min(0).max(1),
  detectedConcepts: z.array(detectedConceptSchema).max(50).default([]),
  errors: z.array(evaluationErrorSchema).max(20).default([]),
  evidence: evaluationEvidenceSchema.optional(),
  reasoning: z.string().min(1).max(2000),
  recommendedNextAction: recommendedNextActionSchema.default("unknown"),
  // Fase 1.1: evaluator marca sua origem pra rastreabilidade.
  evaluatorId: z.string().min(1).max(64),
})
export type EvaluationResult = z.infer<typeof evaluationResultSchema>

// Fase 2A.1: `questionRef` permite o evaluator ter acesso ao catálogo
// de commonErrors da questão. Sem isso, evaluator só olha texto — não
// consegue reportar `error.code` que corresponda ao catálogo.
//
// EXPLICITAMENTE: questionRef NÃO inclui Source. A Source curricular
// (BNCC etc.) NÃO deve chegar ao evaluator como "gabarito de origem".
// Só chega a habilidade (skill), que é referência semântica, não
// evidência de correção matemática.
export interface QuestionExpectedAnswerRef {
  kind: string
  canonicalForm?: string
  // Não incluímos o objeto inteiro pra impedir vazamento de contexto —
  // evaluator vê só forma canônica sumarizada.
}

export interface QuestionCommonErrorRef {
  code: string
  description: string
  misconception?: string
}

export interface QuestionRef {
  id: string
  skill: string
  subject: string
  // Fase 2A.2 (final): grade opcional pra suportar domínios sem grade
  // escolar (AP/language/interdisciplinary).
  grade?: string
  topic: string
  expectedAnswer: QuestionExpectedAnswerRef
  commonErrors: QuestionCommonErrorRef[]
}

export interface EvaluationInput {
  question: string
  studentAnswer: string
  expectedKnowledge?: string
  topicContext?: {
    topic: string
    grade?: string
    subject?: string
  }
  rubric?: {
    id: string
    criteria: string[]
  }
  // Fase 2A.1
  questionRef?: QuestionRef
}

export interface StudentAnswerEvaluator {
  readonly id: string
  evaluate(input: EvaluationInput): Promise<EvaluationResult>
}
