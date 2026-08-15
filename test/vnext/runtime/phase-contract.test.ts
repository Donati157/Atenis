// test/vnext/runtime/phase-contract.test.ts
//
// Fase 2B.7: enforcement de contrato de fase por Runtime (não Critic).

import { describe, it, expect } from "vitest"
import { checkPhaseContract } from "../../../lib/vnext/runtime/phase-contract"
import type { StructuredResponse } from "../../../lib/vnext/schema/epistemic"

function emptyReply(): StructuredResponse {
  return {
    claims: [],
    evidences: [],
    sources: [],
    analyses: [],
    reviews: [],
    detectedConflicts: [],
    primaryTakeaway: "algo",
    nextStep: "próximo",
    meta: {
      generatedAt: "2026-08-14T00:00:00.000Z",
      modelName: "test:v1",
      turnId: "t-1",
    },
  }
}

function replyWithClaim(): StructuredResponse {
  return {
    ...emptyReply(),
    claims: [
      {
        id: "c1",
        text: "hipótese sobre o aluno",
        type: "hypothesis",
        assertionLevel: "tentative",
        evidenceIds: [],
      },
    ],
  }
}

describe("checkPhaseContract — diagnose", () => {
  it("reply SEM claims em diagnose → violação (contrato exige ≥1 claim)", () => {
    const v = checkPhaseContract("diagnose", emptyReply())
    expect(v).not.toBeNull()
    expect(v?.hint.issueCode).toBe("MISSING_DIAGNOSTIC_CLAIM")
    expect(v?.hint.priority).toBe("high")
    expect(v?.hint.location).toBe("claims")
  })

  it("reply COM ≥1 claim em diagnose → OK (sem violação)", () => {
    const v = checkPhaseContract("diagnose", replyWithClaim())
    expect(v).toBeNull()
  })

  it("hint menciona explicitamente hypothesis+tentative como saída válida", () => {
    const v = checkPhaseContract("diagnose", emptyReply())
    expect(v?.hint.hint).toMatch(/hypothesis/)
    expect(v?.hint.hint).toMatch(/tentative/)
  })
})

describe("checkPhaseContract — teach", () => {
  it("reply SEM claims em teach → violação", () => {
    const v = checkPhaseContract("teach", emptyReply())
    expect(v).not.toBeNull()
    expect(v?.hint.issueCode).toBe("MISSING_TEACH_CLAIM")
    expect(v?.hint.priority).toBe("high")
  })

  it("reply COM ≥1 claim em teach → OK", () => {
    const v = checkPhaseContract("teach", replyWithClaim())
    expect(v).toBeNull()
  })
})

describe("checkPhaseContract — practice/verify (sem cardinalidade mínima)", () => {
  it("reply vazio em practice → OK (apresentar questão e parar é legítimo)", () => {
    expect(checkPhaseContract("practice", emptyReply())).toBeNull()
  })

  it("reply vazio em verify → OK (Evaluator julga; comentário do processo é opcional)", () => {
    expect(checkPhaseContract("verify", emptyReply())).toBeNull()
  })
})

describe("checkPhaseContract — fases não generativas (nunca chegam aqui)", () => {
  it("evaluate/adapt/ready/abort caem no default (retorna null)", () => {
    for (const phase of ["evaluate", "adapt", "ready", "abort"] as const) {
      expect(checkPhaseContract(phase, emptyReply())).toBeNull()
    }
  })
})
