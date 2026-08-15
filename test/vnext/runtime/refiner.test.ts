// test/vnext/runtime/refiner.test.ts
//
// G: fixture ruim → Critic refine → segunda geração passa (fluxo real).
// H: fixture com error → Critic reject-equivalente ou refine-exhausted.
// M: provider lança → status=provider-error.
// N: schema inválido → Critic reject → status=reject.

import { describe, it, expect } from "vitest"
import { z } from "zod"
import { generateWithRefinement } from "../../../lib/vnext/runtime/refiner"
import type { ComposeRequestInput } from "../../../lib/vnext/runtime/prompt-composer"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { newTopicState } from "../../../lib/vnext/learning/types"
import { composeGenerationRequest } from "../../../lib/vnext/runtime/prompt-composer"
import { REFINEMENT_HEADER } from "../../../lib/vnext/runtime/prompt/refinement-brief"

function buildBase(): ComposeRequestInput {
  return {
    phase: "teach",
    state: newTopicState({
      studentId: "s1",
      topic: "quadratic",
      createdAt: "2026-08-11T14:00:00.000Z",
    }),
    message: "explica",
    event: null,
  }
}

const goodResponse = () => ({
  primaryTakeaway: "ok",
  nextStep: "prática",
  sources: [
    {
      id: "s1",
      type: "textbook",
      title: "Livro",
      authorityTier: "textbook",
      retrievedAt: "2026-08-11T14:00:00.000Z",
      provenance: { status: "unverified", verificationMethod: "none" },
    },
  ],
  evidences: [
    {
      id: "e1",
      text: "trecho relevante",
      sourceId: "s1",
      supportStrength: "strong",
      quotationExact: false,
      role: "primary",
    },
  ],
  claims: [
    {
      id: "c1",
      text: "definição",
      type: "definition",
      assertionLevel: "asserted",
      evidenceIds: ["e1"],
    },
  ],
  analyses: [
    {
      id: "a1",
      claimId: "c1",
      evidenceIds: ["e1"],
      text: "esta análise interpreta a evidence e conecta o conceito com o exercício típico de vestibular; não é paráfrase da fonte.",
      inferences: [],
      counterarguments: [],
      uncertainty: [],
    },
  ],
  reviews: [],
  detectedConflicts: [],
  meta: {
    generatedAt: "2026-08-11T14:00:00.000Z",
    modelName: "mock-v1",
    turnId: "turn-1",
  },
})

// Resposta ruim: fact sustentado só por source de authorityTier=generated
// → gera error FACT_WITHOUT_AUTHORITATIVE_SOURCE com suggestion → refine.
const weakResponse = () => ({
  primaryTakeaway: "ok",
  nextStep: "praticar",
  sources: [
    {
      id: "s-gen",
      type: "generated",
      title: "Gerada",
      authorityTier: "generated",
      retrievedAt: "2026-08-11T14:00:00.000Z",
      provenance: { status: "unverified", verificationMethod: "none" },
    },
  ],
  evidences: [
    {
      id: "e1",
      text: "trecho",
      sourceId: "s-gen",
      supportStrength: "strong",
      quotationExact: false,
      role: "primary",
    },
  ],
  claims: [
    {
      id: "c1",
      text: "afirmação factual",
      type: "fact",
      assertionLevel: "asserted",
      evidenceIds: ["e1"],
    },
  ],
  analyses: [
    {
      id: "a1",
      claimId: "c1",
      evidenceIds: ["e1"],
      text: "análise substantiva que interpreta a evidência em contexto pedagógico específico.",
      inferences: [],
      counterarguments: [],
      uncertainty: [],
    },
  ],
  reviews: [],
  detectedConflicts: [],
  meta: {
    generatedAt: "2026-08-11T14:00:00.000Z",
    modelName: "mock-v1",
    turnId: "turn-1",
  },
})

describe("G. refine → segunda geração passa", () => {
  it("primeira tentativa fraca gera refine, segunda com feedback passa (accept)", async () => {
    const mock = new MockProvider()
    // Match: sem feedback → weak; com feedback → good.
    mock.registerMatcher(
      (i) =>
        !i.messages.some(
          (m) => m.role === "system" && m.content.includes(REFINEMENT_HEADER),
        ),
      { body: { kind: "object", value: weakResponse() } },
      "weak (no feedback)",
    )
    mock.registerMatcher(
      (i) =>
        i.messages.some(
          (m) => m.role === "system" && m.content.includes(REFINEMENT_HEADER),
        ),
      { body: { kind: "object", value: goodResponse() } },
      "good (with feedback)",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const trace: Array<{ step: string }> = []
    const outcome = await generateWithRefinement(
      buildBase(),
      {
        gateway,
        criticAnalyze: (r) => analyze(r),
        clock: new FakeClock(),
        ids: new CounterIdGenerator(),
      },
      trace as never,
    )
    expect(outcome.status).toBe("accept")
    expect(outcome.attempts).toBe(2)
    // segunda tentativa DEVE ter feedback do critic
    const requests = trace.filter((t) => t.step === "refiner.request")
    expect(requests.length).toBe(2)
    const verdicts = trace.filter((t) => t.step === "refiner.critic-verdict")
    expect(
      (verdicts[0] as { detail: { action: string } }).detail.action,
    ).toBe("refine")
    expect(
      (verdicts[1] as { detail: { action: string } }).detail.action,
    ).toBe("accept")
  })

  it("segunda tentativa também fraca esgota tentativas com refine-exhausted", async () => {
    const mock = new MockProvider()
    mock.registerMatcher(
      () => true,
      { body: { kind: "object", value: weakResponse() } },
      "always weak",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const trace: Array<{ step: string }> = []
    const outcome = await generateWithRefinement(
      buildBase(),
      { gateway, criticAnalyze: (r) => analyze(r), clock: new FakeClock(), ids: new CounterIdGenerator() },
      trace as never,
    )
    expect(outcome.status).toBe("refine-exhausted")
    expect(outcome.attempts).toBe(2)
    expect(outcome.criticReport?.recommendedAction).toBe("refine")
  })
})

describe("H. Critic reject interrompe", () => {
  it("resposta com BROKEN_REFERENCE → reject imediato (sem retry)", async () => {
    const mock = new MockProvider()
    // Resposta com evidenceId inexistente pra forçar BROKEN_REFERENCE
    const bad = {
      ...goodResponse(),
      claims: [
        {
          id: "c1",
          text: "x",
          type: "fact",
          assertionLevel: "asserted",
          evidenceIds: ["ev-fantasma"], // não existe
        },
      ],
    }
    mock.registerMatcher(
      () => true,
      { body: { kind: "object", value: bad } },
      "broken ref",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const trace: Array<unknown> = []
    const outcome = await generateWithRefinement(
      buildBase(),
      { gateway, criticAnalyze: (r) => analyze(r), clock: new FakeClock(), ids: new CounterIdGenerator() },
      trace as never,
    )
    expect(outcome.status).toBe("reject")
    expect(outcome.attempts).toBe(1)
    expect(
      outcome.criticReport?.issues.some((i) => i.code === "BROKEN_REFERENCE"),
    ).toBe(true)
  })
})

describe("M. provider error", () => {
  it("provider lança → status=provider-error com errorDetail", async () => {
    const mock = new MockProvider()
    mock.registerMatcher(
      () => true,
      {
        body: {
          kind: "error",
          error: { name: "NetworkError", message: "ECONNRESET" },
        },
      },
      "provider down",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const trace: Array<unknown> = []
    const outcome = await generateWithRefinement(
      buildBase(),
      { gateway, criticAnalyze: (r) => analyze(r), clock: new FakeClock(), ids: new CounterIdGenerator() },
      trace as never,
    )
    expect(outcome.status).toBe("provider-error")
    expect(outcome.errorDetail).toContain("ECONNRESET")
    expect(outcome.reply).toBeNull()
  })
})

describe("N. schema inválido → reject", () => {
  it("provider retorna objeto que não bate no schema → StructuredValidationError vira provider-error (Fase 1)", async () => {
    const mock = new MockProvider()
    mock.registerMatcher(
      () => true,
      {
        body: {
          kind: "object",
          value: { primaryTakeaway: 42, junk: true }, // vira StructuredValidationError
        },
      },
      "malformed shape",
    )
    const gateway = createGateway()
    gateway.register(mock)
    const trace: Array<unknown> = []
    const outcome = await generateWithRefinement(
      buildBase(),
      { gateway, criticAnalyze: (r) => analyze(r), clock: new FakeClock(), ids: new CounterIdGenerator() },
      trace as never,
    )
    // MockProvider valida pelo schema pedido → lança StructuredValidationError
    // → Runtime pega como provider-error. Isso é aceito: NÃO passa silenciosamente.
    expect(outcome.status).toBe("provider-error")
    expect(outcome.errorDetail).toBeDefined()
  })
})

describe("composeGenerationRequest — sanity", () => {
  it("useCase = atenis.<phase>", () => {
    const req = composeGenerationRequest(buildBase())
    expect(req.useCase).toBe("atenis.teach")
  })
  it("hasCriticFeedback aparece no request", () => {
    const req = composeGenerationRequest({
      ...buildBase(),
      feedback: [
        {
          issueCode: "X",
          location: "claims.0",
          operation: "add-evidence",
          hint: "adicione evidence",
          priority: "high",
        },
      ],
    })
    expect(
      req.messages.some(
        (m) => m.role === "system" && m.content.includes(REFINEMENT_HEADER),
      ),
    ).toBe(true)
  })
})
