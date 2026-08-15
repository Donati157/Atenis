// lib/vnext/gateway/providers/mock.ts
//
// MockProvider — determinístico. Mesmo input → mesma saída.
//
// FASE 0.1: MockFixtureBody agora suporta simulações de falha, essenciais
// pra testar o comportamento do consumer (Runtime/Critic/etc.) sob
// condições que provider real vai produzir em produção:
//
//   - { kind: "text", text }               → texto normal
//   - { kind: "object", value }            → objeto (usado em structured)
//   - { kind: "error", error }             → provider lança erro (rede,
//                                             rate limit, malformed API
//                                             response, etc.)
//   - { kind: "malformed-json", text }     → structured recebe JSON quebrado
//
// Fixtures podem incluir opções:
//   - delayMs                              → simula latência
//   - abortAfterChunk                      → stream corta em N chunks
//                                             emitindo finish=error
//
// Formas de registrar: registerFixture (hash canônico), registerMatcher
// (predicate), + atalhos registerText/Object/Error/MalformedJson.

import { z, type ZodTypeAny } from "zod"
import type {
  AIProvider,
  ChatMessage,
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
  MockFixtureNotFoundError,
  StructuredValidationError,
} from "../errors"

// -----------------------------------------------------------------------
// FIXTURE TYPES
// -----------------------------------------------------------------------

export interface MockErrorSpec {
  name: string
  message: string
  code?: string
}

export type MockFixtureBody =
  | { kind: "text"; text: string }
  | { kind: "object"; value: unknown }
  | { kind: "error"; error: MockErrorSpec }
  | { kind: "malformed-json"; text: string }

export interface MockUsage {
  promptTokens?: number
  completionTokens?: number
}

export interface MockFixture {
  body: MockFixtureBody
  usage?: MockUsage
  // Latência simulada, aplicada antes de complete/stream/structured retornar
  delayMs?: number
  // Se setado, stream() emite N chunks e então emite finish=error
  abortAfterChunk?: number
}

export type MockMatcher = (input: CompleteInput) => boolean

interface MatcherEntry {
  matcher: MockMatcher
  fixture: MockFixture
  description: string
}

// Erro lançado pelo provider quando fixture pediu — permite consumer
// distinguir "provider real caiu" de "bug no teste".
export class MockProviderInvokedError extends Error {
  readonly code: string
  constructor(spec: MockErrorSpec) {
    super(spec.message)
    this.name = spec.name || "MockProviderInvokedError"
    this.code = spec.code ?? "MOCK_PROVIDER_ERROR"
  }
}

// -----------------------------------------------------------------------
// HASHING CANÔNICO — pra determinismo
// -----------------------------------------------------------------------

export function canonicalKey(input: CompleteInput): string {
  const payload = {
    useCase: input.useCase ?? null,
    messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
  }
  return JSON.stringify(payload)
}

// -----------------------------------------------------------------------
// MOCK PROVIDER
// -----------------------------------------------------------------------

interface MockProviderOptions {
  id?: string
  modelId?: string
  eligibleForDefault?: boolean
  streamChunkSize?: number
  // Fase 0.1: injetável pra testes determinísticos de delayMs (evitar
  // esperar tempo real). Default é setTimeout real.
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export class MockProvider implements AIProvider {
  readonly id: string
  readonly modelId: string
  readonly capabilities: ProviderCapabilities

  private fixtures = new Map<string, MockFixture>()
  private matchers: MatcherEntry[] = []
  private streamChunkSize: number
  private sleep: (ms: number) => Promise<void>

  constructor(options: MockProviderOptions = {}) {
    this.id = options.id ?? "mock"
    this.modelId = options.modelId ?? "mock-v1"
    this.streamChunkSize = options.streamChunkSize ?? 16
    this.sleep = options.sleep ?? defaultSleep
    this.capabilities = {
      supportsStreaming: true,
      supportsStructured: true,
      eligibleForDefault: options.eligibleForDefault ?? true,
    }
  }

  registerFixture(input: CompleteInput, fixture: MockFixture): string {
    const key = canonicalKey(input)
    this.fixtures.set(key, fixture)
    return key
  }

  registerTextFixture(input: CompleteInput, text: string): string {
    return this.registerFixture(input, { body: { kind: "text", text } })
  }

  registerObjectFixture(input: CompleteInput, value: unknown): string {
    return this.registerFixture(input, { body: { kind: "object", value } })
  }

  // Fase 0.1: helpers pra fixtures de falha
  registerErrorFixture(input: CompleteInput, error: MockErrorSpec): string {
    return this.registerFixture(input, { body: { kind: "error", error } })
  }

  registerMalformedJsonFixture(input: CompleteInput, text: string): string {
    return this.registerFixture(input, {
      body: { kind: "malformed-json", text },
    })
  }

  registerMatcher(
    matcher: MockMatcher,
    fixture: MockFixture,
    description = "unnamed-matcher",
  ): void {
    this.matchers.push({ matcher, fixture, description })
  }

  clear(): void {
    this.fixtures.clear()
    this.matchers = []
  }

  private resolveFixture(input: CompleteInput): MockFixture {
    const key = canonicalKey(input)
    const exact = this.fixtures.get(key)
    if (exact) return exact
    for (const entry of this.matchers) {
      if (entry.matcher(input)) return entry.fixture
    }
    throw new MockFixtureNotFoundError(this.buildHint(input))
  }

  private buildHint(input: CompleteInput): string {
    const lastUser = [...input.messages]
      .reverse()
      .find((m) => m.role === "user")
    const snippet = lastUser
      ? `last user: "${truncate(lastUser.content, 80)}"`
      : "no user message"
    return `useCase=${input.useCase ?? "(none)"}; ${snippet}`
  }

  async complete(input: CompleteInput): Promise<CompleteOutput> {
    const fixture = this.resolveFixture(input)
    if (fixture.delayMs) await this.sleep(fixture.delayMs)
    if (fixture.body.kind === "error") {
      throw new MockProviderInvokedError(fixture.body.error)
    }
    const text = fixtureBodyToText(fixture.body)
    return {
      text,
      providerId: this.id,
      modelId: this.modelId,
      usage: fixture.usage,
    }
  }

  async stream(input: StreamInput): Promise<StreamOutput> {
    const fixture = this.resolveFixture(input)
    if (fixture.delayMs) await this.sleep(fixture.delayMs)
    if (fixture.body.kind === "error") {
      throw new MockProviderInvokedError(fixture.body.error)
    }
    const text = fixtureBodyToText(fixture.body)
    const size = this.streamChunkSize
    const abortAt = fixture.abortAfterChunk
    const providerId = this.id
    const modelId = this.modelId
    async function* generate(): AsyncGenerator<StreamChunk> {
      let emitted = 0
      for (let i = 0; i < text.length; i += size) {
        if (abortAt !== undefined && emitted >= abortAt) {
          yield { type: "finish", finishReason: "error" }
          return
        }
        yield { type: "text-delta", textDelta: text.slice(i, i + size) }
        emitted++
      }
      yield { type: "finish", finishReason: "stop" }
    }
    return { providerId, modelId, stream: generate() }
  }

  async structured<T extends ZodTypeAny>(
    input: StructuredInput<T>,
  ): Promise<StructuredOutput<T>> {
    const fixture = this.resolveFixture(input)
    if (fixture.delayMs) await this.sleep(fixture.delayMs)
    if (fixture.body.kind === "error") {
      throw new MockProviderInvokedError(fixture.body.error)
    }
    const raw = extractStructuredPayload(fixture.body)
    const parsed = input.schema.safeParse(raw)
    if (!parsed.success) {
      throw new StructuredValidationError(parsed.error.issues, 0)
    }
    return {
      data: parsed.data as z.infer<T>,
      providerId: this.id,
      modelId: this.modelId,
      repairAttempts: 0,
    }
  }
}

// -----------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------

function fixtureBodyToText(body: MockFixtureBody): string {
  switch (body.kind) {
    case "text":
      return body.text
    case "object":
      return JSON.stringify(body.value)
    case "malformed-json":
      return body.text
    case "error":
      throw new Error("fixtureBodyToText: called on error body (bug)")
  }
}

function extractStructuredPayload(body: MockFixtureBody): unknown {
  switch (body.kind) {
    case "object":
      return body.value
    case "text":
      return safeParseJson(body.text)
    case "malformed-json":
      // De propósito: mesmo JSON.parse falhando, retornamos o texto cru
      // pra o schema falhar (é a semântica: "provider devolveu JSON quebrado").
      return safeParseJson(body.text)
    case "error":
      throw new Error("extractStructuredPayload: called on error body (bug)")
  }
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text
}

export function makeCompleteInput(
  messages: ChatMessage[],
  useCase?: string,
): CompleteInput {
  return { messages, useCase }
}
