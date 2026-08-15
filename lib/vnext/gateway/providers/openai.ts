// lib/vnext/gateway/providers/openai.ts
//
// OpenAIProvider — chamada DIRETA à OpenAI (bypass Vercel AI Gateway).
//
// Usado enquanto o Gateway está bloqueando generation no workspace.
// Mesmo contrato `AIProvider` — Runtime não sabe que trocou. VercelAI
// Gateway Provider preservado no repo pra voltar quando o bloqueio
// for resolvido.
//
// PRINCÍPIOS:
//   1. Nenhuma credencial NO CÓDIGO. Provider guarda só o NOME da env
//      var; leitura acontece SÓ dentro do path activated=true.
//   2. `modelId` é PARÂMETRO. Runtime nunca escolhe modelo.
//   3. Validação Zod acontece SEMPRE em `structured()`, mesmo depois do
//      `generateObject` do SDK. Não confiar só no SDK.
//   4. Erros do SDK viram `ProviderInvocationError` classificado via
//      `ai-sdk-shared.classifyAiSdkError` — mesma taxonomia usada pelo
//      Vercel Provider (tipos de erro do AI SDK v5).
//
// PATH ATIVADO — como funciona:
//
//   - `complete()`  → `generateText({ model: openai(modelId), ... })`
//   - `stream()`    → `streamText({ model: openai(modelId), ... })`
//   - `structured()` → `generateObject({ model: openai(modelId), schema, ... })`
//                     depois valida com Zod local (defesa em profundidade).
//
// O `@ai-sdk/openai` lê `OPENAI_API_KEY` do env automaticamente. Nós
// verificamos presença ANTES pra dar erro claro (MissingCredentialError).

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

export const openAIConfigSchema = z.object({
  // "gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", etc. Sem prefixo "openai/"
  // (a factory `openai()` do @ai-sdk/openai não usa prefixo).
  modelId: z.string().min(1).max(200),
  apiKeyEnvVar: z.string().min(1).max(100).default("OPENAI_API_KEY"),
  // baseUrl opcional pra self-hosted proxies compatíveis com OpenAI API.
  baseUrl: z.string().url().max(500).optional(),
  // Organization/project opcionais — só o NOME da env var, nunca o valor.
  organizationEnvVar: z.string().min(1).max(100).optional(),
  projectEnvVar: z.string().min(1).max(100).optional(),
  providerId: z.string().min(1).max(80).default("openai"),
  activated: z.boolean().default(false),
})

export type OpenAIConfig = z.infer<typeof openAIConfigSchema>

export class OpenAIProvider implements AIProvider {
  readonly id: string
  readonly modelId: string
  readonly capabilities: ProviderCapabilities
  private readonly config: OpenAIConfig

  constructor(rawConfig: unknown) {
    const parsed = openAIConfigSchema.safeParse(rawConfig)
    if (!parsed.success) {
      throw new Error(
        `OpenAIProvider: config inválida: ${summarize(parsed.error.issues)}`,
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

  // Metadata NON-SENSITIVE — ok pra logs. NUNCA inclui apiKey/org/project
  // values.
  describe(): {
    id: string
    modelId: string
    apiKeyEnvVar: string
    organizationEnvVar?: string
    projectEnvVar?: string
    baseUrl?: string
    activated: boolean
  } {
    return {
      id: this.id,
      modelId: this.modelId,
      apiKeyEnvVar: this.config.apiKeyEnvVar,
      organizationEnvVar: this.config.organizationEnvVar,
      projectEnvVar: this.config.projectEnvVar,
      baseUrl: this.config.baseUrl,
      activated: this.config.activated,
    }
  }

  async complete(input: CompleteInput): Promise<CompleteOutput> {
    this.assertActivated()
    this.assertCredentialPresent()
    const { generateText } = await import("ai")
    const model = await this.makeModel()
    const { system, prompt } = messagesToPrompt(input.messages)
    try {
      const result = await generateText({ model, system, prompt })
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
    const model = await this.makeModel()
    const { system, prompt } = messagesToPrompt(input.messages)
    const providerId = this.id
    const modelId = this.modelId
    let sdkResult: Awaited<ReturnType<typeof streamText>>
    try {
      sdkResult = streamText({ model, system, prompt })
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
    const model = await this.makeModel()
    const { system, prompt } = messagesToPrompt(input.messages)
    let sdkResult: { object: unknown; usage?: unknown }
    try {
      sdkResult = await generateObject({
        model,
        schema: input.schema,
        system,
        prompt,
      })
    } catch (err) {
      throw classifyAiSdkError(err)
    }
    // Defesa em profundidade: revalida com Zod mesmo depois do SDK.
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

  private async makeModel(): Promise<import("ai").LanguageModel> {
    // `@ai-sdk/openai` exporta uma factory `openai(modelId)` que retorna
    // um LanguageModel compatível com generateText/streamText/generateObject.
    // Passamos apiKey/baseURL/organization/project via createOpenAI se
    // qualquer um estiver customizado; senão a factory pega do env.
    const anyCustom =
      Boolean(this.config.baseUrl) ||
      Boolean(this.config.organizationEnvVar) ||
      Boolean(this.config.projectEnvVar)
    // eslint-disable-next-line no-process-env
    const apiKey = process.env[this.config.apiKeyEnvVar]!
    // eslint-disable-next-line no-process-env
    const organization = this.config.organizationEnvVar
      ? process.env[this.config.organizationEnvVar]
      : undefined
    // eslint-disable-next-line no-process-env
    const project = this.config.projectEnvVar
      ? process.env[this.config.projectEnvVar]
      : undefined
    if (anyCustom) {
      const { createOpenAI } = await import("@ai-sdk/openai")
      const client = createOpenAI({
        apiKey,
        baseURL: this.config.baseUrl,
        organization,
        project,
      })
      return client(this.modelId)
    }
    const { openai } = await import("@ai-sdk/openai")
    return openai(this.modelId)
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
