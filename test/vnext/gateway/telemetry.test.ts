// test/vnext/gateway/telemetry.test.ts
//
// Prova:
// - sem telemetry, Gateway se comporta idêntico ao anterior.
// - com telemetry, cada primitiva emite OperationRecord com metadata.
// - OperationRecord NUNCA inclui prompt/response.
// - erros do provider viram record com status=failure + errorCode.
// - erros DENTRO de telemetry NÃO derrubam a chamada.

import { describe, it, expect } from "vitest"
import { z } from "zod"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import type {
  OperationRecord,
  ProviderTelemetry,
} from "../../../lib/vnext/gateway/telemetry"

function newMockProviderWith(text: string) {
  const mock = new MockProvider()
  const input = { messages: [{ role: "user" as const, content: "hi" }], useCase: "greet" }
  mock.registerTextFixture(input, text)
  return { mock, input }
}

describe("Gateway sem telemetry — comportamento inalterado", () => {
  it("chamada complete devolve output normal", async () => {
    const { mock, input } = newMockProviderWith("olá")
    const gw = createGateway()
    gw.register(mock)
    const out = await gw.complete(input)
    expect(out.text).toBe("olá")
  })
})

describe("Gateway com telemetry — emit records", () => {
  it("complete → record com providerId, modelId, operation, useCase", async () => {
    const records: OperationRecord[] = []
    const telemetry: ProviderTelemetry = {
      onOperation: (r) => records.push(r),
    }
    const { mock, input } = newMockProviderWith("olá")
    // clockMs determinístico pra latency=0 (não relevante pra este teste)
    let t = 0
    const gw = createGateway({ telemetry, clockMs: () => t++ })
    gw.register(mock)
    await gw.complete(input)
    expect(records.length).toBe(1)
    expect(records[0].operation).toBe("complete")
    expect(records[0].providerId).toBe("mock")
    expect(records[0].modelId).toBe("mock-v1")
    expect(records[0].useCase).toBe("greet")
    expect(records[0].status).toBe("success")
  })

  it("stream → record com operation=stream", async () => {
    const records: OperationRecord[] = []
    const telemetry: ProviderTelemetry = { onOperation: (r) => records.push(r) }
    const { mock, input } = newMockProviderWith("olá")
    const gw = createGateway({ telemetry })
    gw.register(mock)
    const { stream } = await gw.stream(input)
    // Consome o stream inteiro pra o generator terminar
    for await (const _ of stream) {
      void _
    }
    expect(records[0].operation).toBe("stream")
  })

  it("structured → record com operation=structured", async () => {
    const records: OperationRecord[] = []
    const telemetry: ProviderTelemetry = { onOperation: (r) => records.push(r) }
    const mock = new MockProvider()
    const input = {
      messages: [{ role: "user" as const, content: "x" }],
      useCase: "u",
    }
    mock.registerObjectFixture(input, { n: 1 })
    const gw = createGateway({ telemetry })
    gw.register(mock)
    await gw.structured({ ...input, schema: z.object({ n: z.number() }) })
    expect(records[0].operation).toBe("structured")
  })

  it("record NÃO inclui prompt/response (nem campo, nem valor)", async () => {
    const records: OperationRecord[] = []
    const telemetry: ProviderTelemetry = { onOperation: (r) => records.push(r) }
    const { mock, input } = newMockProviderWith("resposta-secreta")
    const gw = createGateway({ telemetry })
    gw.register(mock)
    await gw.complete(input)
    const asJson = JSON.stringify(records[0])
    // Nenhum campo pode ser prompt/response
    expect(records[0]).not.toHaveProperty("prompt")
    expect(records[0]).not.toHaveProperty("response")
    expect(records[0]).not.toHaveProperty("text")
    // E o texto de resposta também NÃO pode vazar acidentalmente
    expect(asJson).not.toContain("resposta-secreta")
    expect(asJson).not.toContain("hi")
  })
})

describe("Gateway com telemetry — falha do provider", () => {
  it("provider lança → record com status=failure e errorCode", async () => {
    const records: OperationRecord[] = []
    const telemetry: ProviderTelemetry = { onOperation: (r) => records.push(r) }
    const mock = new MockProvider()
    const input = {
      messages: [{ role: "user" as const, content: "x" }],
      useCase: "u",
    }
    mock.registerErrorFixture(input, {
      name: "TimeoutError",
      message: "timed out",
      code: "MOCK_TIMEOUT",
    })
    const gw = createGateway({ telemetry })
    gw.register(mock)
    await expect(gw.complete(input)).rejects.toThrow()
    expect(records[0].status).toBe("failure")
    expect(records[0].errorCode).toBe("MOCK_TIMEOUT")
  })
})

describe("Gateway com telemetry — safeEmit", () => {
  it("erro DENTRO do onOperation NÃO derruba a chamada", async () => {
    const brokenTelemetry: ProviderTelemetry = {
      onOperation: () => {
        throw new Error("boom")
      },
    }
    const { mock, input } = newMockProviderWith("olá")
    const gw = createGateway({ telemetry: brokenTelemetry })
    gw.register(mock)
    const out = await gw.complete(input)
    expect(out.text).toBe("olá")
  })
})
