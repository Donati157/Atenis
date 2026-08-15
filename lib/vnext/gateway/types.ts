// lib/vnext/gateway/types.ts
//
// Contratos do AI Gateway. Runtime nunca fala com provider concreto —
// pede primitivas ao Gateway, que roteia pra um Provider registrado.
//
// Primitivas:
//   - complete: input → texto único
//   - stream: input → sequência de chunks
//   - structured: input + schema Zod → objeto validado
//
// UseCases (critique, generate.epistemic, etc.) NÃO ficam aqui — são
// funções em camada de cima que usam as primitivas. O Gateway não conhece
// pedagogia, currículo, ou o Método Atenis. Ele só entrega tokens/objetos.

import type { z, ZodTypeAny } from "zod"

// -----------------------------------------------------------------------
// MENSAGENS
// -----------------------------------------------------------------------

export type Role = "system" | "user" | "assistant"

export interface ChatMessage {
  role: Role
  content: string
}

// -----------------------------------------------------------------------
// PRIMITIVAS
// -----------------------------------------------------------------------

export interface CompleteInput {
  messages: ChatMessage[]
  // hint opcional pra o Gateway escolher provider/modelo — não é garantia
  useCase?: string
  temperature?: number
  maxTokens?: number
  // metadados opcionais úteis pra observabilidade e roteamento por tenant
  metadata?: Record<string, string | number | boolean>
}

export interface CompleteOutput {
  text: string
  providerId: string
  modelId: string
  // tokens de entrada/saída pra observabilidade e cost cap (opcional)
  usage?: {
    promptTokens?: number
    completionTokens?: number
  }
}

export interface StreamChunk {
  type: "text-delta" | "finish"
  textDelta?: string
  finishReason?: "stop" | "length" | "error"
}

export interface StreamInput extends CompleteInput {}

export interface StreamOutput {
  providerId: string
  modelId: string
  stream: AsyncIterable<StreamChunk>
}

export interface StructuredInput<T extends ZodTypeAny> extends CompleteInput {
  schema: T
  // tentativas de reparo se o output não bater no schema (Gateway pode
  // pedir ao provider "corrija esse JSON pra bater neste schema"). 0 =
  // sem retry.
  maxRepairAttempts?: number
}

export interface StructuredOutput<T extends ZodTypeAny> {
  data: z.infer<T>
  providerId: string
  modelId: string
  repairAttempts: number
  // Fase 2B.2: providers reais preenchem usage quando disponível.
  usage?: {
    promptTokens?: number
    completionTokens?: number
  }
}

// -----------------------------------------------------------------------
// PROVIDER — contrato que um provider concreto (mock, openai, anthropic, ...)
// implementa.
// -----------------------------------------------------------------------

export interface ProviderCapabilities {
  supportsStreaming: boolean
  supportsStructured: boolean
  // se true, o provider PODE ser usado como default fallback. False = só
  // é escolhido se roteamento explícito pedir por ele.
  eligibleForDefault: boolean
}

export interface AIProvider {
  readonly id: string
  readonly modelId: string
  readonly capabilities: ProviderCapabilities
  complete(input: CompleteInput): Promise<CompleteOutput>
  stream(input: StreamInput): Promise<StreamOutput>
  structured<T extends ZodTypeAny>(
    input: StructuredInput<T>,
  ): Promise<StructuredOutput<T>>
}

// -----------------------------------------------------------------------
// GATEWAY — o que Runtime enxerga
// -----------------------------------------------------------------------

export interface AIGateway {
  register(provider: AIProvider): void
  unregister(providerId: string): void
  listProviders(): AIProvider[]
  complete(input: CompleteInput): Promise<CompleteOutput>
  stream(input: StreamInput): Promise<StreamOutput>
  structured<T extends ZodTypeAny>(
    input: StructuredInput<T>,
  ): Promise<StructuredOutput<T>>
}
