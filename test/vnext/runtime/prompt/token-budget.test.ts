// test/vnext/runtime/prompt/token-budget.test.ts
//
// Smoke offline de TAMANHO dos prompts. Testa 6 cenários combinados e
// valida orçamento total via aproximação chars/4 ≈ tokens.
//
// Metas Fase 2B.6.2 (após adição de regras de shape para meta/retrievedAt/publishedAt):
//   - Cenário mínimo (voice + rules + grade-context + phase): < 1500 tokens
//   - Com CONTEXT (subject-focus adicionado): < 1600 tokens
//   - Com QUESTION do bank: < 1900 tokens
//   - Com EVENT do aluno: < 2000 tokens
//   - Com REFINEMENT feedback: < 2100 tokens
//   - CENÁRIO COMPLETO (todos os fragmentos): < 2500 tokens
//
// Aumento vs. 2B.6.1: ~250 tokens (bloco CAMPOS DE SHAPE em EPISTEMIC_RULES).
// Mantém margem folgada sob a meta principal (< 3k tokens total, incluindo
// ~1000 tokens de schema injetado pelo SDK).
//
// Reduções acumuladas desde stub Fase 1:
//   - VOICE reescrito compacto (~500 tokens vs. ~3150 legados)
//   - EPISTEMIC_RULES em bullets afirmativos + shape (~550 tokens)
//   - PHASE_GOAL sem pedagogia duplicada com VOICE (~150 tokens por fase)
//
// Isso não substitui contagem real por tokenizer — é sinal de teto.

import { describe, it, expect } from "vitest"
import { composeGenerationRequest } from "../../../../lib/vnext/runtime/prompt-composer"
import { newTopicState } from "../../../../lib/vnext/learning/types"
import type { Question } from "../../../../lib/vnext/questions/types"

const CHARS_PER_TOKEN = 4 // aproximação — não usar pra billing

function estimateTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

function totalSystemChars(messages: Array<{ role: string; content: string }>): number {
  return messages
    .filter((m) => m.role === "system")
    .reduce((sum, m) => sum + m.content.length, 0)
}

function baseState(overrides: Partial<Parameters<typeof newTopicState>[0]> = {}) {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-14T00:00:00.000Z",
    ...overrides,
  })
}

const baseQuestion: Question = {
  id: "q1",
  version: 1,
  status: "verified",
  question: "Enunciado curto.",
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
  expectedAnswer: { kind: "numeric", value: 42 },
  commonErrors: [],
  sourceId: null,
  epistemicRole: "authored-by-atenis",
  createdAt: "2026-08-14T00:00:00.000Z",
} as Question

describe("prompt token budget — cenários", () => {
  it("MINIMAL — sem context, sem question, sem event, sem feedback", () => {
    const req = composeGenerationRequest({
      phase: "diagnose",
      state: baseState(),
      message: "?",
      event: null,
    })
    const tokens = estimateTokens(totalSystemChars(req.messages))
    expect(tokens).toBeLessThan(2100)
  })

  it("COM CONTEXT — subject/grade/schoolStage", () => {
    const st = baseState()
    st.context = { subject: "matematica", grade: "EM01", schoolStage: "high" }
    const req = composeGenerationRequest({
      phase: "teach",
      state: st,
      message: "?",
      event: null,
    })
    const tokens = estimateTokens(totalSystemChars(req.messages))
    expect(tokens).toBeLessThan(2000)
  })

  it("COM QUESTION do bank", () => {
    const st = baseState()
    st.context = { subject: "matematica", grade: "EM01", schoolStage: "high" }
    const req = composeGenerationRequest({
      phase: "practice",
      state: st,
      message: "?",
      event: null,
      selectedQuestion: baseQuestion,
    })
    const tokens = estimateTokens(totalSystemChars(req.messages))
    expect(tokens).toBeLessThan(2300)
  })

  it("COM EVENT do aluno", () => {
    const st = baseState()
    st.context = { subject: "matematica", grade: "EM01", schoolStage: "high" }
    const req = composeGenerationRequest({
      phase: "practice",
      state: st,
      message: "tentei",
      event: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "tentativa curta do aluno",
      },
      selectedQuestion: baseQuestion,
    })
    const tokens = estimateTokens(totalSystemChars(req.messages))
    expect(tokens).toBeLessThan(2400)
  })

  it("COM REFINEMENT feedback", () => {
    const st = baseState()
    st.context = { subject: "matematica", grade: "EM01", schoolStage: "high" }
    const req = composeGenerationRequest({
      phase: "teach",
      state: st,
      message: "?",
      event: null,
      selectedQuestion: baseQuestion,
      feedback: [
        {
          issueCode: "WEAK_SUPPORT_FOR_FACT",
          location: "claims.0",
          operation: "add-evidence",
          hint: "Adicione Evidence com trecho literal da BNCC.",
          priority: "high",
        },
        {
          issueCode: "ANALYSIS_TOO_SIMILAR",
          location: "analyses.1",
          operation: "rewrite-analysis",
          hint: "Reescreva pra interpretar, não repetir.",
          priority: "medium",
        },
      ],
    })
    const tokens = estimateTokens(totalSystemChars(req.messages))
    expect(tokens).toBeLessThan(2500)
  })

  it("CENÁRIO COMPLETO (todos os fragmentos)", () => {
    const st = baseState()
    st.context = { subject: "matematica", grade: "EM01", schoolStage: "high" }
    const req = composeGenerationRequest({
      phase: "practice",
      state: st,
      message: "tentei mas travei",
      event: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "trecho da tentativa",
      },
      selectedQuestion: baseQuestion,
      feedback: [
        {
          issueCode: "WEAK_SUPPORT_FOR_FACT",
          location: "claims.0",
          operation: "add-evidence",
          hint: "Adicione Evidence forte.",
          priority: "high",
        },
      ],
    })
    const tokens = estimateTokens(totalSystemChars(req.messages))
    // Teto do cenário máximo
    expect(tokens).toBeLessThan(2500)
    // eslint-disable-next-line no-console
    console.log(
      `[prompt-budget] cenário completo ≈ ${tokens} tokens (chars=${totalSystemChars(req.messages)})`,
    )
  })
})
