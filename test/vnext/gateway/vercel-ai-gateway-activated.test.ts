// test/vnext/gateway/vercel-ai-gateway-activated.test.ts
//
// Fase 2B.2: testa comportamento do path activated=true SEM chamar rede.
// - Sem env var setada → MissingCredentialError com nome da var (não valor).
// - Env var vazia é tratada como ausente.
// - describe() continua sem apiKey no output.

import { describe, it, expect, afterEach } from "vitest"
import { VercelAIGatewayProvider } from "../../../lib/vnext/gateway/providers/vercel-ai-gateway"
import {
  MissingCredentialError,
} from "../../../lib/vnext/gateway/errors"

const ENV_NAME = "ATENIS_TEST_FAKE_KEY"

afterEach(() => {
  delete process.env[ENV_NAME]
})

describe("VercelAIGatewayProvider ATIVADO — sem credencial", () => {
  it("assertCredentialPresent lança MissingCredentialError com o NOME da var", async () => {
    const p = new VercelAIGatewayProvider({
      modelId: "openai/gpt-4o-mini",
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
      // NUNCA vaza valor esperado (não há forma de vazar; garantimos que
      // não tem "AI_GATEWAY" hardcoded na msg):
      expect(msg).not.toContain("AI_GATEWAY_API_KEY")
    }
  })

  it("env var vazia string é tratada como ausente", async () => {
    process.env[ENV_NAME] = "   "
    const p = new VercelAIGatewayProvider({
      modelId: "openai/gpt-4o-mini",
      apiKeyEnvVar: ENV_NAME,
      activated: true,
    })
    await expect(
      p.structured({
        messages: [{ role: "user", content: "?" }],
        schema: (await import("zod")).z.object({ ok: (await import("zod")).z.boolean() }),
      }),
    ).rejects.toBeInstanceOf(MissingCredentialError)
  })
})

describe("VercelAIGatewayProvider — segurança do describe()", () => {
  it("describe() sem apiKey mesmo com env setada", () => {
    process.env[ENV_NAME] = "secret-value-that-should-not-appear"
    const p = new VercelAIGatewayProvider({
      modelId: "openai/gpt-4o-mini",
      apiKeyEnvVar: ENV_NAME,
      activated: true,
    })
    const desc = p.describe()
    const asJson = JSON.stringify(desc)
    expect(asJson).not.toContain("secret-value-that-should-not-appear")
    expect(desc.apiKeyEnvVar).toBe(ENV_NAME)
    // Nenhum campo com "key" no NOME também é aceitável — só apiKeyEnvVar.
    const keys = Object.keys(desc)
    expect(keys).toContain("apiKeyEnvVar")
    expect(keys).not.toContain("apiKey")
    expect(keys).not.toContain("token")
    delete process.env[ENV_NAME]
  })
})
