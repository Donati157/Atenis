// test/vnext/tutor-turn/runner.test.ts
//
// F. schema Zod validation acontece no gateway.structured.
// G. output inválido → schema-validation error.
// H. output válido → analyzeTurn → accept/refine.
// I. Critic independente do provider (analyzer não conhece Gateway).
// K. Nenhuma chamada externa (tudo MockProvider).

import { describe, it, expect } from "vitest"
import { runTutorTurn } from "../../../lib/vnext/tutor-turn"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { TutorTurnOutput } from "../../../lib/vnext/tutor-turn/schema"

function goodOutput(): TutorTurnOutput {
  return {
    explanation:
      "A função quadrática tem a forma f(x)=ax²+bx+c com a diferente de zero. A concavidade depende do sinal de a.",
    suggestedNextAction: "invite-attempt",
    followUpQuestion: {
      text: "Tente identificar a, b e c em f(x)=2x²-4x+1.",
      kind: "practice",
    },
    uncertaintyMarkers: [],
    meta: {
      generatedAt: "2026-08-11T14:00:00.000Z",
      modelHint: "mock-v1",
    },
  }
}

const CTX = { subject: "matematica", grade: "EM01", schoolStage: "high" }
const STATE = newTopicState({
  studentId: "s1",
  topic: "funcao-quadratica",
  createdAt: "2026-08-11T00:00:00.000Z",
})

async function runWithFixture(fixtureValue: unknown) {
  const mock = new MockProvider()
  mock.registerMatcher(
    (i) => i.useCase?.startsWith("atenis.tutor-turn.") ?? false,
    { body: { kind: "object", value: fixtureValue } },
    "any tutor-turn",
  )
  const gateway = createGateway()
  gateway.register(mock)
  return runTutorTurn(
    {
      phase: "teach",
      strategy: "worked_example",
      topic: "funcao-quadratica",
      context: CTX,
      state: STATE,
      taskInstruction: "Explicar função quadrática.",
    },
    { gateway },
  )
}

describe("H. output válido → analyzeTurn → accept", () => {
  it("cenário happy path devolve kind=accept", async () => {
    const result = await runWithFixture(goodOutput())
    expect(result.kind).toBe("accept")
    if (result.kind === "accept") {
      expect(result.report.recommendedAction).toBe("accept")
      expect(result.output.explanation).toBeTruthy()
      expect(result.providerId).toBe("mock")
    }
  })
})

describe("output com warn → accept mesmo assim", () => {
  it("uncertaintyMarkers sem analysis → warn, mas ainda accept", async () => {
    const withUncertainty: TutorTurnOutput = {
      ...goodOutput(),
      uncertaintyMarkers: [{ what: "algo", reason: "meta-nível" }],
      analysis: undefined,
    }
    const result = await runWithFixture(withUncertainty)
    expect(result.kind).toBe("accept")
  })
})

describe("output com error refinável → refine", () => {
  it("escalate sem analysis → refine", async () => {
    const bad: TutorTurnOutput = {
      ...goodOutput(),
      suggestedNextAction: "escalate",
      analysis: undefined,
    }
    const result = await runWithFixture(bad)
    expect(result.kind).toBe("refine")
    if (result.kind === "refine") {
      expect(
        result.report.issues.some(
          (i) => i.code === "escalate-without-analysis",
        ),
      ).toBe(true)
      expect(result.report.refinementHints.length).toBeGreaterThan(0)
    }
  })
})

describe("G. schema Zod inválido → provider-error (MockProvider valida no structured)", () => {
  it("payload que não bate no schema → StructuredValidationError → provider-error", async () => {
    // Payload não é TutorTurnOutput
    const result = await runWithFixture({ nothing: "here" })
    expect(result.kind).toBe("provider-error")
    if (result.kind === "provider-error") {
      expect(result.errorCode).toBe("STRUCTURED_VALIDATION_FAILED")
    }
  })
})

describe("Critic INDEPENDENTE do provider", () => {
  it("analyzeTurn é chamado sobre output puro, sem passar Gateway", async () => {
    // Se o analyzer conhecesse Gateway, teste síncrono direto (sem
    // gateway.structured) não daria pra rodar. Import direto do
    // analyzer e roda em output sintético.
    const { analyzeTurn } = await import(
      "../../../lib/vnext/tutor-turn"
    )
    const r = analyzeTurn(goodOutput())
    expect(r.recommendedAction).toBe("accept")
  })
})

describe("K. nenhuma chamada externa", () => {
  it("Runner só usa MockProvider — providerId sempre mock", async () => {
    const result = await runWithFixture(goodOutput())
    if (result.kind === "accept" || result.kind === "refine" || result.kind === "reject") {
      expect(result.providerId).toBe("mock")
    }
  })
})
