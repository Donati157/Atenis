// lib/vnext/questions/bank.ts
//
// QuestionBank — Fase 2A: InMemory. Retrieval determinístico por
// filtros. Sem embeddings, sem vector search — só filtro por metadata.
//
// Invariantes:
//   - Question é validada por Zod ao registrar.
//   - Se `sourceId` está setado, precisa apontar pra Source existente
//     no SourceRegistry passado (se registry foi passado no register).
//   - ID duplicado é rejeitado.
//   - Consultas retornam DEEP COPIES pra impedir mutação por engano.

import type { MethodPhase } from "../engine/phases"
import type { SourceRegistry } from "../knowledge/registry"
import type { MisconceptionRegistry } from "../misconceptions/registry"
import type {
  Difficulty,
  Question,
  QuestionStatus,
  QuestionType,
} from "./types"
import { QuestionBankError, questionSchema } from "./types"

export interface FindByFilters {
  subject?: string
  grade?: string
  schoolStage?: string
  topic?: string
  skill?: string
  questionType?: QuestionType
  phase?: MethodPhase
  status?: QuestionStatus // default: exclui "retired"
  difficulty?: Difficulty
  ids?: string[]
}

export interface QuestionBank {
  register(question: Question): Promise<Question>
  getById(id: string): Promise<Question | null>
  findBy(filters: FindByFilters): Promise<Question[]>
  count(): Promise<number>
}

export class InMemoryQuestionBank implements QuestionBank {
  private byId = new Map<string, Question>()

  constructor(
    private readonly sourceRegistry?: SourceRegistry,
    private readonly misconceptionRegistry?: MisconceptionRegistry,
  ) {}

  async register(question: Question): Promise<Question> {
    const parsed = questionSchema.safeParse(question)
    if (!parsed.success) {
      throw new QuestionBankError(
        `Question inválida: ${summarize(parsed.error.issues)}`,
        "INVALID_QUESTION_SHAPE",
      )
    }
    const validated = parsed.data

    if (this.byId.has(validated.id)) {
      throw new QuestionBankError(
        `Question "${validated.id}" já registrada.`,
        "DUPLICATE_ID",
      )
    }

    if (validated.sourceId && this.sourceRegistry) {
      const has = await this.sourceRegistry.has(validated.sourceId)
      if (!has) {
        throw new QuestionBankError(
          `Question "${validated.id}" aponta pra sourceId "${validated.sourceId}" não registrada no SourceRegistry.`,
          "SOURCE_NOT_FOUND",
        )
      }
    }

    // Fase 2A.2: valida cada commonError.code contra o registry (se dado).
    if (this.misconceptionRegistry) {
      for (const ce of validated.commonErrors) {
        if (!this.misconceptionRegistry.exists(ce.code)) {
          throw new QuestionBankError(
            `Question "${validated.id}" declara commonError.code "${ce.code}" que não existe no MisconceptionRegistry.`,
            "UNKNOWN_COMMON_ERROR_CODE",
          )
        }
      }
    }

    // Deep copy pra imunidade a mutação externa
    const stored = deepClone(validated)
    this.byId.set(validated.id, stored)
    return deepClone(stored)
  }

  async getById(id: string): Promise<Question | null> {
    const q = this.byId.get(id)
    return q ? deepClone(q) : null
  }

  async findBy(filters: FindByFilters): Promise<Question[]> {
    const statusFilter = filters.status
    return Array.from(this.byId.values())
      .filter((q) => {
        if (statusFilter) {
          if (q.status !== statusFilter) return false
        } else {
          if (q.status === "retired") return false
        }
        if (filters.subject && q.subject !== filters.subject) return false
        if (filters.grade && q.grade !== filters.grade) return false
        if (
          filters.schoolStage &&
          q.schoolStage !== filters.schoolStage
        )
          return false
        if (filters.topic && q.topic !== filters.topic) return false
        if (filters.skill && q.skill !== filters.skill) return false
        if (filters.questionType && q.questionType !== filters.questionType)
          return false
        if (filters.phase) {
          // usableInPhases é subset (diagnose|teach|practice|verify);
          // filters.phase é o enum completo — cast narrow via string.
          const p = filters.phase as (typeof q.usableInPhases)[number]
          if (!q.usableInPhases.includes(p)) return false
        }
        if (filters.difficulty && q.difficulty !== filters.difficulty)
          return false
        if (filters.ids && !filters.ids.includes(q.id)) return false
        return true
      })
      .map(deepClone)
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  async count(): Promise<number> {
    return this.byId.size
  }

  clear(): void {
    this.byId.clear()
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function summarize(zodIssues: unknown): string {
  if (!Array.isArray(zodIssues)) return "unknown format"
  return zodIssues
    .slice(0, 3)
    .map((i: { path?: unknown[]; message?: string }) => {
      const path = Array.isArray(i.path) ? i.path.join(".") : "?"
      return `${path}: ${i.message ?? "?"}`
    })
    .join("; ")
}
