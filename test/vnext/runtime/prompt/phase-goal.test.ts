// test/vnext/runtime/prompt/phase-goal.test.ts
//
// Cada fase generativa (diagnose/teach/practice/verify) deve produzir
// bloco com termos-chave pedagógicos distintos. Se dois blocos ficarem
// iguais, este teste falha.

import { describe, it, expect } from "vitest"
import { buildPhaseGoal } from "../../../../lib/vnext/runtime/prompt/phase-goal"
import { newTopicState } from "../../../../lib/vnext/learning/types"

const state = newTopicState({
  studentId: "s1",
  topic: "quadratic",
  createdAt: "2026-08-14T00:00:00.000Z",
})

describe("buildPhaseGoal — cada fase tem semântica própria", () => {
  it("diagnose menciona DESCOBRIR/tarefa concreta/não pergunte 'você lembra?'", () => {
    const g = buildPhaseGoal("diagnose", state)
    expect(g).toContain("diagnose")
    expect(g).toMatch(/DESCOBRIR|descobrir/)
    expect(g).toMatch(/tarefa concreta|TAREFA CONCRETA/)
    expect(g).toMatch(/você lembra/)
  })

  it("diagnose EXIGE ao menos 1 claim (Fase 2B.6.4)", () => {
    const g = buildPhaseGoal("diagnose", state)
    expect(g).toMatch(/Resultado obrigatório|Ao menos 1 `claim`/)
    // Exigência afirmativa
    expect(g).toContain("Ao menos 1 `claim`")
    // Explicita a saída válida quando falta base
    expect(g).toMatch(/hypothesis/)
    expect(g).toMatch(/tentative/)
    // Fecha a rota de fuga
    expect(g).toMatch(/NÃO é output válido|Silêncio.*falha/)
  })

  it("teach menciona EXPLICAR/passo a passo", () => {
    const g = buildPhaseGoal("teach", state)
    expect(g).toContain("teach")
    expect(g).toMatch(/EXPLICAR|explicar/)
    expect(g).toMatch(/passo a passo/)
  })

  it("practice menciona AGUARDAR/tentativa vem primeiro", () => {
    const g = buildPhaseGoal("practice", state)
    expect(g).toContain("practice")
    expect(g).toMatch(/AGUARDAR|aguardar|AGUARDE/)
    expect(g).toMatch(/tentativa vem\s+primeiro|passo a passo antecipado atrapalha/s)
  })

  it("verify menciona Evaluator (aluno responde, Evaluator julga)", () => {
    const g = buildPhaseGoal("verify", state)
    expect(g).toContain("verify")
    expect(g).toContain("Evaluator")
  })

  it("inclui estado do tópico no bloco (ticks, mastery)", () => {
    const g = buildPhaseGoal("diagnose", state)
    expect(g).toContain("ticks=")
    expect(g).toContain("mastery=")
  })

  it("fase desconhecida cai no default sem lançar", () => {
    // MethodPhase inclui evaluate/adapt/ready/abort — o default cobre.
    const g = buildPhaseGoal("evaluate" as never, state)
    expect(g).toContain("evaluate")
  })
})
