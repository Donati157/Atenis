// lib/vnext/runtime/handle-abort.ts
//
// Fase 2A.2: fábricas de RuntimeOutput terminais (ready/abort) e
// utilitário compartilhado pra manter Runtime index enxuto.

import type { MethodPhase } from "../engine/phases"
import type { TeachingStrategy } from "../engine/strategies"
import type { LearningTopicState } from "../learning/types"
import { setCurrentPhase } from "../learning/updates"
import { snapshotBudget } from "./budgets"
import type {
  AbortReason,
  RuntimeInput,
  RuntimeOutput,
  TraceEntry,
} from "./types"
import type { ProviderInvocationDiagnostic } from "../gateway/errors"

export function buildTerminal(args: {
  input: RuntimeInput
  state: LearningTopicState
  phase: MethodPhase
  reason: string
  strategy?: TeachingStrategy | null
  aborted?: RuntimeOutput["aborted"]
  trace: TraceEntry[]
}): RuntimeOutput {
  return {
    studentId: args.input.studentId,
    topic: args.input.topic,
    executedPhase: args.phase,
    nextExpectedPhase: args.phase,
    awaitingStudentInput: false,
    strategy: args.strategy ?? args.state.currentStrategy,
    transitionReason: args.reason,
    reply: null,
    criticReport: null,
    refinementAttempts: 0,
    aborted: args.aborted,
    state: args.state,
    budgets: snapshotBudget(args.state),
    trace: args.trace,
  }
}

export async function abortWithReason(args: {
  input: RuntimeInput
  state: LearningTopicState
  reason: AbortReason
  detail: string
  transitionReason: string
  trace: TraceEntry[]
  at: string
  save: (s: LearningTopicState) => Promise<void>
  issueCodes?: string[]
  // Fase 2B.5-diag: propaga metadata sanitizada (opt-in via
  // ATENIS_PROVIDER_DIAGNOSTIC=true no momento da falha) até o output.
  // Nunca contém prompt/response/apiKey.
  diagnostic?: ProviderInvocationDiagnostic
}): Promise<RuntimeOutput> {
  const state = setCurrentPhase(args.state, "abort", null, args.at)
  await args.save(state)
  return buildTerminal({
    input: args.input,
    state,
    phase: "abort",
    reason: args.transitionReason,
    aborted: {
      reason: args.reason,
      detail: args.detail,
      issueCodes: args.issueCodes,
      diagnostic: args.diagnostic,
    },
    trace: args.trace,
  })
}
