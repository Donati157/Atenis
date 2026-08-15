// test/vnext/gateway/mock-failures.test.ts
//
// Fase 0.1: MockProvider precisa simular determinísticamente as falhas
// que um provider real vai produzir em produção:
//
//   - timeout (via delayMs + AbortController — mas nesta camada só
//     provamos que delayMs é respeitado; timeout real é responsabilidade
//     do consumer, não do provider)
//   - erro de rede/API (fixture kind=error)
//   - malformed JSON pra structured
//   - stream com abortAfterChunk (partial + finish=error)
//   - fixture inexistente lança MockFixtureNotFoundError
//
// Usamos um sleep injetado (fakeSleep) pra testar delayMs sem esperar
// tempo real — determinismo total.

import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  MockProvider,
  MockProviderInvokedError,
  makeCompleteInput,
} from "../../../lib/vnext/gateway/providers/mock"
import {
  MockFixtureNotFoundError,
  StructuredValidationError,
} from "../../../lib/vnext/gateway/errors"

function newMock(opts: { fakeSleep?: boolean } = {}) {
  const calls: number[] = []
  const fakeSleep = async (ms: number) => {
    calls.push(ms)
  }
  const mock = new MockProvider({
    sleep: opts.fakeSleep ? fakeSleep : undefined,
  })
  return { mock, sleepCalls: calls }
}

describe("MockProvider — fixture inexistente", () => {
  it("lança MockFixtureNotFoundError com hint útil", async () => {
    const { mock } = newMock()
    await expect(
      mock.complete(makeCompleteInput([{ role: "user", content: "nada" }])),
    ).rejects.toBeInstanceOf(MockFixtureNotFoundError)
  })
})

describe("MockProvider — erro simulado", () => {
  it("complete lança MockProviderInvokedError com code e name", async () => {
    const { mock } = newMock()
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    mock.registerErrorFixture(input, {
      name: "RateLimitError",
      message: "429 too many requests",
      code: "RATE_LIMIT",
    })
    try {
      await mock.complete(input)
      throw new Error("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(MockProviderInvokedError)
      const e = err as MockProviderInvokedError
      expect(e.name).toBe("RateLimitError")
      expect(e.code).toBe("RATE_LIMIT")
      expect(e.message).toContain("429")
    }
  })

  it("stream lança MockProviderInvokedError antes de iniciar", async () => {
    const { mock } = newMock()
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    mock.registerErrorFixture(input, {
      name: "ProviderDown",
      message: "provider offline",
    })
    await expect(mock.stream(input)).rejects.toBeInstanceOf(
      MockProviderInvokedError,
    )
  })
})

describe("MockProvider — malformed JSON pra structured", () => {
  it("StructuredValidationError com JSON inválido registrado como malformed", async () => {
    const { mock } = newMock()
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    mock.registerMalformedJsonFixture(input, "{ not: valid, json:}")
    const schema = z.object({ a: z.number() })
    await expect(
      mock.structured({ ...input, schema }),
    ).rejects.toBeInstanceOf(StructuredValidationError)
  })

  it("StructuredValidationError também quando texto é JSON válido mas viola schema", async () => {
    const { mock } = newMock()
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    mock.registerTextFixture(input, '{"a": "not a number"}')
    const schema = z.object({ a: z.number() })
    await expect(
      mock.structured({ ...input, schema }),
    ).rejects.toBeInstanceOf(StructuredValidationError)
  })
})

describe("MockProvider — partial stream (abortAfterChunk)", () => {
  it("emite N chunks e então finish=error", async () => {
    const { mock } = newMock()
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    // Texto longo o suficiente pra o abort acionar antes de terminar:
    // chunkSize default é 16, abortAfterChunk=2 → precisa > 32 chars.
    const fullText = "0123456789".repeat(20) // 200 chars → ~13 chunks
    mock.registerFixture(input, {
      body: { kind: "text", text: fullText },
      abortAfterChunk: 2,
    })
    const { stream } = await mock.stream(input)
    const chunks: string[] = []
    let finishReason: string | undefined
    for await (const c of stream) {
      if (c.type === "text-delta") chunks.push(c.textDelta ?? "")
      if (c.type === "finish") finishReason = c.finishReason
    }
    expect(chunks.length).toBe(2)
    expect(finishReason).toBe("error")
    // texto acumulado é apenas os chunks emitidos, NÃO o texto completo
    expect(chunks.join("").length).toBeLessThan(fullText.length)
  })
})

describe("MockProvider — delayMs (timeout simulado)", () => {
  it("delayMs é aplicado antes de complete retornar (via fakeSleep injetado)", async () => {
    const { mock, sleepCalls } = newMock({ fakeSleep: true })
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    mock.registerFixture(input, {
      body: { kind: "text", text: "hi" },
      delayMs: 5000,
    })
    await mock.complete(input)
    expect(sleepCalls).toEqual([5000])
  })

  it("delayMs é aplicado antes do stream começar a emitir", async () => {
    const { mock, sleepCalls } = newMock({ fakeSleep: true })
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    mock.registerFixture(input, {
      body: { kind: "text", text: "hi" },
      delayMs: 2000,
    })
    const { stream } = await mock.stream(input)
    // consome pra fechar o generator
    const chunks: string[] = []
    for await (const c of stream) {
      if (c.type === "text-delta") chunks.push(c.textDelta ?? "")
    }
    expect(sleepCalls).toEqual([2000])
    expect(chunks.join("")).toBe("hi")
  })

  it("delayMs pode ser combinado com erro (simula timeout que 'estoura' após espera)", async () => {
    const { mock, sleepCalls } = newMock({ fakeSleep: true })
    const input = makeCompleteInput([{ role: "user", content: "x" }], "u")
    mock.registerFixture(input, {
      body: {
        kind: "error",
        error: { name: "TimeoutError", message: "read timeout" },
      },
      delayMs: 30000,
    })
    await expect(mock.complete(input)).rejects.toBeInstanceOf(
      MockProviderInvokedError,
    )
    // sleep foi aplicado antes do erro ser lançado
    expect(sleepCalls).toEqual([30000])
  })
})
