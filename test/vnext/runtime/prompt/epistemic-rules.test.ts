// test/vnext/runtime/prompt/epistemic-rules.test.ts
//
// Garante que EPISTEMIC_RULES cita as 8 regras Critic. Se alguém remover
// a menção a uma regra, esse teste falha — evita regressão silenciosa.

import { describe, it, expect } from "vitest"
import { EPISTEMIC_RULES } from "../../../../lib/vnext/runtime/prompt/epistemic-rules"

describe("EPISTEMIC_RULES — cobertura das 8 regras Critic", () => {
  it("menciona integridade referencial por ID (schema-integrity)", () => {
    expect(EPISTEMIC_RULES).toMatch(/integridade referencial|sourceId|evidenceIds/i)
  })

  it("menciona evidence-coverage (Claim factual precisa de Evidence)", () => {
    expect(EPISTEMIC_RULES).toMatch(/Claim factual tem Evidence|associe ao menos uma Evidence/i)
  })

  it("menciona factual-support (Evidence forte/moderada)", () => {
    expect(EPISTEMIC_RULES).toMatch(/supportStrength.*strong|supportStrength.*moderate/s)
  })

  it("menciona regra anti-fabricação de URL/DOI/ISBN (source-authority + provenance)", () => {
    expect(EPISTEMIC_RULES).toMatch(/URL.*DOI|DOI|ISBN|generated/i)
  })

  it("menciona positivamente 'source.type=generated' como opção honesta", () => {
    expect(EPISTEMIC_RULES).toContain("generated")
  })

  it("menciona regra sobre provenance.status verified (responsabilidade externa)", () => {
    expect(EPISTEMIC_RULES).toMatch(/provenance\.status.*verified|verificação por humano/i)
  })

  it("menciona analysis-not-repetition (Analysis interpreta, não repete)", () => {
    expect(EPISTEMIC_RULES).toMatch(/Analysis interpreta|paráfrase/i)
  })

  it("regra 6 desambigua: permissão de analyses:[] NÃO generaliza pra claims/evidences/sources (Fase 2B.6.4)", () => {
    // Explícita: analyses é o ÚNICO array que pode ficar vazio
    expect(EPISTEMIC_RULES).toMatch(/único array|Essa\s*permissão\s*NÃO se generaliza/i)
    // Cita claims/evidences/sources como devendo refletir substância
    expect(EPISTEMIC_RULES).toMatch(/claims.*evidences.*sources|substância do turno/i)
    // Fecha rota de fuga
    expect(EPISTEMIC_RULES).toMatch(/todos os arrays vazios.*falha|falha do turno/i)
  })

  it("menciona source-conflict (declarar conflitos em detectedConflicts)", () => {
    expect(EPISTEMIC_RULES).toContain("detectedConflicts")
  })

  it("menciona primaryTakeaway/nextStep obrigatórios e específicos", () => {
    expect(EPISTEMIC_RULES).toContain("primaryTakeaway")
    expect(EPISTEMIC_RULES).toContain("nextStep")
  })

  it("orienta usar hedged/tentative se dúvida (não fingir certeza)", () => {
    expect(EPISTEMIC_RULES).toMatch(/hedged|tentative/)
  })
})

describe("EPISTEMIC_RULES — Fase 2B.6.3: instruções mínimas de shape", () => {
  it("indica que meta NÃO é responsabilidade do LLM (server preenche)", () => {
    expect(EPISTEMIC_RULES).toMatch(/meta.*não é sua responsabilidade|server preenche/i)
  })

  it("orienta explicitamente NÃO incluir o campo meta no output", () => {
    expect(EPISTEMIC_RULES).toMatch(/Não inclua o campo `meta`|não inclua.*meta/i)
  })

  it("cita retrievedAt como responsabilidade do server (Fase 2B.7)", () => {
    expect(EPISTEMIC_RULES).toMatch(/retrievedAt.*(INFRAESTRUTURA|server preenche|pode omitir)/i)
  })

  it("cita publishedAt como opcional com regra 'omita a chave se não conhecer'", () => {
    expect(EPISTEMIC_RULES).toContain("publishedAt")
    expect(EPISTEMIC_RULES).toMatch(/opcional/i)
    expect(EPISTEMIC_RULES).toMatch(/omita a chave|omita/i)
  })

  it("proíbe explicitamente string vazia ou placeholder em publishedAt", () => {
    expect(EPISTEMIC_RULES).toMatch(/string vazia|""/)
    expect(EPISTEMIC_RULES).toMatch(/placeholder|"unknown"|"n\/a"/i)
  })
})

describe("EPISTEMIC_RULES — Fase 2B.7: sources.type vs authorityTier + url", () => {
  it("distingue source.type (origem física) de source.authorityTier (credibilidade)", () => {
    expect(EPISTEMIC_RULES).toMatch(/origem física da informação/i)
    expect(EPISTEMIC_RULES).toMatch(/credibilidade da fonte/i)
  })

  it("lista valores permitidos de source.type", () => {
    expect(EPISTEMIC_RULES).toContain('"primary"')
    expect(EPISTEMIC_RULES).toContain('"secondary"')
    expect(EPISTEMIC_RULES).toContain('"official"')
    expect(EPISTEMIC_RULES).toContain('"textbook"')
    expect(EPISTEMIC_RULES).toContain('"web"')
    expect(EPISTEMIC_RULES).toContain('"generated"')
  })

  it("lista valores permitidos de authorityTier", () => {
    expect(EPISTEMIC_RULES).toContain('"primary-official"')
    expect(EPISTEMIC_RULES).toContain('"academic"')
    expect(EPISTEMIC_RULES).toContain('"web-recognized"')
    expect(EPISTEMIC_RULES).toContain('"user-provided"')
  })

  it("regra prática: type=generated implica OMITIR url", () => {
    expect(EPISTEMIC_RULES).toMatch(/type.*generated/i)
    expect(EPISTEMIC_RULES).toMatch(/OMITA a chave.*url|OMITA.*url/i)
  })

  it("proíbe URL placeholder / example.com", () => {
    expect(EPISTEMIC_RULES).toMatch(/placeholder|example\.com/i)
  })
})
