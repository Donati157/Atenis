// lib/vnext/engine/transitions.ts
//
// Função pura de transição — Fase 1.1.
//
// Mudanças em relação à Fase 1:
//
//  - `review` removida (ver phases.ts).
//  - `practice + confused` e `verify + confused` vão pra evaluate (não
//    pra practice/verify aguardando). Runtime marca outcome=failure com
//    origem "confused" no attempt e depois evaluate manda pra adapt.
//  - `evaluate + success` → verify direto (sem review intermediário).
//  - `evaluate + partial` → adapt.
//  - `pickAdaptStrategy`: evidence-based, bloqueia strategies com 0% em
//    ≥2 tries, evita reciclar a strategy que acabou de falhar, prefere
//    socratic após confused.

import type { LearningTopicState } from "../learning/types"
import { effectivenessRatio } from "../learning/updates"
import type { StudentEvent } from "./events"
import type { MethodPhase } from "./phases"
import type { TeachingStrategy } from "./strategies"
import { STRATEGY_FALLBACK_ORDER } from "./strategies"

export interface TransitionDecision {
  next: MethodPhase
  nextStrategy: TeachingStrategy | null
  reason: string
}

// Fase 1.1: freios foram separados. cycle-limit clássico continua
// existindo (via ticks) mas se aplica em RuntimeBudgets, não aqui.
// decideNext só olha adapt-limit (semântico do engine).
export const MAX_ADAPT_ATTEMPTS = 3
export const VERIFY_STREAK_TO_READY = 1

export interface PickAdaptOptions {
  preferAfterConfused?: boolean
}

// Escolhe strategy pro próximo teach. Regras:
//   1. Bloqueia strategies com tries >= 2 e successes == 0 ("já provada
//      ineficaz nesse contexto"). Se isso corta tudo, releva o bloqueio.
//   2. Evita repetir currentStrategy (aquela que acabou de falhar), se
//      houver alternativa.
//   3. Prefere strategies AINDA NÃO tentadas, seguindo
//      STRATEGY_FALLBACK_ORDER. Após confused, se socratic está no
//      conjunto de candidatas não-tentadas, escolhe socratic.
//   4. Se todas foram tentadas, ordena por effectiveness ratio DESC;
//      empate → ordem de STRATEGY_FALLBACK_ORDER.
//   5. Se nenhuma teve sucesso, retorna null (engine deve abortar).
export function pickAdaptStrategy(
  state: LearningTopicState,
  options: PickAdaptOptions = {},
): TeachingStrategy | null {
  const eff = state.strategyEffectiveness
  const tried = new Set(eff.map((s) => s.strategy))
  const blocked = new Set(
    eff.filter((e) => e.tries >= 2 && e.successes === 0).map((e) => e.strategy),
  )
  const forbidCurrent = state.currentStrategy

  const allowed = (s: TeachingStrategy) =>
    !blocked.has(s) && s !== forbidCurrent

  let candidates = STRATEGY_FALLBACK_ORDER.filter(allowed)
  if (candidates.length === 0) {
    // Se o bloqueio + forbidCurrent cortou tudo, releva forbidCurrent
    // primeiro (permite reciclar current só se não sobrar mais nada).
    candidates = STRATEGY_FALLBACK_ORDER.filter((s) => !blocked.has(s))
  }
  if (candidates.length === 0) candidates = [...STRATEGY_FALLBACK_ORDER]

  const untried = candidates.filter((s) => !tried.has(s))
  if (untried.length > 0) {
    if (options.preferAfterConfused && untried.includes("socratic")) {
      return "socratic"
    }
    return untried[0]
  }

  // Todas tentadas nesse conjunto — escolhe pela evidência.
  const withRatio = candidates.map((s) => {
    const e = eff.find((x) => x.strategy === s)
    return {
      strategy: s,
      ratio: e ? effectivenessRatio(e) : 0,
    }
  })
  withRatio.sort((a, b) => {
    if (a.ratio !== b.ratio) return b.ratio - a.ratio
    return (
      STRATEGY_FALLBACK_ORDER.indexOf(a.strategy) -
      STRATEGY_FALLBACK_ORDER.indexOf(b.strategy)
    )
  })
  const best = withRatio[0]
  if (!best || best.ratio <= 0) return null
  return best.strategy
}

function lastAnswerOutcome(
  state: LearningTopicState,
): "success" | "failure" | "partial" | null {
  for (let i = state.attempts.length - 1; i >= 0; i--) {
    const a = state.attempts[i]
    if (
      a.methodPhase === "practice" ||
      a.methodPhase === "verify" ||
      a.methodPhase === "diagnose"
    ) {
      return a.outcome
    }
  }
  return null
}

function lastAttemptCameFromDiagnose(state: LearningTopicState): boolean {
  const last = state.attempts[state.attempts.length - 1]
  return last?.methodPhase === "diagnose"
}

export function decideNext(
  state: LearningTopicState,
  event: StudentEvent | null,
): TransitionDecision {
  if (
    state.currentMethodPhase === "ready" ||
    state.currentMethodPhase === "abort"
  ) {
    return {
      next: state.currentMethodPhase,
      nextStrategy: state.currentStrategy,
      reason: "terminal absorvente",
    }
  }

  const phase = state.currentMethodPhase
  switch (phase) {
    case "diagnose": {
      if (event?.kind === "answer") {
        // Fase 2A.1: aluno respondeu à questão de diagnóstico → evaluate.
        // O evaluate registra o attempt como methodPhase=diagnose e
        // devolve teach depois (mastery informada pelo baseline).
        return {
          next: "evaluate",
          nextStrategy: state.currentStrategy,
          reason: "aluno respondeu diagnóstico — avaliar baseline",
        }
      }
      if (event?.kind === "start" || event?.kind === "confused") {
        return {
          next: "teach",
          nextStrategy: pickInitialStrategy(state),
          reason: "diagnóstico respondido — ensinar",
        }
      }
      return {
        next: "diagnose",
        nextStrategy: null,
        reason: "aguardando resposta ao diagnóstico",
      }
    }
    case "teach": {
      return {
        next: "practice",
        nextStrategy: state.currentStrategy,
        reason: "ensino apresentado — aplicar",
      }
    }
    case "practice": {
      if (event?.kind === "answer") {
        return {
          next: "evaluate",
          nextStrategy: state.currentStrategy,
          reason: "aluno respondeu — avaliar",
        }
      }
      if (event?.kind === "confused") {
        // Fase 1.1: confused vai pra evaluate. Runtime registra outcome
        // failure com eventKind=confused; evaluate manda pra adapt.
        return {
          next: "evaluate",
          nextStrategy: state.currentStrategy,
          reason: "aluno confuso — avaliar (registra como falha com origem confused)",
        }
      }
      if (event?.kind === "self-report-ready") {
        return {
          next: "verify",
          nextStrategy: state.currentStrategy,
          reason: "aluno se declarou pronto — verificar",
        }
      }
      return {
        next: "practice",
        nextStrategy: state.currentStrategy,
        reason: "aguardando resposta do aluno",
      }
    }
    case "evaluate": {
      // Fase 2A.1: se o attempt veio de diagnose, próxima phase é
      // sempre teach com strategy inicial, INDEPENDENTE do outcome.
      // O diagnóstico é pra estabelecer baseline, não pra promover.
      if (lastAttemptCameFromDiagnose(state)) {
        return {
          next: "teach",
          nextStrategy: pickInitialStrategy(state),
          reason: "diagnóstico avaliado — iniciar ensino",
        }
      }
      const outcome = lastAnswerOutcome(state)
      if (outcome === "success") {
        const cameFromVerify =
          state.attempts[state.attempts.length - 1]?.methodPhase === "verify"
        if (
          cameFromVerify &&
          state.verifyPassStreak >= VERIFY_STREAK_TO_READY
        ) {
          return {
            next: "ready",
            nextStrategy: state.currentStrategy,
            reason: "verify passou — aluno pronto",
          }
        }
        return {
          next: "verify",
          nextStrategy: state.currentStrategy,
          reason: "sucesso — verificar prontidão",
        }
      }
      // failure ou partial (ou null se algo estranho) → adapt
      return {
        next: "adapt",
        nextStrategy: state.currentStrategy,
        reason: `resposta ${outcome ?? "sem sinal"} — adaptar`,
      }
    }
    case "adapt": {
      if (state.adaptCount >= MAX_ADAPT_ATTEMPTS) {
        return {
          next: "abort",
          nextStrategy: null,
          reason: `Limite de adaptações atingido (${MAX_ADAPT_ATTEMPTS}).`,
        }
      }
      const preferAfterConfused = state.lastStudentEventKind === "confused"
      const strat = pickAdaptStrategy(state, { preferAfterConfused })
      if (!strat) {
        return {
          next: "abort",
          nextStrategy: null,
          reason: "sem estratégia viável — nenhuma teve sucesso.",
        }
      }
      return {
        next: "teach",
        nextStrategy: strat,
        reason: `adaptando para estratégia "${strat}"${preferAfterConfused ? " (após confused)" : ""}`,
      }
    }
    case "verify": {
      if (event?.kind === "answer") {
        return {
          next: "evaluate",
          nextStrategy: state.currentStrategy,
          reason: "resposta na verificação — avaliar",
        }
      }
      if (event?.kind === "confused") {
        return {
          next: "evaluate",
          nextStrategy: state.currentStrategy,
          reason: "confuso na verificação — avaliar (registra failure)",
        }
      }
      return {
        next: "verify",
        nextStrategy: state.currentStrategy,
        reason: "aguardando resposta na verificação",
      }
    }
    // ready / abort tratados no if do topo.
  }
  const _exhaustive: never = phase as never
  throw new Error(`transições: phase inesperada ${String(_exhaustive)}`)
}

function pickInitialStrategy(_state: LearningTopicState): TeachingStrategy {
  return "worked_example"
}
