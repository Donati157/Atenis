// lib/vnext/runtime/generate-response.ts
//
// Fase 2A.2: wrapper isolado do refiner + accounting. Isola o Runtime
// index dos detalhes de "gerar resposta com Critic loop".

import type { StudentEvent } from "../engine/events"
import type { MethodPhase } from "../engine/phases"
import type { TeachingStrategy } from "../engine/strategies"
import type { CriticReport } from "../schema/critic"
import type { StructuredResponse } from "../schema/epistemic"
import type { LearningTopicState } from "../learning/types"
import { addRefinementAttempts } from "../learning/updates"
import type { Question } from "../questions/types"
import { generateWithRefinement } from "./refiner"
import type { AbortReason, RuntimeDeps, TraceEntry } from "./types"
import type { ProviderInvocationDiagnostic } from "../gateway/errors"

export type GeneratePhaseResult =
  | {
      kind: "ok"
      state: LearningTopicState
      reply: StructuredResponse
      criticReport: CriticReport
      attempts: number
    }
  | {
      kind: "abort"
      state: LearningTopicState
      reason: AbortReason
      detail?: string
      reply: StructuredResponse | null
      criticReport: CriticReport | null
      attempts: number
      // Fase 2B.5-diag: propaga metadata sanitizada quando abort veio
      // do provider real (só populado se ATENIS_PROVIDER_DIAGNOSTIC=true).
      diagnostic?: ProviderInvocationDiagnostic
    }

export async function generatePhaseResponse(args: {
  deps: RuntimeDeps
  state: LearningTopicState
  phase: MethodPhase
  strategy: TeachingStrategy | null
  event: StudentEvent | null
  message: string
  selectedQuestion: Question | null
  trace: TraceEntry[]
  now: () => string
}): Promise<GeneratePhaseResult> {
  const { deps, phase, event, message, selectedQuestion, trace, now } = args
  let state = args.state

  const outcome = await generateWithRefinement(
    {
      phase,
      state,
      message,
      event,
      selectedQuestion,
    },
    {
      gateway: deps.gateway,
      criticAnalyze: deps.criticAnalyze,
      clock: deps.clock,
      // Fase 2B.6.3: ids necessário pro server-side meta injection.
      ids: deps.ids,
    },
    trace,
  )

  state = addRefinementAttempts(state, outcome.attempts)

  trace.push({
    at: now(),
    step: "runtime.generate.result",
    detail: { status: outcome.status, attempts: outcome.attempts },
  })

  if (outcome.status === "accept" && outcome.reply && outcome.criticReport) {
    return {
      kind: "ok",
      state,
      reply: outcome.reply,
      criticReport: outcome.criticReport,
      attempts: outcome.attempts,
    }
  }

  const reason: AbortReason =
    outcome.status === "reject"
      ? "critic-reject"
      : outcome.status === "refine-exhausted"
        ? "refine-exhausted"
        : "provider-error"

  return {
    kind: "abort",
    state,
    reason,
    detail: outcome.errorDetail,
    reply: outcome.reply,
    criticReport: outcome.criticReport,
    attempts: outcome.attempts,
    diagnostic: outcome.diagnostic,
  }
}
