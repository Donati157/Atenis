// lib/vnext/gateway/providers/vercel-ai-gateway.ts
//
// Fase 2B.2 (ATIVADO): agora suporta chamada REAL ao Vercel AI Gateway
// via AI SDK v5 (`ai` package). Continua sendo POSSÍVEL rodar como stub
// (`activated: false`) — comportamento antigo preservado.
//
// PRINCÍPIOS:
//   1. Nenhuma credencial NO CÓDIGO. Provider guarda só o NOME da env
//      var; leitura acontece SÓ dentro do path activated=true.
//   2. `modelId` é PARÂMETRO. Runtime nunca escolhe modelo.
//   3. Validação Zod acontece SEMPRE em `structured()`, mesmo depois do
//      `generateObject` do SDK. Não confiar só no SDK.
//   4. Erros do SDK viram `ProviderInvocationError` classificado —
//      nunca vazam mensagem crua.
//
// PATH ATIVADO — como funciona:
//
//   - `complete()`  → `generateText({model, prompt, system})`
//   - `stream()`    → `streamText({model, prompt, system})`, mapeia
//                     `textStream` pra nosso `StreamChunk`
//   - `structured()` → `generateObject({model, schema, prompt, system})`
//                     depois valida com Zod local.
//
// O SDK v5 lê `AI_GATEWAY_API_KEY` do env automaticamente quando o
// `model` tem prefixo de provider (ex: "openai/gpt-4o-mini").
// Nós verificamos presença ANTES pra dar erro claro em vez de esperar
// o SDK reclamar.

import { z } from "zod"
import {
  MissingCredentialError,
  ProviderInvocationError,
  ProviderNotActivatedError,
} from "../errors"
import type {
  AIProvider,
  CompleteInput,
  CompleteOutput,
  ProviderCapabilities,
  StreamChunk,
  StreamInput,
  StreamOutput,
  StructuredInput,
  StructuredOutput,
} from "../types"
import {
  classifyAiSdkError,
  messagesToPrompt,
  usageFromSdk,
} from "./ai-sdk-shared"

export const vercelAIGatewayConfigSchema = z.object({
  modelId: z.string().min(1).max(200),
  apiKeyEnvVar: z.string().min(1).max(100).default("AI_GATEWAY_API_KEY"),
  baseUrl: z.string().url().max(500).optional(),
  providerId: z.string().min(1).max(80).default("vercel-ai-gateway"),
  activated: z.boolean().default(false),
})

export type VercelAIGatewayConfig = z.infer<
  typeof vercelAIGatewayConfigSchema
>

export class VercelAIGatewayProvider implements AIProvider {
  readonly id: string
  readonly modelId: string
  readonly capabilities: ProviderCapabilities
  private readonly config: VercelAIGatewayConfig

  constructor(rawConfig: unknown) {
    const parsed = vercelAIGatewayConfigSchema.safeParse(rawConfig)
    if (!parsed.success) {
      throw new Error(
        `VercelAIGatewayProvider: config inválida: ${summarize(parsed.error.issues)}`,
      )
    }
    this.config = parsed.data
    this.id = parsed.data.providerId
    this.modelId = parsed.data.modelId
    this.capabilities = {
      supportsStreaming: true,
      supportsStructured: true,
      eligibleForDefault: parsed.data.activated,
    }
  }

  isActivated(): boolean {
    return this.config.activated
  }

  // Metadata NON-SENSITIVE — ok pra logs. NUNCA inclui apiKey.
  describe(): {
    id: string
    modelId: string
    apiKeyEnvVar: string
    baseUrl?: string
    activated: boolean
  } {
    return {
      id: this.id,
      modelId: this.modelId,
      apiKeyEnvVar: this.config.apiKeyEnvVar,
      baseUrl: this.config.baseUrl,
      activated: this.config.activated,
    }
  }

  async complete(input: CompleteInput): Promise<CompleteOutput> {
    this.assertActivated()
    this.assertCredentialPresent()
    const { generateText } = await import("ai")
    const { system, prompt } = messagesToPrompt(input.messages)
    try {
      const result = await generateText({
        model: this.modelId,
        system,
        prompt,
      })
      return {
        text: result.text,
        providerId: this.id,
        modelId: this.modelId,
        usage: usageFromSdk(result.usage),
      }
    } catch (err) {
      throw classifyAiSdkError(err)
    }
  }

  async stream(input: StreamInput): Promise<StreamOutput> {
    this.assertActivated()
    this.assertCredentialPresent()
    const { streamText } = await import("ai")
    const { system, prompt } = messagesToPrompt(input.messages)
    const providerId = this.id
    const modelId = this.modelId
    let sdkResult: Awaited<ReturnType<typeof streamText>>
    try {
      sdkResult = streamText({
        model: modelId,
        system,
        prompt,
      })
    } catch (err) {
      throw classifyAiSdkError(err)
    }
    async function* generate(): AsyncGenerator<StreamChunk> {
      try {
        for await (const chunk of sdkResult.textStream) {
          yield { type: "text-delta", textDelta: chunk }
        }
        yield { type: "finish", finishReason: "stop" }
      } catch (err) {
        yield { type: "finish", finishReason: "error" }
        throw classifyAiSdkError(err)
      }
    }
    return { providerId, modelId, stream: generate() }
  }

  async structured<T extends z.ZodTypeAny>(
    input: StructuredInput<T>,
  ): Promise<StructuredOutput<T>> {
    this.assertActivated()
    this.assertCredentialPresent()
    const { generateObject } = await import("ai")
    const { system, prompt } = messagesToPrompt(input.messages)
    let sdkResult: {
      object: unknown
      usage?: unknown
    }
    try {
      sdkResult = await generateObject({
        model: this.modelId,
        schema: input.schema,
        system,
        prompt,
      })
    } catch (err) {
      throw classifyAiSdkError(err)
    }
    // DEFESA EM PROFUNDIDADE: revalida com Zod mesmo depois do SDK.
    // O SDK usa o schema pra guiar o LLM, mas confiar SÓ nele é
    // frágil (provider concreto pode devolver parcial).
    const parsed = input.schema.safeParse(sdkResult.object)
    if (!parsed.success) {
      throw new ProviderInvocationError(
        "STRUCTURED_VALIDATION_FAILED",
        "generateObject devolveu payload que não bate na revalidação Zod local.",
      )
    }
    return {
      data: parsed.data as z.infer<T>,
      providerId: this.id,
      modelId: this.modelId,
      repairAttempts: 0,
      usage: usageFromSdk(sdkResult.usage),
    }
  }

  private assertActivated(): void {
    if (!this.config.activated) {
      throw new ProviderNotActivatedError(
        this.id,
        `Passe activated=true e certifique-se de que ${this.config.apiKeyEnvVar} está setada.`,
      )
    }
  }

  private assertCredentialPresent(): void {
    // eslint-disable-next-line no-process-env
    const value = process.env[this.config.apiKeyEnvVar]
    if (!value || value.trim().length === 0) {
      throw new MissingCredentialError(this.config.apiKeyEnvVar)
    }
  }
}

// -----------------------------------------------------------------------
// HELPERS extraídos pra `ai-sdk-shared.ts` — reutilizados por OpenAIProvider.
// -----------------------------------------------------------------------

// classifyError/extractErrorProps agora vivem em ai-sdk-shared.ts
// (reutilizados por OpenAIProvider).


// Exportado APENAS pra testes — nome verboso pra desincentivar uso externo.
export { classifyAiSdkError as classifyErrorForTests }

function summarize(zodIssues: unknown): string {
  if (!Array.isArray(zodIssues)) return "unknown"
  return zodIssues
    .slice(0, 3)
    .map((i: { path?: unknown[]; message?: string }) => {
      const p = Array.isArray(i.path) ? i.path.join(".") : "?"
      return `${p}: ${i.message ?? "?"}`
    })
    .join("; ")
}
