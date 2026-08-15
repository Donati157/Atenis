// lib/vnext/misconceptions/types.ts
//
// MisconceptionRegistry — Fase 2A.2. Catálogo controlado de erros
// conhecidos. Serve pra:
//
//   1. Validar que Question.commonErrors.code aponta pra misconception
//      real (no register do bank).
//   2. Filtrar EvaluationError.code no Runtime: só codes conhecidos
//      entram no Learning State. Codes inventados pelo evaluator (LLM
//      alucinando ou catálogo defasado) são marcados como
//      UNKNOWN_MISCONCEPTION no trace mas NÃO persistidos.
//
// Isso impede lixo semântico no learning state e força curadoria
// explícita quando um erro novo aparece.

import { z } from "zod"
import {
  gradeCodeSchema,
  subjectSchema,
  topicSchema,
} from "../curriculum/types"

export const misconceptionSeveritySchema = z.enum([
  "minor", // desatenção; não bloqueia domínio
  "major", // conceito enviesado ou erro procedural sistemático
  "critical", // pré-requisito ausente
])
export type MisconceptionSeverity = z.infer<
  typeof misconceptionSeveritySchema
>

export const misconceptionEntrySchema = z.object({
  id: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  subjects: z.array(subjectSchema).max(20).default([]),
  topics: z.array(topicSchema).max(50).default([]),
  grades: z.array(gradeCodeSchema).max(20).default([]),
  severity: misconceptionSeveritySchema.default("major"),
})
export type MisconceptionEntry = z.infer<typeof misconceptionEntrySchema>

export class MisconceptionRegistryError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = "MisconceptionRegistryError"
    this.code = code
  }
}
