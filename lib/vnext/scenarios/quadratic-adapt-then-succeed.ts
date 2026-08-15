// lib/vnext/scenarios/quadratic-adapt-then-succeed.ts
//
// Fixture determinística pro cenário "aluno não entende função quadrática
// → sistema adapta → aluno demonstra prontidão". É consumida por:
//   - test/vnext/runtime/runtime.test.ts (teste E2E)
//   - app/api/vnext/tutor/route.ts (endpoint DEV-ONLY)
//
// Cada fixture registrada casa por MATCHER (não por chave exata) pra
// tolerar variações no state que aparecem no prompt-composer entre ticks.
// Chaveia pelo useCase + (opcionalmente) presença do bloco de refinement.
//
// Duas variantes existem pro useCase "atenis.teach":
//   (a) primeira chamada: gera resposta EPISTEMICAMENTE FRACA (fact sem
//       source autoritativa) → Critic devolve refine.
//   (b) chamada com refinement do Critic presente: gera resposta boa.
//
// Isso prova E2E que Runtime consome de fato refine do Critic.
//
// Fase 2B.6: o marcador do bloco de refinement mudou de `critic-feedback:`
// prefix (composer stub Fase 1) para o header em prosa `REFINEMENT_HEADER`
// (`## REFINAMENTO SOLICITADO`) — importado do módulo do composer.

import type { MockProvider } from "../gateway/providers/mock"
import type { CompleteInput } from "../gateway/types"
import { REFINEMENT_HEADER } from "../runtime/prompt/refinement-brief"

export type ScenarioName = "quadratic-adapt-then-succeed"

export function registerScenarioFixtures(
  mock: MockProvider,
  scenario: ScenarioName,
): void {
  if (scenario === "quadratic-adapt-then-succeed") {
    registerQuadraticAdaptThenSucceed(mock)
    return
  }
  throw new Error(`Cenário desconhecido: ${scenario}`)
}

function hasCriticFeedback(input: CompleteInput): boolean {
  return input.messages.some(
    (m) => m.role === "system" && m.content.includes(REFINEMENT_HEADER),
  )
}

function useCaseIs(input: CompleteInput, useCase: string): boolean {
  return input.useCase === useCase
}

function registerQuadraticAdaptThenSucceed(mock: MockProvider): void {
  // DIAGNOSE: primeira interação, pergunta se aluno quer começar.
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.diagnose"),
    { body: { kind: "object", value: makeGoodResponse("diagnose") } },
    "atenis.diagnose",
  )

  // TEACH — variante com feedback (segunda tentativa): resposta boa.
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.teach") && hasCriticFeedback(i),
    { body: { kind: "object", value: makeGoodResponse("teach") } },
    "atenis.teach (with feedback)",
  )
  // TEACH — primeira tentativa: resposta epistemicamente FRACA (fact
  // sustentado só por fonte generated → error FACT_WITHOUT_AUTHORITATIVE)
  // pra forçar Critic refine. Após feedback, próxima chamada casa com
  // matcher acima e retorna resposta boa.
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.teach") && !hasCriticFeedback(i),
    { body: { kind: "object", value: makeWeakResponse("teach") } },
    "atenis.teach (first attempt — weak, triggers refine)",
  )

  // PRACTICE
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.practice"),
    { body: { kind: "object", value: makeGoodResponse("practice") } },
    "atenis.practice",
  )

  // VERIFY
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.verify"),
    { body: { kind: "object", value: makeGoodResponse("verify") } },
    "atenis.verify",
  )
}

// -----------------------------------------------------------------------
// Response builders — StructuredResponse válida no schema Fase 0.1.
// Timestamps FIXOS (não Date.now) pra manter determinismo total no
// hash canônico do MockProvider e nos snapshots de teste.
// -----------------------------------------------------------------------

const FIXED_ISO = "2026-08-11T14:00:00.000Z"

function makeGoodResponse(phase: string) {
  const suffix = phase
  return {
    primaryTakeaway: `[${suffix}] Função quadrática é f(x) = ax² + bx + c, a ≠ 0.`,
    nextStep: `[${suffix}] Vamos praticar reconhecendo a, b, c.`,
    sources: [
      {
        id: `src-${suffix}`,
        type: "textbook",
        title: "Livro didático — Matemática EM",
        authorityTier: "textbook",
        retrievedAt: FIXED_ISO,
        provenance: { status: "unverified", verificationMethod: "none" },
      },
    ],
    evidences: [
      {
        id: `ev-${suffix}`,
        text: "A definição formal de função quadrática exige coeficiente a diferente de zero.",
        sourceId: `src-${suffix}`,
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
    ],
    claims: [
      {
        id: `c-${suffix}`,
        text: "Função quadrática é f(x) = ax² + bx + c com a ≠ 0.",
        type: "definition",
        assertionLevel: "asserted",
        evidenceIds: [`ev-${suffix}`],
      },
    ],
    analyses: [
      {
        id: `a-${suffix}`,
        claimId: `c-${suffix}`,
        evidenceIds: [`ev-${suffix}`],
        text: "A condição a ≠ 0 separa quadrática de linear; sem ela reduz a bx+c, que é reta. Isso importa quando aparece parâmetro literal — verificar sempre se o exercício restringe o valor de a.",
        inferences: [],
        counterarguments: [],
        uncertainty: [],
      },
    ],
    reviews: [],
    detectedConflicts: [],
    meta: {
      generatedAt: FIXED_ISO,
      modelName: "mock-v1",
      turnId: `turn-${suffix}`,
    },
  }
}

// Resposta epistemicamente fraca — fact com Source de authorityTier
// "generated" (LLM criou do nada). Bate a regra:
//   FACT_WITHOUT_AUTHORITATIVE_SOURCE → error com suggestion upgrade-source
// → Critic responde refine.
function makeWeakResponse(phase: string) {
  const suffix = `${phase}-weak`
  return {
    primaryTakeaway: `[${suffix}] Fórmula: f(x) = ax² + bx + c.`,
    nextStep: `[${suffix}] Vamos praticar.`,
    sources: [
      {
        id: `src-${suffix}`,
        type: "generated",
        title: "Explicação gerada pelo modelo",
        authorityTier: "generated",
        retrievedAt: FIXED_ISO,
        provenance: { status: "unverified", verificationMethod: "none" },
      },
    ],
    evidences: [
      {
        id: `ev-${suffix}`,
        text: "O modelo afirma que essa é a fórmula.",
        sourceId: `src-${suffix}`,
        supportStrength: "moderate",
        quotationExact: false,
        role: "primary",
      },
    ],
    claims: [
      {
        id: `c-${suffix}`,
        text: "A fórmula da função quadrática é f(x) = ax² + bx + c.",
        type: "fact",
        assertionLevel: "asserted",
        evidenceIds: [`ev-${suffix}`],
      },
    ],
    analyses: [
      {
        id: `a-${suffix}`,
        claimId: `c-${suffix}`,
        evidenceIds: [`ev-${suffix}`],
        text: "A fórmula segue um padrão polinomial de segundo grau — quadrado, primeiro grau e constante.",
        inferences: [],
        counterarguments: [],
        uncertainty: [],
      },
    ],
    reviews: [],
    detectedConflicts: [],
    meta: {
      generatedAt: FIXED_ISO,
      modelName: "mock-v1",
      turnId: `turn-${suffix}`,
    },
  }
}
