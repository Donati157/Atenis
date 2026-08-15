// test/vnext/schema/critic.test.ts

import { describe, it, expect } from "vitest"
import {
  criticReportSchema,
  issueSchema,
  suggestedFixSchema,
} from "../../../lib/vnext/schema/critic"

describe("schema/critic — Issue", () => {
  it("aceita issue completa com location", () => {
    const i = {
      code: "MISSING_EVIDENCE",
      category: "epistemic",
      severity: "error",
      message: "faltou evidence",
      location: "claims.0.evidenceIds",
      ruleId: "evidence-coverage",
    }
    expect(issueSchema.safeParse(i).success).toBe(true)
  })

  it("rejeita issue sem location", () => {
    const i = {
      code: "X",
      category: "epistemic",
      severity: "error",
      message: "m",
      ruleId: "r",
    }
    expect(issueSchema.safeParse(i).success).toBe(false)
  })

  it("aceita issue com suggestion opcional", () => {
    const i = {
      code: "X",
      category: "epistemic",
      severity: "error",
      message: "m",
      location: "claims.0",
      ruleId: "r",
      suggestion: {
        operation: "add-evidence",
        targetPath: "claims.0",
        hint: "adicione evidence",
      },
    }
    expect(issueSchema.safeParse(i).success).toBe(true)
  })

  it("rejeita severity fora do enum", () => {
    const i = {
      code: "X",
      category: "epistemic",
      severity: "critical",
      message: "m",
      location: "x",
      ruleId: "r",
    }
    expect(issueSchema.safeParse(i).success).toBe(false)
  })

  it("rejeita category=provenance mal escrito", () => {
    const i = {
      code: "X",
      category: "proveninance",
      severity: "warn",
      message: "m",
      location: "x",
      ruleId: "r",
    }
    expect(issueSchema.safeParse(i).success).toBe(false)
  })
})

describe("schema/critic — SuggestedFix", () => {
  it("aceita operation válida", () => {
    const s = {
      operation: "add-evidence",
      targetPath: "claims.0",
      hint: "adicione X",
    }
    expect(suggestedFixSchema.safeParse(s).success).toBe(true)
  })

  it("rejeita operation desconhecida", () => {
    const s = {
      operation: "delete-everything",
      targetPath: "x",
      hint: "y",
    }
    expect(suggestedFixSchema.safeParse(s).success).toBe(false)
  })
})

describe("schema/critic — CriticReport", () => {
  it("aceita report sem issues", () => {
    const r = {
      issues: [],
      checksExecuted: 0,
      checksFailed: 0,
      recommendedAction: "accept",
      actionReason: "vazio",
      refinementHints: [],
      ruleIdsRun: [],
    }
    expect(criticReportSchema.safeParse(r).success).toBe(true)
  })

  it("recommendedAction inclui 'refine'", () => {
    const r = {
      issues: [],
      checksExecuted: 1,
      checksFailed: 1,
      recommendedAction: "refine",
      actionReason: "x",
      refinementHints: [],
      ruleIdsRun: ["r"],
    }
    expect(criticReportSchema.safeParse(r).success).toBe(true)
  })

  it("NÃO tem campo checksPassedRatio (removido na Fase 0.1)", () => {
    const shape = criticReportSchema.shape
    expect("checksPassedRatio" in shape).toBe(false)
  })
})
