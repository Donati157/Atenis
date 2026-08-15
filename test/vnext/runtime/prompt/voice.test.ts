// test/vnext/runtime/prompt/voice.test.ts
//
// Fase 2B.6.1: PROMPT_VOICE agora é constante inline compacta (~500 tokens),
// não mais derivada de sanitização do VOICE_PROMPT legado. Adaptação por
// idade migrou pra grade-context.ts; pedagogia genérica migrou pra
// phase-goal.ts.

import { describe, it, expect } from "vitest"
import { PROMPT_VOICE } from "../../../../lib/vnext/runtime/prompt/voice"

describe("PROMPT_VOICE — versão compacta 2B.6.1", () => {
  it("é curto (<= 2500 chars) — meta de redução", () => {
    expect(PROMPT_VOICE.length).toBeLessThanOrEqual(2500)
  })

  it("mantém a headline VOZ E PERSONA", () => {
    expect(PROMPT_VOICE).toContain("VOZ E PERSONA")
  })

  it("mantém regra 'você'/persona (TOM E PERSONALIDADE)", () => {
    expect(PROMPT_VOICE).toContain("TOM E PERSONALIDADE")
    expect(PROMPT_VOICE).toMatch(/Trate o aluno por.*você/i)
  })

  it("mantém aviso anti-clichê de IA", () => {
    expect(PROMPT_VOICE).toMatch(/Como assistente|modelo de linguagem/i)
  })

  it("mantém regra UMA pergunta por vez", () => {
    expect(PROMPT_VOICE).toMatch(/UMA pergunta por vez/i)
  })

  it("NÃO menciona google_search (Gemini já removido)", () => {
    expect(PROMPT_VOICE).not.toMatch(/google_search|googleSearch/i)
  })

  it("NÃO duplica adaptação por idade (migrou pra grade-context)", () => {
    // Não deve mencionar faixas específicas — grade-context faz isso.
    expect(PROMPT_VOICE).not.toContain("6º–7º ano")
    expect(PROMPT_VOICE).not.toContain("12º ano")
  })

  it("NÃO duplica pedagogia genérica de fase (migrou pra phase-goal)", () => {
    // Não deve mencionar diagnose/teach/practice/verify — phase-goal
    // faz isso.
    expect(PROMPT_VOICE).not.toContain("diagnose")
    expect(PROMPT_VOICE).not.toContain("teach")
    expect(PROMPT_VOICE).not.toContain("practice")
    expect(PROMPT_VOICE).not.toContain("verify")
  })
})
