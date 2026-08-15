// lib/vnext/runtime/refiner.ts
//
// Loop de refinamento: pede resposta ao Gateway, roda Critic, e:
//   - accept → retorna imediatamente
//   - refine → adiciona refinementHints como feedback e tenta de novo
//   - reject → interrompe e devolve verdict de reject
//
// Limite de tentativas configurável (default 2). Registra cada tentativa
// no trace pra debug/observabilidade.

import type { AIGateway } from "../gateway/types"
import {
  ProviderInvocationError,
  type ProviderInvocationDiagnostic,
} from "../gateway/errors"
import {
  structuredResponseSchema,
  structuredResponseSchemaForLlm,
} from "../schema/epistemic"
import type { StructuredResponse } from "../schema/epistemic"
import type { CriticReport } from "../schema/critic"
import type { IdGenerator } from "../ids"
import { composeGenerationRequest } from "./prompt-composer"
import type { ComposeRequestInput } from "./prompt-composer"
import { ensureServerMeta } from "./ensure-server-meta"
import { checkPhaseContract } from "./phase-contract"
import type { TraceEntry } from "./types"

export const MAX_REFINE_ATTEMPTS = 2

export interface RefineOutcome {
  status: "accept" | "reject" | "refine-exhausted" | "provider-error"
  reply: StructuredResponse | null
  criticReport: CriticReport | null
  attempts: number
  errorDetail?: string
  // Fase 2B.5-diag: quando status === "provider-error" e o erro veio
  // como ProviderInvocationError com diagnostic populado (opt-in via
  // ATENIS_PROVIDER_DIAGNOSTIC=true), propaga metadata sanitizada.
  diagnostic?: ProviderInvocationDiagnostic
}

export interface RefineDeps {
  gateway: AIGateway
  criticAnalyze: (response: unknown) => CriticReport
  clock: { nowIso: () => string }
  // Fase 2B.6.3: refiner injeta `meta` server-side depois de o LLM
  // devolver a StructuredResponse. Requer IdGenerator pra `meta.turnId`.
  ids: IdGenerator
}

export async function generateWithRefinement(
  base: ComposeRequestInput,
  deps: RefineDeps,
  trace: TraceEntry[],
  maxAttempts: number = MAX_REFINE_ATTEMPTS,
): Promise<RefineOutcome> {
  let attempts = 0
  let lastReport: CriticReport | null = null
  let feedback = base.feedback
  while (attempts < maxAttempts) {
    attempts++
    const request = composeGenerationRequest({
      ...base,
      feedback,
      selectedQuestion: base.selectedQuestion,
    })
    trace.push({
      at: deps.clock.nowIso(),
      step: "refiner.request",
      detail: {
        attempt: attempts,
        useCase: request.useCase,
        hasFeedback: (feedback?.length ?? 0) > 0,
      },
    })

    let raw: unknown
    try {
      const structured = await deps.gateway.structured({
        ...request,
        // Fase 2B.6.3: schema LLM-facing tem `meta` opcional; server
        // injeta abaixo e revalida com o schema completo.
        schema: structuredResponseSchemaForLlm,
      })
      // Injeta metadata autoritativa do server (generatedAt, modelName,
      // turnId, methodPhase). Sobrescreve qualquer meta parcial que o
      // LLM tenha devolvido — o server é a fonte de verdade pra isso.
      const withMeta = ensureServerMeta(structured.data, {
        providerId: structured.providerId,
        modelId: structured.modelId,
        phase: base.phase,
        clock: deps.clock,
        ids: deps.ids,
      })
      // Revalida com o schema COMPLETO antes de entregar ao Critic —
      // garante contrato final intacto. Se ainda houver issues (não em
      // meta), essas continuam sendo capturadas.
      const revalidated = structuredResponseSchema.safeParse(withMeta)
      if (!revalidated.success) {
        // Re-lança como erro estruturado pra o Critic ver como
        // provider-error com diagnostic completo (via ZodError chain).
        throw new ProviderInvocationError(
          "STRUCTURED_VALIDATION_FAILED",
          "Objeto retornado pelo LLM não bate no schema completo mesmo após injeção de meta server-side.",
          {
            errorClass: "ProviderInvocationError",
            errorName: "STRUCTURED_VALIDATION_FAILED",
            causeName: "ZodError",
            causeClass: "ZodError",
          },
        )
      }
      raw = revalidated.data
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      // Extrai diagnostic sanitizado quando disponível (opt-in +
      // ProviderInvocationError). Nunca inclui prompt/response/apiKey.
      const diagnostic =
        err instanceof ProviderInvocationError ? err.diagnostic : undefined
      trace.push({
        at: deps.clock.nowIso(),
        step: "refiner.provider-error",
        detail: { attempt: attempts, error: detail },
      })
      return {
        status: "provider-error",
        reply: null,
        criticReport: null,
        attempts,
        errorDetail: detail,
        diagnostic,
      }
    }

    const report = deps.criticAnalyze(raw)
    lastReport = report
    trace.push({
      at: deps.clock.nowIso(),
      step: "refiner.critic-verdict",
      detail: {
        attempt: attempts,
        action: report.recommendedAction,
        issueCount: report.issues.length,
      },
    })

    if (report.recommendedAction === "accept") {
      // Fase 2B.7: enforcement de contrato de fase (que o Critic não
      // conhece — arrays opcionais no schema global permitem `practice`
      // vazio, mas `diagnose`/`teach` exigem substância mínima).
      // Não é regra Critic nova; é validação de expectativa do Runtime.
      const violation = checkPhaseContract(base.phase, raw as StructuredResponse)
      if (violation) {
        trace.push({
          at: deps.clock.nowIso(),
          step: "refiner.phase-contract-violation",
          detail: { attempt: attempts, issueCode: violation.hint.issueCode },
        })
        // Sobrescreve accept → refine com hint específico. Mesma
        // mecânica de refine do Critic — mantém invariante do loop.
        report.recommendedAction = "refine"
        report.actionReason = `Refine: contrato de fase (${base.phase}) violado — ${violation.reason}.`
        report.refinementHints = [
          violation.hint,
          ...report.refinementHints,
        ]
        lastReport = report
        feedback = report.refinementHints
        continue
      }
      return {
        status: "accept",
        reply: raw as StructuredResponse,
        criticReport: report,
        attempts,
      }
    }
    if (report.recommendedAction === "reject") {
      return {
        status: "reject",
        reply: null,
        criticReport: report,
        attempts,
      }
    }
    // refine: alimenta feedback e tenta de novo
    feedback = report.refinementHints
  }
  return {
    status: "refine-exhausted",
    reply: null,
    criticReport: lastReport,
    attempts,
  }
}
