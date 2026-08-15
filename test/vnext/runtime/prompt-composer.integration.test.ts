// test/vnext/runtime/prompt-composer.integration.test.ts
//
// Integração dos 7 fragmentos via composeGenerationRequest. Valida:
//   - useCase = "atenis.<phase>" (INVARIANTE — MockProvider chaveia)
//   - Camadas SEMPRE presentes: VOICE + EPISTEMIC_RULES + GRADE_CONTEXT + PHASE_GOAL
//   - Camadas condicionais aparecem quando input tem: subject/question/event/feedback
//   - user message só carrega mensagem do aluno (nada de metadata)

import { describe, it, expect } from "vitest"
import { composeGenerationRequest } from "../../../lib/vnext/runtime/prompt-composer"
import { REFINEMENT_HEADER } from "../../../lib/vnext/runtime/prompt/refinement-brief"
import { EVENT_HEADER } from "../../../lib/vnext/runtime/prompt/student-event-brief"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { Question } from "../../../lib/vnext/questions/types"

function baseState() {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-14T00:00:00.000Z",
  })
}

const q: Question = {
  id: "q1",
  version: 1,
  status: "verified",
  question: "Enunciado.",
  subject: "matematica",
  grade: "EM01",
  schoolStage: "high",
  topic: "quadratic",
  skill: "id-coef",
  difficulty: "easy",
  cognitiveDepth: "apply",
  questionType: "diagnostic",
  usableInPhases: ["diagnose"],
  prerequisites: [],
  expectedAnswer: { kind: "numeric", value: 999 },
  commonErrors: [],
  sourceId: null,
  epistemicRole: "authored-by-atenis",
  createdAt: "2026-08-14T00:00:00.000Z",
} as Question

describe("composeGenerationRequest — invariantes", () => {
  it("useCase = atenis.<phase> preservado", () => {
    for (const phase of ["diagnose", "teach", "practice", "verify"] as const) {
      const req = composeGenerationRequest({
        phase,
        state: baseState(),
        message: "?",
        event: null,
      })
      expect(req.useCase).toBe(`atenis.${phase}`)
    }
  })

  it("SEMPRE inclui VOICE, EPISTEMIC RULES, GRADE CONTEXT, PHASE GOAL", () => {
    const req = composeGenerationRequest({
      phase: "diagnose",
      state: baseState(),
      message: "?",
      event: null,
    })
    const sys = req.messages.find((m) => m.role === "system")!.content
    expect(sys).toContain("VOZ E PERSONA")
    expect(sys).toContain("REGRAS EPISTÊMICAS")
    expect(sys).toContain("CONTEXTO DO ALUNO")
    expect(sys).toContain("OBJETIVO DA FASE ATUAL")
  })

  it("inclui SUBJECT FOCUS quando context.subject presente", () => {
    const st = baseState()
    st.context = { subject: "matematica", grade: "EM01", schoolStage: "high" }
    const req = composeGenerationRequest({
      phase: "teach",
      state: st,
      message: "?",
      event: null,
    })
    const sys = req.messages.find((m) => m.role === "system")!.content
    expect(sys).toContain("FOCO DA MATÉRIA")
  })

  it("inclui QUESTION SELECIONADA quando selectedQuestion presente", () => {
    const req = composeGenerationRequest({
      phase: "practice",
      state: baseState(),
      message: "?",
      event: null,
      selectedQuestion: q,
    })
    const sys = req.messages.find((m) => m.role === "system")!.content
    expect(sys).toContain("QUESTÃO SELECIONADA DO BANCO")
    // Invariante — question brief NÃO vaza gabarito
    expect(sys).not.toContain("999")
  })

  it("inclui EVENT quando event presente", () => {
    const req = composeGenerationRequest({
      phase: "practice",
      state: baseState(),
      message: "tentei",
      event: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "abc",
      },
    })
    const sys = req.messages.find((m) => m.role === "system")!.content
    expect(sys).toContain(EVENT_HEADER)
  })

  it("inclui REFINEMENT header quando feedback presente", () => {
    const req = composeGenerationRequest({
      phase: "teach",
      state: baseState(),
      message: "?",
      event: null,
      feedback: [
        {
          issueCode: "X",
          location: "claims.0",
          operation: "add-evidence",
          hint: "Adicione evidence",
          priority: "high",
        },
      ],
    })
    const sys = req.messages.find((m) => m.role === "system")!.content
    expect(sys).toContain(REFINEMENT_HEADER)
    expect(sys).not.toContain("critic-feedback:")
  })

  it("SEM feedback NÃO inclui o header de refinement", () => {
    const req = composeGenerationRequest({
      phase: "teach",
      state: baseState(),
      message: "?",
      event: null,
    })
    const sys = req.messages.find((m) => m.role === "system")!.content
    expect(sys).not.toContain(REFINEMENT_HEADER)
  })

  it("user message só carrega a mensagem do aluno (sem metadata)", () => {
    const req = composeGenerationRequest({
      phase: "diagnose",
      state: baseState(),
      message: "minha dúvida específica",
      event: null,
    })
    const users = req.messages.filter((m) => m.role === "user")
    expect(users.length).toBe(1)
    expect(users[0].content).toBe("minha dúvida específica")
    expect(users[0].content).not.toContain("atenis-method-phase")
    expect(users[0].content).not.toContain("student-event")
  })

  it("mensagem vazia NÃO gera turn user (só system)", () => {
    const req = composeGenerationRequest({
      phase: "diagnose",
      state: baseState(),
      message: "   ",
      event: null,
    })
    expect(req.messages.filter((m) => m.role === "user").length).toBe(0)
  })

  it("fragmentos são separados por '\\n\\n---\\n\\n' (não colam)", () => {
    const req = composeGenerationRequest({
      phase: "diagnose",
      state: baseState(),
      message: "?",
      event: null,
    })
    const sys = req.messages.find((m) => m.role === "system")!.content
    expect(sys).toContain("\n\n---\n\n")
  })
})
