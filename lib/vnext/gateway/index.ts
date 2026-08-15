// lib/vnext/gateway/index.ts
//
// Implementação do AIGateway. Registry + roteamento + telemetria opcional.
//
// Roteamento:
//   1. Se input.metadata.providerId estiver setado, usa esse provider
//      diretamente (ou lança ProviderNotRegisteredError).
//   2. Senão, usa o defaultProviderId configurado no construtor (ou o
//      primeiro provider registrado com eligibleForDefault=true).
//
// Não faz load balancing, retry entre providers, ou fallback — isso é
// política de camada superior. O Gateway é fino de propósito.
//
// Preparação Vercel AI Gateway: quando `telemetry` é passado ao factory,
// cada primitiva é wrapped pra medir latency + status + emitir record.
// Sem `telemetry`, o comportamento é IDÊNTICO ao anterior.

import type { ZodTypeAny } from "zod"
import type {
  AIGateway,
  AIProvider,
  CompleteInput,
  CompleteOutput,
  StreamInput,
  StreamOutput,
  StructuredInput,
  StructuredOutput,
} from "./types"
import {
  NoDefaultProviderError,
  ProviderNotRegisteredError,
} from "./errors"
import type {
  OperationRecord,
  ProviderOperation,
  ProviderTelemetry,
} from "./telemetry"

interface CreateGatewayOptions {
  defaultProviderId?: string
  // Preparação Vercel: callback opcional. Nunca recebe prompt/response.
  telemetry?: ProviderTelemetry
  // Clock injetável pra latency determinística em teste. Se omitido,
  // usa Date.now() (paths de produção). Em testes de determinismo com
  // Clock, injetar aqui pra métricas determinísticas.
  clockMs?: () => number
}

class GatewayImpl implements AIGateway {
  private providers = new Map<string, AIProvider>()
  private defaultProviderId?: string
  private telemetry?: ProviderTelemetry
  private clockMs: () => number

  constructor(options: CreateGatewayOptions = {}) {
    this.defaultProviderId = options.defaultProviderId
    this.telemetry = options.telemetry
    this.clockMs = options.clockMs ?? (() => Date.now())
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider)
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId)
    if (this.defaultProviderId === providerId) {
      this.defaultProviderId = undefined
    }
  }

  listProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  private resolveProvider(input: CompleteInput): AIProvider {
    const explicitId =
      typeof input.metadata?.providerId === "string"
        ? input.metadata.providerId
        : undefined
    if (explicitId) {
      const p = this.providers.get(explicitId)
      if (!p) throw new ProviderNotRegisteredError(explicitId)
      return p
    }
    if (this.defaultProviderId) {
      const p = this.providers.get(this.defaultProviderId)
      if (!p) throw new ProviderNotRegisteredError(this.defaultProviderId)
      return p
    }
    for (const p of this.providers.values()) {
      if (p.capabilities.eligibleForDefault) return p
    }
    throw new NoDefaultProviderError()
  }

  async complete(input: CompleteInput): Promise<CompleteOutput> {
    return this.instrumented("complete", input, async () => {
      const provider = this.resolveProvider(input)
      return { output: await provider.complete(input), provider }
    })
  }

  async stream(input: StreamInput): Promise<StreamOutput> {
    return this.instrumented("stream", input, async () => {
      const provider = this.resolveProvider(input)
      return { output: await provider.stream(input), provider }
    })
  }

  async structured<T extends ZodTypeAny>(
    input: StructuredInput<T>,
  ): Promise<StructuredOutput<T>> {
    return this.instrumented("structured", input, async () => {
      const provider = this.resolveProvider(input)
      return { output: await provider.structured(input), provider }
    })
  }

  private async instrumented<Out extends { providerId: string; modelId: string }>(
    operation: ProviderOperation,
    input: CompleteInput,
    fn: () => Promise<{ output: Out; provider: AIProvider }>,
  ): Promise<Out> {
    if (!this.telemetry) {
      // Fast path idêntico ao comportamento antigo — sem timing, sem
      // objetos alocados. Preserva determinismo bit-a-bit dos testes.
      const { output } = await fn()
      return output
    }
    const start = this.clockMs()
    try {
      const { output, provider } = await fn()
      const record: OperationRecord = {
        providerId: output.providerId ?? provider.id,
        modelId: output.modelId ?? provider.modelId,
        operation,
        useCase: input.useCase,
        latencyMs: this.clockMs() - start,
        status: "success",
        attemptCount: 1,
        usage: this.extractUsage(output),
      }
      safeEmit(this.telemetry, record)
      return output
    } catch (err) {
      const record: OperationRecord = {
        providerId:
          (typeof input.metadata?.providerId === "string"
            ? input.metadata.providerId
            : undefined) ??
          this.defaultProviderId ??
          "(unknown)",
        modelId: "(unknown)",
        operation,
        useCase: input.useCase,
        latencyMs: this.clockMs() - start,
        status: "failure",
        attemptCount: 1,
        errorCode: this.classifyError(err),
      }
      safeEmit(this.telemetry, record)
      throw err
    }
  }

  private extractUsage(output: unknown): OperationRecord["usage"] {
    if (!output || typeof output !== "object") return undefined
    const u = (output as { usage?: unknown }).usage
    if (!u || typeof u !== "object") return undefined
    return u as OperationRecord["usage"]
  }

  private classifyError(err: unknown): string {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code?: unknown }).code
      if (typeof code === "string" && code.length < 80) return code
    }
    if (err instanceof Error) return err.name
    return "UNKNOWN"
  }
}

// Emit isolado — se o consumer lançar dentro de onOperation, não deve
// derrubar a operação principal do Gateway.
function safeEmit(telemetry: ProviderTelemetry, record: OperationRecord): void {
  try {
    telemetry.onOperation(record)
  } catch {
    /* deliberadamente engolido — telemetria não pode quebrar chamada */
  }
}

export function createGateway(options: CreateGatewayOptions = {}): AIGateway {
  return new GatewayImpl(options)
}

export * from "./types"
export * from "./errors"
export * from "./telemetry"
