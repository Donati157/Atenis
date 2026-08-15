// test/vnext/gateway/mock-provider.test.ts

import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  MockProvider,
  canonicalKey,
  makeCompleteInput,
} from "../../../lib/vnext/gateway/providers/mock"
import {
  MockFixtureNotFoundError,
  StructuredValidationError,
} from "../../../lib/vnext/gateway/errors"

describe("MockProvider — determinismo", () => {
  it("mesma entrada devolve mesma saída", async () => {
    const mock = new MockProvider()
    const input = makeCompleteInput(
      [{ role: "user", content: "olá" }],
      "greet",
    )
    mock.registerTextFixture(input, "oi")
    const a = await mock.complete(input)
    const b = await mock.complete(input)
    expect(a.text).toBe("oi")
    expect(b.text).toBe("oi")
    expect(a.text).toBe(b.text)
  })

  it("hash canônico ignora ordem de campos no metadata (só considera messages+useCase)", () => {
    const a = canonicalKey({
      messages: [{ role: "user", content: "x" }],
      useCase: "test",
      metadata: { foo: 1, bar: 2 },
    })
    const b = canonicalKey({
      messages: [{ role: "user", content: "x" }],
      useCase: "test",
      metadata: { bar: 2, foo: 1 },
    })
    expect(a).toBe(b)
  })

  it("hash canônico diferencia mudança em messages", () => {
    const a = canonicalKey({
      messages: [{ role: "user", content: "x" }],
    })
    const b = canonicalKey({
      messages: [{ role: "user", content: "y" }],
    })
    expect(a).not.toBe(b)
  })
})

describe("MockProvider — sem fixture", () => {
  it("lança MockFixtureNotFoundError com hint útil", async () => {
    const mock = new MockProvider()
    const input = makeCompleteInput(
      [{ role: "user", content: "mensagem sem fixture" }],
      "unknown",
    )
    await expect(mock.complete(input)).rejects.toBeInstanceOf(
      MockFixtureNotFoundError,
    )
    try {
      await mock.complete(input)
    } catch (err) {
      const msg = (err as Error).message
      expect(msg).toContain("mensagem sem fixture")
      expect(msg).toContain("unknown")
    }
  })
})

describe("MockProvider — matchers", () => {
  it("matcher casa quando fixture exata não existe", async () => {
    const mock = new MockProvider()
    mock.registerMatcher(
      (input) => input.useCase === "greet",
      { body: { kind: "text", text: "matched" } },
      "any-greet",
    )
    const out = await mock.complete(
      makeCompleteInput(
        [{ role: "user", content: "qualquer" }],
        "greet",
      ),
    )
    expect(out.text).toBe("matched")
  })

  it("fixture exata tem prioridade sobre matcher", async () => {
    const mock = new MockProvider()
    const input = makeCompleteInput(
      [{ role: "user", content: "olá" }],
      "greet",
    )
    mock.registerTextFixture(input, "exact")
    mock.registerMatcher(
      () => true,
      { body: { kind: "text", text: "matcher" } },
      "catch-all",
    )
    const out = await mock.complete(input)
    expect(out.text).toBe("exact")
  })
})

describe("MockProvider — stream", () => {
  it("emite chunks somando ao texto completo + finish", async () => {
    const mock = new MockProvider({ streamChunkSize: 4 })
    const input = makeCompleteInput(
      [{ role: "user", content: "s" }],
      "s",
    )
    mock.registerTextFixture(input, "abcdefghij")
    const { stream } = await mock.stream(input)
    const chunks: string[] = []
    let finish = false
    for await (const c of stream) {
      if (c.type === "text-delta") chunks.push(c.textDelta ?? "")
      if (c.type === "finish") finish = true
    }
    expect(chunks.join("")).toBe("abcdefghij")
    expect(chunks.length).toBeGreaterThan(1)
    expect(finish).toBe(true)
  })
})

describe("MockProvider — structured", () => {
  const schema = z.object({ n: z.number(), name: z.string() })

  it("valida objeto direto contra schema Zod", async () => {
    const mock = new MockProvider()
    const input = makeCompleteInput(
      [{ role: "user", content: "s" }],
      "s",
    )
    mock.registerObjectFixture(input, { n: 42, name: "atenis" })
    const out = await mock.structured({ ...input, schema })
    expect(out.data.n).toBe(42)
    expect(out.data.name).toBe("atenis")
  })

  it("valida texto que é JSON válido", async () => {
    const mock = new MockProvider()
    const input = makeCompleteInput(
      [{ role: "user", content: "s2" }],
      "s2",
    )
    mock.registerTextFixture(input, '{"n": 1, "name": "x"}')
    const out = await mock.structured({ ...input, schema })
    expect(out.data.n).toBe(1)
  })

  it("lança StructuredValidationError se schema não bate", async () => {
    const mock = new MockProvider()
    const input = makeCompleteInput(
      [{ role: "user", content: "s3" }],
      "s3",
    )
    mock.registerObjectFixture(input, { n: "not a number", name: "x" })
    await expect(
      mock.structured({ ...input, schema }),
    ).rejects.toBeInstanceOf(StructuredValidationError)
  })
})
