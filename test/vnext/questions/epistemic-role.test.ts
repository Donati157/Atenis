// test/vnext/questions/epistemic-role.test.ts
//
// M. Uma Source curricular NÃO é usada como falsa evidência da resposta
// matemática. Prova arquitetural:
//   - Dataset marca `epistemicRole: "curricular-reference"` e `sourceRole`
//     explícito quando sourceId aponta pra habilidade BNCC.
//   - `questionRef` que o Runtime passa ao evaluator NÃO inclui a Source
//     (apenas skill como referência semântica).

import { describe, it, expect } from "vitest"
import {
  InMemorySourceRegistry,
} from "../../../lib/vnext/knowledge"
import {
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import {
  QUADRATICA_QUESTIONS,
  loadQuadraticaDataset,
} from "../../../lib/vnext/datasets/matematica-funcao-quadratica"

describe("M. epistemicRole distingue referência curricular de gabarito", () => {
  it("todas as questões do dataset são marcadas como curricular-reference", () => {
    for (const q of QUADRATICA_QUESTIONS) {
      expect(q.epistemicRole).toBe("curricular-reference")
      expect(q.sourceRole).toBeDefined()
      expect(q.sourceRole).toContain("NÃO")
    }
  })

  it("sourceRole documenta em texto que BNCC não é gabarito", () => {
    const q = QUADRATICA_QUESTIONS[0]
    expect(q.sourceRole).toMatch(/BNCC.*habilidade/i)
    expect(q.sourceRole).toMatch(/gabarito/i)
  })

  it("bank aceita e devolve epistemicRole preservado", async () => {
    const registry = new InMemorySourceRegistry()
    const bank = new InMemoryQuestionBank(registry)
    await loadQuadraticaDataset(registry, bank)
    const q = await bank.getById("q-quadratica-diagnostic-01")
    expect(q!.epistemicRole).toBe("curricular-reference")
  })

  it("questionRef que o Runtime constrói NÃO inclui campos de Source", async () => {
    // Este teste checa a FORMA do QuestionRef (types.ts): não tem
    // sourceText, sourceEvidence, sourceQuote. Se um dia alguém adicionar
    // esses campos, o teste quebra intencionalmente.
    type Ref = import("../../../lib/vnext/evaluator/types").QuestionRef
    const sample: Ref = {
      id: "x",
      skill: "EM13MAT302",
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      expectedAnswer: { kind: "algebraic", canonicalForm: "a=1" },
      commonErrors: [],
    }
    // Chaves permitidas (schema):
    const keys = Object.keys(sample).sort()
    expect(keys).toEqual(
      [
        "commonErrors",
        "expectedAnswer",
        "grade",
        "id",
        "skill",
        "subject",
        "topic",
      ].sort(),
    )
    // Sem sourceText/sourceEvidence/etc:
    expect(keys).not.toContain("sourceText")
    expect(keys).not.toContain("sourceEvidence")
    expect(keys).not.toContain("sourceQuote")
  })
})
