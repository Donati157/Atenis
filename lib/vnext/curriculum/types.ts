// lib/vnext/curriculum/types.ts
//
// Fase 2A: currículo mínimo suportado. Fica ABERTO onde precisa
// (SchoolStage, Subject, Topic) pra evitar hardcoding que quebra na
// primeira expansão. GradeCode é convenção (strings), não enum fechado,
// mas com registry conhecido pra parseamento e validação.

import { z } from "zod"

// SchoolStage é enum ABERTO — Fase 2A só reconhece middle/high, mas
// futuro pode ter elementary/undergraduate/postgraduate. O uso na
// aplicação faz asserção CASE quando precisa; nunca `switch` exaustivo
// que quebra ao adicionar.
export const KNOWN_SCHOOL_STAGES = ["middle", "high"] as const
export type SchoolStage = (typeof KNOWN_SCHOOL_STAGES)[number] | string

export const schoolStageSchema = z
  .string()
  .min(1)
  .max(40)
  .describe(
    "Stage escolar (middle, high, ou expansões futuras). Fase 2A só valida presença; não enforcement do enum.",
  )

// Subject como string livre pra permitir "matematica", "portugues",
// futuras adições como "programacao", "filosofia", etc.
export type Subject = string
export const subjectSchema = z.string().min(1).max(60)

// Topic idem — kebab-case por convenção (ex: "funcao-quadratica",
// "revolucao-industrial").
export type Topic = string
export const topicSchema = z.string().min(1).max(80)

// GradeCode: strings normalizadas. Registry em grades.ts define
// quais existem hoje. GradeCode é tipada como string alias pra
// legibilidade — a validação real vive em parseGradeCode().
export type GradeCode = string
export const gradeCodeSchema = z.string().min(1).max(16)

export interface GradeInfo {
  code: GradeCode
  schoolStage: SchoolStage
  labelPt: string
  order: number // ordem cronológica (6º ano = 1, EM03 = 7)
}
