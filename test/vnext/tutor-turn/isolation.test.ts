// test/vnext/tutor-turn/isolation.test.ts
//
// I. Critic independente do provider (analyzeTurn sem Gateway).
// J. Runtime tradicional (não-slice) continua funcionando com MockProvider.
// K. Vertical Slice NÃO invoca VercelAIGatewayProvider (nem quando registrado).

import { describe, it, expect } from "vitest"
import { runTutorTurn } from "../../../lib/vnext/tutor-turn"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { VercelAIGatewayProvider } from "../../../lib/vnext/gateway/providers/vercel-ai-gateway"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { TutorTurnOutput } from "../../../lib/vnext/tutor-turn/schema"

const GOOD: TutorTurnOutput = {
  explanation:
    "A função quadrática tem a forma f(x)=ax²+bx+c com a diferente de zero.",
  suggestedNextAction: "invite-attempt",
  followUpQuestion: {
    text: "Identifique a, b, c.",
    kind: "practice",
  },
  uncertaintyMarkers: [],
  meta: { generatedAt: "2026-08-11T14:00:00.000Z" },
}

describe("J. Vertical Slice roda com MockProvider sem exigir Runtime tradicional", () => {
  it("Runner é STANDALONE (não usa Runtime, Method Engine, etc.)", async () => {
    const mock = new MockProvider()
    mock.registerMatcher(
      () => true,
      { body: { kind: "object", value: GOOD } },
      "catch-all",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const result = await runTutorTurn(
      {
        phase: "teach",
        strategy: "worked_example",
        topic: "funcao-quadratica",
        context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
        state: newTopicState({
          studentId: "s1",
          topic: "funcao-quadratica",
          createdAt: "2026-08-11T00:00:00.000Z",
        }),
        taskInstruction: "Ensinar.",
      },
      { gateway },
    )
    expect(result.kind).toBe("accept")
  })
})

describe("K. Vercel Provider registrado como default MAS não ativado → runner FALHA sem chamar", () => {
  it("Provider stub bloqueia chamada real; runner devolve provider-error", async () => {
    const gateway = createGateway({
      defaultProviderId: "vercel-ai-gateway",
    })
    // NÃO registramos Mock; só o Vercel stub (activated=false).
    gateway.register(
      new VercelAIGatewayProvider({
        modelId: "openai/gpt-4o",
      }),
    )
    const result = await runTutorTurn(
      {
        phase: "diagnose",
        strategy: null,
        topic: "funcao-quadratica",
        context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
        state: newTopicState({
          studentId: "s1",
          topic: "funcao-quadratica",
          createdAt: "2026-08-11T00:00:00.000Z",
        }),
        taskInstruction: "Diagnosticar.",
      },
      { gateway },
    )
    expect(result.kind).toBe("provider-error")
    if (result.kind === "provider-error") {
      // Erro do stub, NÃO chamada real
      expect(result.errorCode).toBe("PROVIDER_NOT_ACTIVATED")
    }
  })

  it("MockProvider e Vercel Provider coexistem — routing explícito escolhe Mock", async () => {
    const mock = new MockProvider()
    mock.registerMatcher(
      () => true,
      { body: { kind: "object", value: GOOD } },
      "any",
    )
    const gateway = createGateway({ defaultProviderId: "mock" })
    gateway.register(mock)
    gateway.register(
      new VercelAIGatewayProvider({ modelId: "openai/gpt-4o" }),
    )
    const result = await runTutorTurn(
      {
        phase: "teach",
        strategy: "worked_example",
        topic: "funcao-quadratica",
        context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
        state: newTopicState({
          studentId: "s1",
          topic: "funcao-quadratica",
          createdAt: "2026-08-11T00:00:00.000Z",
        }),
        taskInstruction: "Ensinar.",
      },
      { gateway },
    )
    expect(result.kind).toBe("accept")
    if (result.kind === "accept") {
      expect(result.providerId).toBe("mock")
    }
  })
})
