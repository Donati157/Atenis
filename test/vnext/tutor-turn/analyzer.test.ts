// test/vnext/tutor-turn/analyzer.test.ts

import { describe, it, expect } from "vitest"
import { analyzeTurn } from "../../../lib/vnext/tutor-turn"
import type { TutorTurnOutput } from "../../../lib/vnext/tutor-turn/schema"

function goodOutput(over: Partial<TutorTurnOutput> = {}): TutorTurnOutput {
  return {
    explanation:
      "A função quadrática tem a forma f(x)=ax²+bx+c com a diferente de zero. Isso significa que sempre há um termo em x² não nulo, e o gráfico é uma parábola.",
    suggestedNextAction: "invite-attempt",
    followUpQuestion: {
      text: "Tente identificar a, b e c em f(x)=2x²-4x+1.",
      kind: "practice",
    },
    uncertaintyMarkers: [],
    meta: { generatedAt: "2026-08-11T14:00:00.000Z" },
    ...over,
  }
}

describe("schema-invalid input", () => {
  it("payload não-shape → SCHEMA_INVALID + reject", () => {
    const r = analyzeTurn({ nothing: true })
    expect(r.recommendedAction).toBe("reject")
    expect(r.issues[0].code).toBe("SCHEMA_INVALID")
  })
})

describe("output válido e limpo", () => {
  it("accept sem issues", () => {
    const r = analyzeTurn(goodOutput())
    expect(r.recommendedAction).toBe("accept")
    expect(r.issues.filter((i) => i.severity === "error")).toEqual([])
  })
})

describe("schemaShapeRule", () => {
  it("check-understanding sem followUpQuestion → warn", () => {
    const r = analyzeTurn(
      goodOutput({
        suggestedNextAction: "check-understanding",
        followUpQuestion: undefined,
      }),
    )
    expect(r.recommendedAction).toBe("accept")
    expect(r.issues.some((i) => i.code === "action-without-question")).toBe(true)
  })

  it("check-understanding com followUpQuestion.kind=verification → warn", () => {
    const r = analyzeTurn(
      goodOutput({
        suggestedNextAction: "check-understanding",
        followUpQuestion: { text: "?", kind: "verification" },
      }),
    )
    expect(
      r.issues.some((i) => i.code === "action-question-kind-mismatch"),
    ).toBe(true)
  })

  it("invite-attempt com followUpQuestion.kind=verification → warn", () => {
    const r = analyzeTurn(
      goodOutput({
        followUpQuestion: { text: "?", kind: "verification" },
      }),
    )
    expect(
      r.issues.some((i) => i.code === "action-question-kind-mismatch"),
    ).toBe(true)
  })

  it("escalate sem analysis → error com suggestion → refine", () => {
    const r = analyzeTurn(
      goodOutput({
        suggestedNextAction: "escalate",
        analysis: undefined,
      }),
    )
    expect(r.recommendedAction).toBe("refine")
    expect(
      r.issues.some((i) => i.code === "escalate-without-analysis"),
    ).toBe(true)
    // refinementHints incluem a operação sugerida
    expect(r.refinementHints.length).toBeGreaterThan(0)
  })
})

describe("uncertaintyNeedsAnalysisRule", () => {
  it("uncertaintyMarkers sem analysis → warn", () => {
    const r = analyzeTurn(
      goodOutput({
        uncertaintyMarkers: [
          { what: "algo", reason: "não sei" },
        ],
        analysis: undefined,
      }),
    )
    expect(
      r.issues.some((i) => i.code === "uncertainty-without-analysis"),
    ).toBe(true)
    expect(r.recommendedAction).toBe("accept") // warn não bloqueia
  })

  it("uncertaintyMarkers com analysis → passa", () => {
    const r = analyzeTurn(
      goodOutput({
        uncertaintyMarkers: [
          { what: "algo", reason: "não sei" },
        ],
        analysis: "Segui com material padrão apesar da incerteza.",
      }),
    )
    expect(
      r.issues.some((i) => i.code === "uncertainty-without-analysis"),
    ).toBe(false)
  })
})

describe("explanationSubstanceRule", () => {
  it("explanation muito curta → warn", () => {
    const r = analyzeTurn(goodOutput({ explanation: "curta" }))
    expect(
      r.issues.some((i) => i.code === "explanation-too-short"),
    ).toBe(true)
  })
})
