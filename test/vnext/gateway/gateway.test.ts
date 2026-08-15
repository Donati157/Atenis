// test/vnext/gateway/gateway.test.ts

import { describe, it, expect } from "vitest"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import {
  NoDefaultProviderError,
  ProviderNotRegisteredError,
} from "../../../lib/vnext/gateway/errors"

describe("Gateway — registro e listagem", () => {
  it("register + listProviders", () => {
    const gw = createGateway()
    const m = new MockProvider({ id: "mock-a" })
    gw.register(m)
    expect(gw.listProviders().map((p) => p.id)).toEqual(["mock-a"])
  })

  it("unregister remove provider", () => {
    const gw = createGateway()
    const m = new MockProvider({ id: "m1" })
    gw.register(m)
    gw.unregister("m1")
    expect(gw.listProviders()).toEqual([])
  })
})

describe("Gateway — roteamento", () => {
  it("usa defaultProviderId quando setado", async () => {
    const gw = createGateway({ defaultProviderId: "a" })
    const a = new MockProvider({ id: "a", modelId: "a-1" })
    const b = new MockProvider({ id: "b", modelId: "b-1" })
    const input = { messages: [{ role: "user" as const, content: "hi" }] }
    a.registerTextFixture(input, "from-a")
    b.registerTextFixture(input, "from-b")
    gw.register(a)
    gw.register(b)
    const out = await gw.complete(input)
    expect(out.text).toBe("from-a")
    expect(out.providerId).toBe("a")
  })

  it("respeita metadata.providerId como override explícito", async () => {
    const gw = createGateway({ defaultProviderId: "a" })
    const a = new MockProvider({ id: "a" })
    const b = new MockProvider({ id: "b" })
    const inputBase = { messages: [{ role: "user" as const, content: "hi" }] }
    a.registerTextFixture(inputBase, "from-a")
    b.registerTextFixture(
      { ...inputBase, metadata: { providerId: "b" } },
      "from-b",
    )
    gw.register(a)
    gw.register(b)
    const out = await gw.complete({
      ...inputBase,
      metadata: { providerId: "b" },
    })
    expect(out.text).toBe("from-b")
    expect(out.providerId).toBe("b")
  })

  it("lança ProviderNotRegisteredError pra id inexistente em metadata", async () => {
    const gw = createGateway()
    const a = new MockProvider({ id: "a" })
    gw.register(a)
    await expect(
      gw.complete({
        messages: [{ role: "user", content: "x" }],
        metadata: { providerId: "nao-existe" },
      }),
    ).rejects.toBeInstanceOf(ProviderNotRegisteredError)
  })

  it("lança NoDefaultProviderError quando nenhum provider elegível está registrado", async () => {
    const gw = createGateway()
    await expect(
      gw.complete({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toBeInstanceOf(NoDefaultProviderError)
  })

  it("cai no primeiro provider elegível quando defaultProviderId não está setado", async () => {
    const gw = createGateway()
    const a = new MockProvider({ id: "a", eligibleForDefault: false })
    const b = new MockProvider({ id: "b", eligibleForDefault: true })
    const input = { messages: [{ role: "user" as const, content: "x" }] }
    b.registerTextFixture(input, "from-b")
    gw.register(a)
    gw.register(b)
    const out = await gw.complete(input)
    expect(out.providerId).toBe("b")
  })
})
