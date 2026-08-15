// lib/vnext/domains/types.ts
//
// AcademicDomain — Fase 2A.2 (final). Preparação arquitetural pra suportar
// domínios além do currículo escolar brasileiro:
//
//   - school (padrão atual): matemática, português, etc. Framework BNCC.
//   - ap: AP Microeconomics, AP Statistics, AP Computer Science Principles,
//     etc. Framework `ap-ced`.
//   - language: Japanese, Spanish, etc. Framework `cefr` ou `jlpt`.
//   - interdisciplinary: cross-cutting (ex: Ethics + AI).
//   - professional: fora do escopo educacional formal.
//
// NÃO IMPLEMENTAMOS os 8 domínios AP agora — só o TIPO existe pra que
// futuros catálogos possam ser adicionados sem refactor arquitetural.
//
// Semanticamente, `subject` em Context/Question é o ID desse Domain.
// Não introduzimos um campo `domain` separado — evita confusão de
// nomenclatura e mantém retro-compat total.

import { z } from "zod"

export const domainTypeSchema = z.enum([
  "school",
  "ap",
  "advanced",
  "language",
  "interdisciplinary",
  "professional",
])
export type DomainType = z.infer<typeof domainTypeSchema>

export const academicDomainSchema = z.object({
  // ID = valor usado em EducationalContext.subject e Question.subject.
  // Convenção: kebab-case, prefixado por categoria quando útil.
  //   "matematica" (school)
  //   "portugues" (school)
  //   "ap-microeconomics" (ap)
  //   "japanese-language" (language)
  //   "ap-computer-science-principles" (ap)
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(200),
  domainType: domainTypeSchema,
  // Framework curricular (opcional): "bncc", "ap-ced", "cefr", "jlpt",
  // "atenis-internal", ...
  framework: z.string().min(1).max(60).optional(),
  description: z.string().max(1000).optional(),
  // parentDomain: opcional, pra sub-domínios (ex: "ap-microeconomics"
  // parent = "economics"). Não usado agora — só documentação de forma.
  parentDomain: z.string().min(1).max(128).optional(),
})

export type AcademicDomain = z.infer<typeof academicDomainSchema>

export class AcademicDomainRegistryError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = "AcademicDomainRegistryError"
    this.code = code
  }
}
