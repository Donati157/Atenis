// test/vnext/gateway/openai-provider.test.ts
//
// Fase 2B.3: testa OpenAIProvider SEM chamar rede.
//   - Ativação e config Zod
//   - describe() nunca vaza secret
//   - MissingCredentialError sem env
//   - Activated=false lança ProviderNotActivatedError
//   - Não elegível como default até activated=true

import { describe, it, expect, afterEach } from "vitest"
import { OpenAIProvider } from "../../../lib/vnext/gateway/providers/openai"
import {
  MissingCredentialError,
  ProviderNotActivatedError,
} from "../../../lib/vnext/gateway/errors"

const ENV_NAME = "ATENIS_TEST_OPENAI_FAKE_KEY"

afterEach(() => {
  delete process.env[ENV_NAME]
})

describe("OpenAIProvider — config", () => {
  it("valida config mínima", () => {
    const p = new OpenAIProvider({ modelId: "gpt-4o-mini" })
    expect(p.id).toBe("openai")
    expect(p.modelId).toBe("gpt-4o-mini")
    expect(p.isActivated()).toBe(false)
  })

  it("rejeita config inválida com erro claro", () => {
    expect(() => new OpenAIProvider({})).toThrow(/config inválida/)
  })

  it("apiKeyEnvVar default é OPENAI_API_KEY", () => {
    const p = new OpenAIProvider({ modelId: "gpt-4o-mini" })
    expect(p.describe().apiKeyEnvVar).toBe("OPENAI_API_KEY")
  })

  it("NÃO é elegível como default quando activated=false", () => {
    const p = new OpenAIProvider({ modelId: "gpt-4o-mini" })
    expect(p.capabilities.eligibleForDefault).toBe(false)
  })

  it("É elegível como default quando activated=true", () => {
    const p = new OpenAIProvider({
      modelId: "gpt-4o-mini",
      activated: true,
    })
    expect(p.capabilities.eligibleForDefault).toBe(true)
  })

  it("providerId configurável (útil pra registrar 2 modelos OpenAI)", () => {
    const cheap = new OpenAIProvider({
      modelId: "gpt-4o-mini",
      providerId: "openai-cheap",
    })
    const strong = new OpenAIProvider({
      modelId: "gpt-4o",
      providerId: "openai-strong",
    })
    expect(cheap.id).toBe("openai-cheap")
    expect(strong.id).toBe("openai-strong")
  })
})

describe("OpenAIProvider — describe() nunca vaza secret", () => {
  it("describe() sem apiKey mesmo com env setada", () => {
    process.env[ENV_NAME] = "sk-fake-value-should-not-appear-anywhere"
    const p = new OpenAIProvider({
      modelId: "gpt-4o-mini",
      apiKeyEnvVar: ENV_NAME,
      activated: true,
    })
    const desc = p.describe()
    const asJson = JSON.stringify(desc)
    expect(asJson).not.toContain("sk-fake-value-should-not-appear-anywhere")
    expect(desc.apiKeyEnvVar).toBe(ENV_NAME)
    const keys = Object.keys(desc)
    expect(keys).not.toContain("apiKey")
    expect(keys).not.toContain("token")
    expect(keys).not.toContain("secret")
  })

  it("describe() com organizationEnvVar não vaza valor da org", () => {
    process.env[ENV_NAME] = "sk-fake"
    process.env.ATENIS_TEST_ORG = "org-secret-id"
    const p = new OpenAIProvider({
      modelId: "gpt-4o-mini",
      apiKeyEnvVar: ENV_NAME,
      organizationEnvVar: "ATENIS_TEST_ORG",
      activated: true,
    })
    const desc = p.describe()
    const asJson = JSON.stringify(desc)
    expect(asJson).not.toContain("org-secret-id")
    expect(desc.organizationEnvVar).toBe("ATENIS_TEST_ORG")
    delete process.env.ATENIS_TEST_ORG
  })
})

describe("OpenAIProvider ATIVADO — sem credencial", () => {
  it("complete lança MissingCredentialError com o NOME da var", async () => {
    const p = new OpenAIProvider({
      modelId: "gpt-4o-mini",
      apiKeyEnvVar: ENV_NAME,
      activated: true,
    })
    try {
      await p.complete({ messages: [{ role: "user", content: "?" }] })
      throw new Error("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(MissingCredentialError)
      const msg = (err as Error).message
      expect(msg).toContain(ENV_NAME)
      expect(msg).not.toContain("sk-")
    }
  })

  it("structured lança MissingCredentialError sem credencial", async () => {
    const { z } = await import("zod")
    const p = new OpenAIProvider({
      modelId: "gpt-4o-mini",
      apiKeyEnvVar: ENV_NAME,
      activated: true,
    })
    await expect(
      p.structured({
        messages: [{ role: "user", content: "?" }],
        schema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toBeInstanceOf(MissingCredentialError)
  })

  it("env var vazia string é tratada como ausente", async () => {
    process.env[ENV_NAME] = "   "
    const p = new OpenAIProvider({
      modelId: "gpt-4o-mini",
      apiKeyEnvVar: ENV_NAME,
      activated: true,
    })
    await expect(
      p.complete({ messages: [{ role: "user", content: "?" }] }),
    ).rejects.toBeInstanceOf(MissingCredentialError)
  })
})

describe("OpenAIProvider NÃO ativado", () => {
  it("complete/stream/structured lançam ProviderNotActivatedError", async () => {
    const { z } = await import("zod")
    const p = new OpenAIProvider({ modelId: "gpt-4o-mini" })
    const input = { messages: [{ role: "user" as const, content: "?" }] }
    await expect(p.complete(input)).rejects.toBeInstanceOf(
      ProviderNotActivatedError,
    )
    await expect(p.stream(input)).rejects.toBeInstanceOf(
      ProviderNotActivatedError,
    )
    await expect(
      p.structured({ ...input, schema: z.object({ x: z.number() }) }),
    ).rejects.toBeInstanceOf(ProviderNotActivatedError)
  })
})

describe("OpenAIProvider — coexistência com Vercel Provider", () => {
  it("Runtime pode ter AMBOS registrados; routing por metadata.providerId", async () => {
    const { createGateway } = await import("../../../lib/vnext/gateway")
    const { VercelAIGatewayProvider } = await import(
      "../../../lib/vnext/gateway/providers/vercel-ai-gateway"
    )
    const gateway = createGateway()
    gateway.register(new OpenAIProvider({ modelId: "gpt-4o-mini" }))
    gateway.register(
      new VercelAIGatewayProvider({
        modelId: "openai/gpt-4o-mini",
        providerId: "vercel-ai-gateway",
      }),
    )
    const ids = gateway.listProviders().map((p) => p.id)
    expect(ids).toContain("openai")
    expect(ids).toContain("vercel-ai-gateway")
    // Nenhum é default (ambos activated=false)
    for (const p of gateway.listProviders()) {
      expect(p.capabilities.eligibleForDefault).toBe(false)
    }
  })
})
