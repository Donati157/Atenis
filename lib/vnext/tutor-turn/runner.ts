// lib/vnext/tutor-turn/runner.ts
//
// Fase 2B.1: pipeline Vertical Slice.
//
//   compose → gateway.structured(schema=tutorTurnOutputSchema) → analyzeTurn
//   → decision
//
// NÃO chama Provider real. Testes usam MockProvider registrado com
// fixtures do TutorTurnOutput; `activated: false` continua no
// VercelAIGatewayProvider.

import type { AIGateway } from "../gateway/types"
import type { CriticReport } from "../schema/critic"
import { composeTutorTurnRequest } from "./composer"
import type {
  ComposeTutorTurnInput,
  ComposeTutorTurnResult,
} from "./composer"
import { tutorTurnOutputSchema } from "./schema"
import type { TutorTurnOutput } from "./schema"
import { analyzeTurn } from "./analyzer/analyze-turn"
import type { AnalyzeTurnOptions } from "./analyzer/analyze-turn"

export interface TutorTurnRunnerDeps {
  gateway: AIGateway
  analyzeOptions?: AnalyzeTurnOptions
}

export interface TutorTurnUsage {
  promptTokens?: number
  completionTokens?: number
}

export type TutorTurnResult =
  | {
      kind: "accept"
      output: TutorTurnOutput
      report: CriticReport
      composed: ComposeTutorTurnResult
      providerId: string
      modelId: string
      usage?: TutorTurnUsage
    }
  | {
      kind: "refine"
      output: TutorTurnOutput
      report: CriticReport
      composed: ComposeTutorTurnResult
      providerId: string
      modelId: string
      usage?: TutorTurnUsage
    }
  | {
      kind: "reject"
      output: TutorTurnOutput | null
      report: CriticReport
      composed: ComposeTutorTurnResult
      providerId: string | null
      modelId: string | null
      usage?: TutorTurnUsage
    }
  | {
      kind: "provider-error"
      composed: ComposeTutorTurnResult
      errorCode: string
      errorMessage: string
      // Fase 2B.2: sanitizado — só metadata técnica.
      // Só populado quando o provider tiver anexado `.diagnostic`.
      diagnostic?: {
        errorClass?: string
        errorName?: string
        statusCode?: number
        statusText?: string
        errorCodeFromSdk?: string
        urlHost?: string
        urlPath?: string
        isRetryable?: boolean
        causeChain?: string[]
      }
    }

export async function runTutorTurn(
  input: ComposeTutorTurnInput,
  deps: TutorTurnRunnerDeps,
): Promise<TutorTurnResult> {
  const composed = composeTutorTurnRequest(input)

  let providerOutput: {
    data: TutorTurnOutput
    providerId: string
    modelId: string
    usage?: TutorTurnUsage
  }
  try {
    const result = await deps.gateway.structured({
      ...composed.request,
      schema: tutorTurnOutputSchema,
    })
    providerOutput = {
      data: result.data,
      providerId: result.providerId,
      modelId: result.modelId,
      usage: result.usage,
    }
  } catch (err) {
    const errorCode = classifyError(err)
    const errorMessage = err instanceof Error ? err.message : String(err)
    // Extrai diagnostic sanitizado (só populado se Provider anexou).
    const diagnostic =
      err &&
      typeof err === "object" &&
      "diagnostic" in err &&
      typeof (err as { diagnostic: unknown }).diagnostic === "object"
        ? ((err as { diagnostic: Record<string, unknown> }).diagnostic as {
            errorClass?: string
            errorName?: string
            statusCode?: number
            statusText?: string
            errorCodeFromSdk?: string
            urlHost?: string
            urlPath?: string
            isRetryable?: boolean
            causeChain?: string[]
          })
        : undefined
    return {
      kind: "provider-error",
      composed,
      errorCode,
      errorMessage,
      diagnostic,
    }
  }

  const report = analyzeTurn(providerOutput.data, deps.analyzeOptions)

  if (report.recommendedAction === "accept") {
    return {
      kind: "accept",
      output: providerOutput.data,
      report,
      composed,
      providerId: providerOutput.providerId,
      modelId: providerOutput.modelId,
      usage: providerOutput.usage,
    }
  }
  if (report.recommendedAction === "refine") {
    return {
      kind: "refine",
      output: providerOutput.data,
      report,
      composed,
      providerId: providerOutput.providerId,
      modelId: providerOutput.modelId,
      usage: providerOutput.usage,
    }
  }
  return {
    kind: "reject",
    output: providerOutput.data,
    report,
    composed,
    providerId: providerOutput.providerId,
    modelId: providerOutput.modelId,
    usage: providerOutput.usage,
  }
}

function classifyError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code
    if (typeof code === "string" && code.length < 80) return code
  }
  if (err instanceof Error) return err.name
  return "UNKNOWN"
}
