// lib/vnext/questions/selector.ts
//
// QuestionSelector — política de "qual questão pegar" dado um contexto
// pedagógico. Fase 2A.1: agora consumido pelo Runtime.
//
// Regras de seleção (ordenadas por prioridade):
//
//   1. Filtragem HARD (obrigatória):
//      - subject, grade, topic bate;
//      - phase compatível (via usableInPhases);
//      - status === "verified" (não seleciona draft/reviewed/retired);
//      - id NÃO está em excludeIds (aluno já respondeu com sucesso).
//
//   2. Filtragem SOFT (preferência):
//      - Se `preferAddressingCodes.length > 0`, prefere questões cujos
//        commonErrors.code intersectam com esses codes. Se algum
//        candidato bate: só considera esses. Se nenhum bate: cai pro
//        conjunto original.
//
//   3. Ordenação final:
//      - Match count DESC (mais códigos endereçados primeiro).
//      - Difficulty ASC (diagnostic/practice) ou DESC (verify).
//      - Id lexicográfico (empate final).
//
//   4. Retorna primeiro OU null.

import type { MethodPhase } from "../engine/phases"
import type { QuestionBank } from "./bank"
import type { Question, QuestionType } from "./types"

export interface SelectionContext {
  subject: string
  // Fase 2A.2 (final): grade opcional pra domínios sem grade escolar.
  grade?: string
  topic: string
  phase: MethodPhase
  masteryHint?: string
  skill?: string
  excludeIds?: string[]
  preferAddressingCodes?: string[]
}

export interface QuestionSelector {
  select(ctx: SelectionContext): Promise<Question | null>
}

export class DeterministicQuestionSelector implements QuestionSelector {
  constructor(private readonly bank: QuestionBank) {}

  async select(ctx: SelectionContext): Promise<Question | null> {
    const questionType = phaseToPreferredType(ctx.phase)
    const candidates = await this.bank.findBy({
      subject: ctx.subject,
      grade: ctx.grade,
      topic: ctx.topic,
      phase: ctx.phase,
      questionType,
      skill: ctx.skill,
      status: "verified",
    })
    const excludeIds = new Set(ctx.excludeIds ?? [])
    let filtered = candidates.filter((q) => !excludeIds.has(q.id))
    if (filtered.length === 0) return null

    // Preferência SOFT: endereçar misconceptions ativas.
    const preferCodes = new Set(ctx.preferAddressingCodes ?? [])
    if (preferCodes.size > 0) {
      const addressing = filtered.filter((q) =>
        q.commonErrors.some((e) => preferCodes.has(e.code)),
      )
      if (addressing.length > 0) filtered = addressing
    }

    const dir = ctx.phase === "verify" ? "desc" : "asc"
    filtered.sort((a, b) => {
      // 1. Match count (DESC)
      const ma = matchCount(a, preferCodes)
      const mb = matchCount(b, preferCodes)
      if (ma !== mb) return mb - ma
      // 2. Difficulty
      const diff = difficultyRank(a.difficulty) - difficultyRank(b.difficulty)
      const primary = dir === "asc" ? diff : -diff
      if (primary !== 0) return primary
      // 3. Id lex
      return a.id.localeCompare(b.id)
    })
    return filtered[0]
  }
}

function matchCount(q: Question, prefer: Set<string>): number {
  if (prefer.size === 0) return 0
  let n = 0
  for (const e of q.commonErrors) if (prefer.has(e.code)) n++
  return n
}

function phaseToPreferredType(phase: MethodPhase): QuestionType | undefined {
  switch (phase) {
    case "diagnose":
      return "diagnostic"
    case "practice":
    case "teach":
      return "practice"
    case "verify":
      return "verification"
    default:
      return undefined
  }
}

function difficultyRank(d: Question["difficulty"]): number {
  switch (d) {
    case "easy":
      return 1
    case "medium":
      return 2
    case "hard":
      return 3
  }
}
