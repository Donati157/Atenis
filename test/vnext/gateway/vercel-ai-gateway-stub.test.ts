// test/vnext/gateway/vercel-ai-gateway-stub.test.ts
//
// Prova que o VercelAIGatewayProvider está registrável, mas NUNCA
// executa chamadas reais nesta fase. Toda invocação de primitiva
// resulta em ProviderNotActivatedError.

import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  ProviderNotActivatedError,
  createGateway,
} from "../../../lib/vnext/gateway"
import { VercelAIGatewayProvider } from "../../../lib/vnext/gateway/providers/vercel-ai-gateway"

describe("VercelAIGatewayProvider — config", () => {
  it("valida config mínima", () => {
    const p = new VercelAIGatewayProvider({ modelId: "openai/gpt-4o" })
    expect(p.id).toBe("vercel-ai-gateway")
    expect(p.modelId).toBe("openai/gpt-4o")
    expect(p.isActivated()).toBe(false)
  })

  it("rejeita config inválida com erro claro", () => {
    expect(() => new VercelAIGatewayProvider({})).toThrow(/config inválida/)
  })

  it("apiKeyEnvVar default é AI_GATEWAY_API_KEY", () => {
    const p = new VercelAIGatewayProvider({ modelId: "openai/gpt-4o" })
    expect(p.describe().apiKeyEnvVar).toBe("AI_GATEWAY_API_KEY")
  })

  it("describe() NÃO inclui apiKey (só o NOME da env var)", () => {
    const p = new VercelAIGatewayProvider({
      modelId: "openai/gpt-4o",
      apiKeyEnvVar: "MEU_TOKEN",
    })
    const desc = p.describe()
    // Nenhum campo pode ser "apiKey" ou similar com valor real
    expect(Object.keys(desc)).not.toContain("apiKey")
    expect(desc.apiKeyEnvVar).toBe("MEU_TOKEN")
  })

  it("NÃO é elegível como default quando activated=false", () => {
    const p = new VercelAIGatewayProvider({ modelId: "openai/gpt-4o" })
    expect(p.capabilities.eligibleForDefault).toBe(false)
  })

  it("É elegível como default quando activated=true (mesmo sendo stub)", () => {
    const p = new VercelAIGatewayProvider({
      modelId: "openai/gpt-4o",
      activated: true,
    })
    expect(p.capabilities.eligibleForDefault).toBe(true)
  })
})

describe("VercelAIGatewayProvider — chamadas sempre lançam ProviderNotActivatedError com activated=false", () => {
  const provider = new VercelAIGatewayProvider({ modelId: "openai/gpt-4o" })
  const input = { messages: [{ role: "user" as const, content: "oi" }] }

  it("complete lança", async () => {
    await expect(provider.complete(input)).rejects.toBeInstanceOf(
      ProviderNotActivatedError,
    )
  })

  it("stream lança", async () => {
    await expect(provider.stream(input)).rejects.toBeInstanceOf(
      ProviderNotActivatedError,
    )
  })

  it("structured lança", async () => {
    await expect(
      provider.structured({ ...input, schema: z.object({ x: z.number() }) }),
    ).rejects.toBeInstanceOf(ProviderNotActivatedError)
  })

  it("mensagem do erro cita apiKeyEnvVar (dica pra dev)", async () => {
    try {
      await provider.complete(input)
      throw new Error("should have thrown")
    } catch (err) {
      expect((err as Error).message).toContain("AI_GATEWAY_API_KEY")
    }
  })
})

// Fase 2B.2: activated=true agora ATIVA path real. Sem credencial, o
// erro é MissingCredentialError (não mais ProviderNotActivatedError).
// Isso é regressão intencional do teste anterior.

describe("Integração com AIGateway (registry-level, sem chamar)", () => {
  it("Provider stub pode ser registrado no Gateway", () => {
    const gw = createGateway()
    gw.register(
      new VercelAIGatewayProvider({ modelId: "openai/gpt-4o" }),
    )
    expect(gw.listProviders().map((p) => p.id)).toContain(
      "vercel-ai-gateway",
    )
  })

  it("Gateway NÃO cai automaticamente no stub (não elegível como default)", async () => {
    const gw = createGateway()
    gw.register(
      new VercelAIGatewayProvider({ modelId: "openai/gpt-4o" }),
    )
    // Sem defaultProviderId E sem eligible: complete deve lançar
    // NoDefaultProviderError, NÃO ProviderNotActivatedError. Ou seja, o
    // Gateway NÃO ROTEIA acidentalmente pro stub.
    await expect(
      gw.complete({ messages: [{ role: "user", content: "?" }] }),
    ).rejects.toThrow(/Nenhum provider elegível/)
  })
})
