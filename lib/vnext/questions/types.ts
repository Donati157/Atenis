// lib/vnext/questions/types.ts
//
// Question Bank — contratos. Cada campo tem função:
//
//  id, version, status:
//    identificação e ciclo de vida (draft/reviewed/verified/retired).
//
//  question:
//    enunciado (permite Markdown/LaTeX).
//
//  subject, grade, schoolStage:
//    filtragem por currículo.
//
//  topic, skill:
//    filtragem semântica. Skill usa BNCC code quando existe
//    ("EM13MAT302"), senão kebab-case PT ("identificar-coeficientes").
//
//  difficulty, cognitiveDepth:
//    seleção pelo Runtime/Selector. Bloom-like enum aproximado.
//
//  questionType:
//    diagnostic | practice | verification.
//    ⚠️ `review` e `challenge` foram propositalmente REMOVIDOS.
//    - `review` foi tirada como MethodPhase na Fase 1.1 por ser
//       decorativa; reintroduzir como QuestionType criaria assimetria.
//    - `challenge` é vago (o que é "desafio"?). Se um dia precisarmos,
//       adicionamos com semântica pedagógica clara.
//
//  usableInPhases:
//    Uma questão pode servir a mais de uma phase. Ex: uma boa
//    verification também pode ser diagnostic. Runtime filtra por
//    inclusão nessa lista.
//
//  prerequisites:
//    lista de skill ids que o aluno já precisa dominar. Sinal pra o
//    Method Engine futuramente decidir se o aluno está pronto.
//
//  expectedAnswer:
//    variantes tipadas — numeric | algebraic | multiple-choice |
//    short-answer | rubric-based. Evita string livre onde estrutura
//    é possível.
//
//  rubricId:
//    quando `expectedAnswer.kind === "rubric-based"`, aponta pra
//    rubrica em lib/{enem,ap,gcd}-rubric.ts.
//
//  commonErrors:
//    catálogo de erros observados nesse conteúdo. Cada erro tem code
//    pra o evaluator futuro reportar contra (linka verdict do
//    evaluator com erro conhecido).
//
//  sourceId (opcional):
//    aponta pra SourceRegistry quando a questão vem de/foi baseada em
//    fonte externa (prova oficial, livro didático). NULL quando é
//    autoral (marcada como tal).

import { z } from "zod"
import {
  gradeCodeSchema,
  subjectSchema,
  topicSchema,
} from "../curriculum/types"

// -----------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------

export const questionTypeSchema = z.enum([
  "diagnostic",
  "practice",
  "verification",
])
export type QuestionType = z.infer<typeof questionTypeSchema>

// Bloom-like. Aproximação — mesma questão pode ser lida em outro nível.
export const cognitiveDepthSchema = z.enum([
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
])
export type CognitiveDepth = z.infer<typeof cognitiveDepthSchema>

export const difficultySchema = z.enum(["easy", "medium", "hard"])
export type Difficulty = z.infer<typeof difficultySchema>

export const questionStatusSchema = z.enum([
  "draft", // em construção
  "reviewed", // revisada por par
  "verified", // aprovada pelo curador — apta a produção
  "retired", // aposentada; não retornada por findBy default
])
export type QuestionStatus = z.infer<typeof questionStatusSchema>

// Mesmo enum que engine/phases (referência solta pra evitar dep circular)
export const usablePhaseSchema = z.enum([
  "diagnose",
  "teach",
  "practice",
  "verify",
])

// -----------------------------------------------------------------------
// EXPECTED ANSWER — variantes tipadas
// -----------------------------------------------------------------------

export const expectedAnswerNumericSchema = z.object({
  kind: z.literal("numeric"),
  value: z.number(),
  tolerance: z.number().min(0).optional(), // ex: 0.01 pra aceitar 3.14
  unit: z.string().max(40).optional(),
})

export const expectedAnswerAlgebraicSchema = z.object({
  kind: z.literal("algebraic"),
  // Forma canônica (ex: "x^2 - 5x + 6", ou {a:1, b:-5, c:6}).
  // Fase 2A não tem validador simbólico — evaluator é quem julgará.
  canonicalForm: z.string().min(1).max(500),
  variables: z.record(z.string(), z.number()).optional(), // ex: {a:1, b:-5, c:6}
  equivalentForms: z.array(z.string()).max(20).optional(),
})

export const expectedAnswerMcqSchema = z.object({
  kind: z.literal("multiple-choice"),
  correctOptionId: z.string().min(1).max(40),
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        text: z.string().min(1).max(1000),
        explanation: z.string().max(1000).optional(),
      }),
    )
    .min(2)
    .max(10),
})

export const expectedAnswerShortSchema = z.object({
  kind: z.literal("short-answer"),
  acceptedAnswers: z.array(z.string().min(1).max(500)).min(1).max(20),
  caseSensitive: z.boolean().default(false),
})

export const expectedAnswerRubricSchema = z.object({
  kind: z.literal("rubric-based"),
  rubricId: z.string().min(1).max(100),
  guidance: z.string().max(2000).optional(),
})

export const expectedAnswerSchema = z.discriminatedUnion("kind", [
  expectedAnswerNumericSchema,
  expectedAnswerAlgebraicSchema,
  expectedAnswerMcqSchema,
  expectedAnswerShortSchema,
  expectedAnswerRubricSchema,
])
export type ExpectedAnswer = z.infer<typeof expectedAnswerSchema>

// -----------------------------------------------------------------------
// COMMON ERROR — catálogo de misconceptions conhecidas
// -----------------------------------------------------------------------

export const commonErrorSchema = z.object({
  code: z.string().min(1).max(64),
  description: z.string().min(1).max(500),
  misconception: z.string().max(500).optional(),
  diagnosticHint: z.string().max(500).optional(),
})
export type CommonError = z.infer<typeof commonErrorSchema>

// -----------------------------------------------------------------------
// QUESTION — schema completo
// -----------------------------------------------------------------------

// Fase 2A.1: epistemicRole documenta o QUE a Source (se apontada)
// sustenta em relação à questão. Corrige uma confusão semântica: uma
// Source curricular (BNCC) define a habilidade, NÃO fornece gabarito.
//
//   - "curricular-reference": Source aponta pra habilidade curricular
//     (BNCC, CED, GCD critério). A resposta correta é AUTORAL do curador
//     da questão; a fonte não valida matematicamente a resposta.
//   - "content-source": Source é material de origem (livro, prova
//     oficial). A resposta pode ser derivada dessa fonte.
//   - "authored-by-atenis": Questão totalmente autoral. sourceId pode
//     apontar pra referência curricular; NÃO é gabarito.
export const questionEpistemicRoleSchema = z.enum([
  "curricular-reference",
  "content-source",
  "authored-by-atenis",
])
export type QuestionEpistemicRole = z.infer<
  typeof questionEpistemicRoleSchema
>

export const questionSchema = z.object({
  id: z.string().min(1).max(128),
  version: z.number().int().min(1),
  status: questionStatusSchema,
  question: z.string().min(1).max(4000),
  subject: subjectSchema,
  // Fase 2A.2 (final): grade e schoolStage viram OPCIONAIS pra suportar
  // domínios sem currículo escolar (AP, línguas, interdisciplinares).
  grade: gradeCodeSchema.optional(),
  schoolStage: z.string().min(1).max(40).optional(),
  topic: topicSchema,
  skill: z.string().min(1).max(200),
  difficulty: difficultySchema,
  cognitiveDepth: cognitiveDepthSchema,
  questionType: questionTypeSchema,
  usableInPhases: z.array(usablePhaseSchema).min(1).max(4),
  prerequisites: z.array(z.string().min(1).max(200)).max(20).default([]),
  expectedAnswer: expectedAnswerSchema,
  commonErrors: z.array(commonErrorSchema).max(20).default([]),
  sourceId: z.string().max(128).nullable(),
  epistemicRole: questionEpistemicRoleSchema.default("authored-by-atenis"),
  sourceRole: z
    .string()
    .max(300)
    .optional()
    .describe(
      "Descrição em texto do QUE a Source sustenta (ex: 'referência de habilidade curricular; NÃO fornece gabarito')",
    ),
  // Fase 2A.2 (final): metadados de framework curricular/proficiência.
  // Opcionais — school questions continuam funcionando sem eles.
  framework: z.string().min(1).max(60).optional(),
  proficiencyLevel: z.string().min(1).max(40).optional(),
  authorNote: z.string().max(1000).optional(),
  createdAt: z.string().max(64),
  lastReviewedAt: z.string().max(64).optional(),
})
export type Question = z.infer<typeof questionSchema>

// -----------------------------------------------------------------------
// ERROR
// -----------------------------------------------------------------------

export class QuestionBankError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = "QuestionBankError"
    this.code = code
  }
}
