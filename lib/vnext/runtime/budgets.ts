// lib/vnext/runtime/budgets.ts
//
// Fase 1.1: budgets separados. Runtime consome cada tipo em ponto
// distinto e pode abortar por qualquer um. Isso substitui o cycleCount
// flat que misturava tudo.
//
//   - MAX_TICKS: hard safety cap. Cada tick incrementa. Se subir muito,
//     provavelmente há loop de aguardar-sem-input.
//   - MAX_GENERATIVE_TURNS: só phases GENERATIVE contam. É o custo LLM
//     do topic — quando integrar Provider real, cada turno pode ser cara.
//   - MAX_REFINEMENT_ATTEMPTS_PER_TURN: já era. Local, por chamada de
//     refiner. Não é state.
//   - MAX_ADAPT_ATTEMPTS: quantas adapts o topic aceita.

import type { AbortReason } from "./types"
import type { LearningTopicState } from "../learning/types"

export const MAX_TICKS = 30
export const MAX_GENERATIVE_TURNS = 10
export const MAX_ADAPT_ATTEMPTS_BUDGET = 3
export const MAX_REFINEMENT_ATTEMPTS_PER_TURN = 2

export interface BudgetSnapshot {
  ticks: number
  generativeTurns: number
  refinementAttempts: number
  adaptCount: number
  limits: {
    maxTicks: number
    maxGenerativeTurns: number
    maxAdaptAttempts: number
    maxRefinementAttemptsPerTurn: number
  }
}

export function snapshotBudget(state: LearningTopicState): BudgetSnapshot {
  return {
    ticks: state.ticks,
    generativeTurns: state.generativeTurns,
    refinementAttempts: state.refinementAttempts,
    adaptCount: state.adaptCount,
    limits: {
      maxTicks: MAX_TICKS,
      maxGenerativeTurns: MAX_GENERATIVE_TURNS,
      maxAdaptAttempts: MAX_ADAPT_ATTEMPTS_BUDGET,
      maxRefinementAttemptsPerTurn: MAX_REFINEMENT_ATTEMPTS_PER_TURN,
    },
  }
}

// Devolve AbortReason específica se algum limite estourou, ou null.
// Chamado DEPOIS de incrementar ticks e ANTES de decideNext.
export function checkTickBudget(
  state: LearningTopicState,
): AbortReason | null {
  if (state.ticks > MAX_TICKS) return "tick-limit"
  return null
}

export function checkGenerativeBudget(
  state: LearningTopicState,
): AbortReason | null {
  if (state.generativeTurns >= MAX_GENERATIVE_TURNS) {
    return "generative-limit"
  }
  return null
}
