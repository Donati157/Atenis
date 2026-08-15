// lib/vnext/learning/updates.ts
//
// Funções PURAS. Cada helper devolve novo state.

import type { MethodPhase } from "../engine/phases"
import type { TeachingStrategy } from "../engine/strategies"
import type {
  AttemptOutcome,
  AttemptRecord,
  LastStudentEventKind,
  LearningTopicState,
  MasteryLevel,
  StrategyEffectiveness,
} from "./types"

export function recordAttempt(
  state: LearningTopicState,
  attempt: AttemptRecord,
): LearningTopicState {
  return {
    ...state,
    attempts: [...state.attempts, attempt],
    lastUpdatedAt: attempt.at,
  }
}

export function updateStrategyEffectiveness(
  state: LearningTopicState,
  strategy: TeachingStrategy,
  outcome: AttemptOutcome,
): LearningTopicState {
  const existing = state.strategyEffectiveness.find(
    (s) => s.strategy === strategy,
  )
  const wasSuccess = outcome === "success" ? 1 : 0
  const next: StrategyEffectiveness = existing
    ? {
        strategy,
        tries: existing.tries + 1,
        successes: existing.successes + wasSuccess,
      }
    : { strategy, tries: 1, successes: wasSuccess }
  const others = state.strategyEffectiveness.filter(
    (s) => s.strategy !== strategy,
  )
  return {
    ...state,
    strategyEffectiveness: [...others, next].sort((a, b) =>
      a.strategy.localeCompare(b.strategy),
    ),
  }
}

const MASTERY_ORDER: MasteryLevel[] = [
  "unknown",
  "emerging",
  "developing",
  "secure",
]

export function updateMastery(
  state: LearningTopicState,
  outcome: AttemptOutcome,
  phase: MethodPhase,
): LearningTopicState {
  const currentIndex = MASTERY_ORDER.indexOf(state.mastery)
  let nextIndex = currentIndex
  if (outcome === "success") {
    if (phase === "verify") {
      nextIndex = Math.min(MASTERY_ORDER.length - 1, currentIndex + 2)
    } else {
      nextIndex = Math.min(MASTERY_ORDER.length - 1, currentIndex + 1)
    }
  } else if (outcome === "partial") {
    // Partial em verify sobe 1; em practice, sobe pra pelo menos emerging.
    if (phase === "verify") {
      nextIndex = Math.min(MASTERY_ORDER.length - 1, currentIndex + 1)
    } else {
      nextIndex = Math.min(MASTERY_ORDER.length - 1, Math.max(currentIndex, 1))
    }
  }
  return { ...state, mastery: MASTERY_ORDER[nextIndex] }
}

export function incrementTicks(
  state: LearningTopicState,
  at: string,
): LearningTopicState {
  return {
    ...state,
    ticks: state.ticks + 1,
    lastUpdatedAt: at,
  }
}

export function incrementGenerativeTurns(
  state: LearningTopicState,
): LearningTopicState {
  return { ...state, generativeTurns: state.generativeTurns + 1 }
}

export function addRefinementAttempts(
  state: LearningTopicState,
  n: number,
): LearningTopicState {
  return { ...state, refinementAttempts: state.refinementAttempts + n }
}

export function incrementAdapt(state: LearningTopicState): LearningTopicState {
  return { ...state, adaptCount: state.adaptCount + 1 }
}

export function setCurrentPhase(
  state: LearningTopicState,
  phase: MethodPhase,
  strategy: TeachingStrategy | null,
  at: string,
): LearningTopicState {
  return {
    ...state,
    currentMethodPhase: phase,
    currentStrategy: strategy,
    lastUpdatedAt: at,
  }
}

export function bumpVerifyStreak(
  state: LearningTopicState,
  pass: boolean,
): LearningTopicState {
  return {
    ...state,
    verifyPassStreak: pass ? state.verifyPassStreak + 1 : 0,
  }
}

export function setLastEventKind(
  state: LearningTopicState,
  kind: LastStudentEventKind,
): LearningTopicState {
  return { ...state, lastStudentEventKind: kind }
}

export function effectivenessRatio(entry: StrategyEffectiveness): number {
  if (entry.tries === 0) return 0
  return entry.successes / entry.tries
}

// -----------------------------------------------------------------------
// Misconceptions (Fase 2A.1 revisada em 2A.2)
// -----------------------------------------------------------------------

import type { MisconceptionStatus } from "./types"

// Registra ocorrência de erro. Não decai resolvedEvidence — o status
// derivado passa a "improving" ou "active" naturalmente quando
// attempts > resolvedEvidence.
export function recordMisconception(
  state: LearningTopicState,
  code: string,
  at: string,
): LearningTopicState {
  const existing = state.misconceptions.find((m) => m.code === code)
  if (existing) {
    const others = state.misconceptions.filter((m) => m.code !== code)
    return {
      ...state,
      misconceptions: [
        ...others,
        {
          ...existing,
          attempts: existing.attempts + 1,
          lastSeen: at,
        },
      ].sort((a, b) => a.code.localeCompare(b.code)),
      lastUpdatedAt: at,
    }
  }
  return {
    ...state,
    misconceptions: [
      ...state.misconceptions,
      {
        code,
        topic: state.topic,
        attempts: 1,
        resolvedEvidence: 0,
        lastSeen: at,
      },
    ].sort((a, b) => a.code.localeCompare(b.code)),
    lastUpdatedAt: at,
  }
}

// Aluno acertou uma questão cujos commonErrors incluíam esses codes.
// Cada chamada com um code JÁ presente incrementa resolvedEvidence em
// 1. O CHAMADOR (Runtime) deve garantir que essa Q não foi contada antes
// (via answeredSuccessfully check).
export function resolveMisconceptionsFromQuestion(
  state: LearningTopicState,
  addressedCodes: string[],
  at: string,
): LearningTopicState {
  if (addressedCodes.length === 0) return state
  const codesSet = new Set(addressedCodes)
  const updated = state.misconceptions.map((m) => {
    if (!codesSet.has(m.code)) return m
    return { ...m, resolvedEvidence: m.resolvedEvidence + 1, lastSeen: at }
  })
  return {
    ...state,
    misconceptions: updated,
    lastUpdatedAt: at,
  }
}

// Deriva status de UMA misconception.
export function misconceptionStatus(
  m: LearningTopicState["misconceptions"][number],
): MisconceptionStatus {
  if (m.resolvedEvidence >= 2 && m.resolvedEvidence >= m.attempts) {
    return "provisionally-resolved"
  }
  if (m.resolvedEvidence >= 1) return "improving"
  return "active"
}

// Codes que NÃO estão provisionally-resolved — quem precisa endereçar.
export function activeMisconceptions(state: LearningTopicState): string[] {
  return state.misconceptions
    .filter((m) => misconceptionStatus(m) !== "provisionally-resolved")
    .map((m) => m.code)
}

export function addAnsweredSuccessfully(
  state: LearningTopicState,
  questionId: string,
): LearningTopicState {
  if (state.answeredSuccessfully.includes(questionId)) return state
  return {
    ...state,
    answeredSuccessfully: [...state.answeredSuccessfully, questionId].sort(),
  }
}

// -----------------------------------------------------------------------
// FASE 2A.2 — pending question + context
// -----------------------------------------------------------------------

export function setPendingQuestion(
  state: LearningTopicState,
  questionId: string | null,
): LearningTopicState {
  return { ...state, pendingQuestionId: questionId }
}

export function setContext(
  state: LearningTopicState,
  context: LearningTopicState["context"],
): LearningTopicState {
  return { ...state, context }
}
