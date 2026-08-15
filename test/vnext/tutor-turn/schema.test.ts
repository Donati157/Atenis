// test/vnext/tutor-turn/schema.test.ts
//
// F. schema Zod aceita output válido.
// G. output inválido falha na validação.

import { describe, it, expect } from "vitest"
import {
  tutorTurnOutputSchema,
  type TutorTurnOutput,
} from "../../../lib/vnext/tutor-turn/schema"

function baseOutput(over: Partial<TutorTurnOutput> = {}): TutorTurnOutput {
  return {
    explanation:
      "A função quadrática tem a forma f(x)=ax²+bx+c com a diferente de zero.",
    suggestedNextAction: "invite-attempt",
    uncertaintyMarkers: [],
    meta: {
      generatedAt: "2026-08-11T14:00:00.000Z",
    },
    ...over,
  }
}

describe("F. tutorTurnOutputSchema aceita output válido", () => {
  it("output mínimo passa", () => {
    expect(tutorTurnOutputSchema.safeParse(baseOutput()).success).toBe(true)
  })

  it("aceita followUpQuestion opcional", () => {
    const out = baseOutput({
      followUpQuestion: {
        text: "Qual é o valor de a em f(x)=2x²-3x+1?",
        kind: "practice",
      },
    })
    expect(tutorTurnOutputSchema.safeParse(out).success).toBe(true)
  })

  it("aceita analysis e uncertaintyMarkers preenchidos", () => {
    const out = baseOutput({
      analysis: "Optei por exemplo trabalhado antes de perguntar.",
      uncertaintyMarkers: [
        {
          what: "Se o aluno já domina notação de função",
          reason: "State não indica interações prévias sobre notação",
        },
      ],
    })
    expect(tutorTurnOutputSchema.safeParse(out).success).toBe(true)
  })
})

describe("G. output inválido falha na validação", () => {
  it("suggestedNextAction inválida", () => {
    const out = {
      ...baseOutput(),
      suggestedNextAction: "invented-action",
    }
    expect(tutorTurnOutputSchema.safeParse(out).success).toBe(false)
  })

  it("explanation vazia", () => {
    const out = baseOutput({ explanation: "" })
    expect(tutorTurnOutputSchema.safeParse(out).success).toBe(false)
  })

  it("followUpQuestion sem text", () => {
    const out = {
      ...baseOutput(),
      followUpQuestion: { kind: "practice" },
    }
    expect(tutorTurnOutputSchema.safeParse(out).success).toBe(false)
  })

  it("uncertaintyMarkers acima do limite", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      what: `x${i}`,
      reason: `y${i}`,
    }))
    const out = baseOutput({ uncertaintyMarkers: many })
    expect(tutorTurnOutputSchema.safeParse(out).success).toBe(false)
  })

  it("meta.generatedAt ausente", () => {
    const out = {
      ...baseOutput(),
      meta: {},
    }
    expect(tutorTurnOutputSchema.safeParse(out).success).toBe(false)
  })
})
