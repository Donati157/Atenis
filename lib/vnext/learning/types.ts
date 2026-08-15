// lib/vnext/learning/types.ts
//
// Learning State mínimo. Fase 1.1:
//   - `schemaVersion`: começa em 1. `deserializeState` do serialize.ts
//     valida e migra.
//   - Contadores separados (era só `cycleCount`):
//       - ticks: cada tick do Runtime.
//       - generativeTurns: só phases que consomem o Gateway.
//       - refinementAttempts: soma de attempts do refiner (por generative
//         turn — se um teach precisou 2 tentativas, +2).
//       - adaptCount: quantas adapts o topic já teve.
//   - `lastStudentEventKind`: pra transitions/pickAdaptStrategy saberem
//     se a última entrada foi confused / answer / etc.
//
// EXPLÍCITO: NÃO existe "learning style" (visual/auditivo/etc.). Só
// evidência de eficácia POR CONTEXTO.

import type { EducationalContext } from "../context/types"
import type { MethodPhase } from "../engine/phases"
import type { TeachingStrategy } from "../engine/strategies"

export const LEARNING_STATE_SCHEMA_VERSION = 3 as const

export const MASTERY_LEVELS = [
  "unknown",
  "emerging",
  "developing",
  "secure",
] as const
export type MasteryLevel = (typeof MASTERY_LEVELS)[number]

export const ATTEMPT_OUTCOMES = ["success", "failure", "partial"] as const
export type AttemptOutcome = (typeof ATTEMPT_OUTCOMES)[number]

// Fase 1.1: rastreia o KIND do último studentEvent pra que pickAdaptStrategy
// possa preferir socratic após confused (sem inflacionar o API do engine).
export type LastStudentEventKind =
  | "start"
  | "answer"
  | "confused"
  | "self-report-ready"
  | null

export interface AttemptRecord {
  strategy: TeachingStrategy
  outcome: AttemptOutcome
  methodPhase: MethodPhase
  // Fase 1.1: origem do sinal (útil pra distinguir "aluno errou" de
  // "aluno confessou não saber").
  eventKind: "answer" | "confused"
  // Fase 2A.1: qual questão foi apresentada, quando o Runtime tinha
  // Question Bank + selector. Null quando a questão veio de LLM
  // livre ou sem contexto.
  questionId: string | null
  at: string
}

// Fase 2A.2: `resolved` → `resolvedEvidence` (contador de evidências
// POSITIVAS independentes de resolução). Status é DERIVADO:
//   provisionally-resolved: resolvedEvidence >= 2 && resolvedEvidence >= attempts
//   improving: resolvedEvidence >= 1
//   active: caso contrário
// Aluno que erra depois de resolver → attempts sobe → status volta a
// "improving" ou "active" (dependendo do delta).
export interface MisconceptionRecord {
  code: string
  topic: string
  attempts: number
  resolvedEvidence: number
  lastSeen: string
}

export type MisconceptionStatus =
  | "active"
  | "improving"
  | "provisionally-resolved"

export interface StrategyEffectiveness {
  strategy: TeachingStrategy
  tries: number
  successes: number
}

export interface LearningTopicState {
  schemaVersion: typeof LEARNING_STATE_SCHEMA_VERSION
  studentId: string
  topic: string
  // Fase 2A.2: contexto educacional. Setado na primeira interação (via
  // RuntimeInput.context) e usado por selector/evaluator/prompt-composer
  // pra evitar hardcode subject/grade no Runtime.
  context: EducationalContext | null
  mastery: MasteryLevel
  attempts: AttemptRecord[]
  strategyEffectiveness: StrategyEffectiveness[]
  misconceptions: MisconceptionRecord[]
  answeredSuccessfully: string[]
  // Fase 2A.2: ID da questão apresentada na última generative que
  // aguardava input. Runtime consulta ao processar answer — impede
  // dependência de o frontend "lembrar" o questionId.
  pendingQuestionId: string | null
  currentMethodPhase: MethodPhase
  currentStrategy: TeachingStrategy | null
  lastStudentEventKind: LastStudentEventKind
  ticks: number
  generativeTurns: number
  refinementAttempts: number
  adaptCount: number
  verifyPassStreak: number
  createdAt: string
  lastUpdatedAt: string
}

export interface NewTopicStateInput {
  studentId: string
  topic: string
  createdAt: string
  context?: EducationalContext | null
}

export function newTopicState(input: NewTopicStateInput): LearningTopicState {
  return {
    schemaVersion: LEARNING_STATE_SCHEMA_VERSION,
    studentId: input.studentId,
    topic: input.topic,
    context: input.context ?? null,
    mastery: "unknown",
    attempts: [],
    strategyEffectiveness: [],
    misconceptions: [],
    answeredSuccessfully: [],
    pendingQuestionId: null,
    currentMethodPhase: "diagnose",
    currentStrategy: null,
    lastStudentEventKind: null,
    ticks: 0,
    generativeTurns: 0,
    refinementAttempts: 0,
    adaptCount: 0,
    verifyPassStreak: 0,
    createdAt: input.createdAt,
    lastUpdatedAt: input.createdAt,
  }
}
