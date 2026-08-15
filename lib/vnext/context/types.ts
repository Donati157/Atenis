// lib/vnext/context/types.ts
//
// EducationalContext — Fase 2A.2 (final). Substitui os `guessSubject/
// guessGrade` que ficavam hardcoded no Runtime.
//
// Fase 2A.2 (extensão pra domínios além de school):
//   - `grade` e `schoolStage` são OPCIONAIS: domínios como
//     "japanese-language" ou "ap-microeconomics" podem não usar grade
//     escolar. Selector e outros consumers precisam tratar como nulo.
//   - `framework` opcional: identifica o framework curricular
//     ("bncc", "ap-ced", "jlpt", "cefr", "atenis-internal", ...).
//   - `proficiencyLevel` opcional: pra domínios que medem por nível
//     ("A1"-"C2" CEFR, "N5"-"N1" JLPT, "beginner"|"intermediate", ...).
//
// NÃO inclui `topic`: topic já vem em RuntimeInput.
//
// `subject` continua sendo o campo canônico. Semanticamente ele passa a
// ser "id do domínio acadêmico". Um AcademicDomainRegistry (opcional)
// mapeia esse id pra metadata rica.

import { z } from "zod"
import {
  gradeCodeSchema,
  subjectSchema,
} from "../curriculum/types"

export const educationalContextSchema = z.object({
  subject: subjectSchema,
  grade: gradeCodeSchema.optional(),
  schoolStage: z.string().min(1).max(40).optional(),
  skill: z.string().min(1).max(200).optional(),
  framework: z.string().min(1).max(60).optional(),
  proficiencyLevel: z.string().min(1).max(40).optional(),
})

export type EducationalContext = z.infer<typeof educationalContextSchema>
