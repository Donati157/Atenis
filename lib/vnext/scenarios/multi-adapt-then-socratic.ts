// lib/vnext/scenarios/multi-adapt-then-socratic.ts
//
// Cenário Fase 1.1: aluno erra worked_example E analogy; só na
// terceira tentativa (socratic ou visual_diagram, dependendo da
// política) o Runtime acerta. Prova que:
//   - o Method Engine passa por MÚLTIPLAS adaptações consecutivas;
//   - `pickAdaptStrategy` evita reciclar strategies que já falharam
//     duas vezes em sequência;
//   - `strategyEffectiveness` acumula evidência contextual.

import type { MockProvider } from "../gateway/providers/mock"
import type { CompleteInput } from "../gateway/types"

export function registerMultiAdaptFixtures(mock: MockProvider): void {
  const useCaseIs = (i: CompleteInput, uc: string) => i.useCase === uc

  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.diagnose"),
    { body: { kind: "object", value: makeResponse("diagnose") } },
    "diagnose",
  )
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.teach"),
    { body: { kind: "object", value: makeResponse("teach") } },
    "teach (any strategy)",
  )
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.practice"),
    { body: { kind: "object", value: makeResponse("practice") } },
    "practice",
  )
  mock.registerMatcher(
    (i) => useCaseIs(i, "atenis.verify"),
    { body: { kind: "object", value: makeResponse("verify") } },
    "verify",
  )
}

const FIXED_ISO = "2026-08-11T14:00:00.000Z"

function makeResponse(phase: string) {
  return {
    primaryTakeaway: `[${phase}] Conteúdo simulado.`,
    nextStep: `[${phase}] Próximo passo.`,
    sources: [
      {
        id: `src-${phase}`,
        type: "textbook",
        title: "Livro didático",
        authorityTier: "textbook",
        retrievedAt: FIXED_ISO,
        provenance: { status: "unverified", verificationMethod: "none" },
      },
    ],
    evidences: [
      {
        id: `ev-${phase}`,
        text: "Trecho sintético do livro sobre o tópico em questão.",
        sourceId: `src-${phase}`,
        supportStrength: "strong",
        quotationExact: false,
        role: "primary",
      },
    ],
    claims: [
      {
        id: `c-${phase}`,
        text: "Definição do tópico com precisão suficiente.",
        type: "definition",
        assertionLevel: "asserted",
        evidenceIds: [`ev-${phase}`],
      },
    ],
    analyses: [
      {
        id: `a-${phase}`,
        claimId: `c-${phase}`,
        evidenceIds: [`ev-${phase}`],
        text: "A análise interpreta a definição no contexto pedagógico específico e conecta com o exercício típico do vestibular sem parafrasear o trecho citado.",
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
      turnId: `turn-${phase}`,
    },
  }
}
