// test/vnext/misconceptions/catalog-integrity.test.ts
//
// F. Question com commonError.code desconhecido é REJEITADA no registro
//    quando misconceptionRegistry é passado ao bank.

import { describe, it, expect } from "vitest"
import { InMemorySourceRegistry } from "../../../lib/vnext/knowledge"
import {
  InMemoryQuestionBank,
  QuestionBankError,
  type Question,
} from "../../../lib/vnext/questions"
import {
  InMemoryMisconceptionRegistry,
  QUADRATICA_MISCONCEPTIONS,
} from "../../../lib/vnext/misconceptions"
import {
  QUADRATICA_QUESTIONS,
  loadQuadraticaDataset,
} from "../../../lib/vnext/datasets/matematica-funcao-quadratica"

function baseQ(over: Partial<Question> = {}): Question {
  return {
    id: "q",
    version: 1,
    status: "verified",
    question: "?",
    subject: "matematica",
    grade: "EM01",
    schoolStage: "high",
    topic: "funcao-quadratica",
    skill: "EM13MAT302",
    difficulty: "easy",
    cognitiveDepth: "understand",
    questionType: "practice",
    usableInPhases: ["practice"],
    prerequisites: [],
    expectedAnswer: {
      kind: "short-answer",
      acceptedAnswers: ["ok"],
      caseSensitive: false,
    },
    commonErrors: [],
    sourceId: null,
    epistemicRole: "authored-by-atenis",
    createdAt: "2026-08-11T00:00:00.000Z",
    ...over,
  }
}

describe("F. commonErrors.code validado contra registry", () => {
  it("Question com code CONHECIDO passa", async () => {
    const mreg = new InMemoryMisconceptionRegistry()
    await mreg.registerAll(QUADRATICA_MISCONCEPTIONS)
    const bank = new InMemoryQuestionBank(undefined, mreg)
    const q = baseQ({
      commonErrors: [
        { code: "sign-confusion-b", description: "conhecido" },
      ],
    })
    await bank.register(q)
    expect(await bank.getById("q")).not.toBeNull()
  })

  it("Question com code DESCONHECIDO é REJEITADA", async () => {
    const mreg = new InMemoryMisconceptionRegistry()
    await mreg.registerAll(QUADRATICA_MISCONCEPTIONS)
    const bank = new InMemoryQuestionBank(undefined, mreg)
    const q = baseQ({
      commonErrors: [
        { code: "inventado-nao-existe", description: "?" },
      ],
    })
    try {
      await bank.register(q)
      throw new Error("should have thrown")
    } catch (err) {
      const e = err as QuestionBankError
      expect(e).toBeInstanceOf(QuestionBankError)
      expect(e.code).toBe("UNKNOWN_COMMON_ERROR_CODE")
      expect(e.message).toContain("inventado-nao-existe")
    }
  })

  it("Sem registry, bank aceita qualquer code (compat retro)", async () => {
    const bank = new InMemoryQuestionBank() // sem registry
    const q = baseQ({
      commonErrors: [
        { code: "qualquer-coisa", description: "?" },
      ],
    })
    await bank.register(q) // não lança
    expect(await bank.getById("q")).not.toBeNull()
  })

  it("Dataset quadratica: todos os commonError codes existem no catálogo", async () => {
    const catalogCodes = new Set(QUADRATICA_MISCONCEPTIONS.map((m) => m.id))
    for (const q of QUADRATICA_QUESTIONS) {
      for (const ce of q.commonErrors) {
        expect(catalogCodes.has(ce.code)).toBe(true)
      }
    }
  })

  it("Dataset quadratica: loadQuadraticaDataset com registry passa (strict)", async () => {
    const mreg = new InMemoryMisconceptionRegistry()
    const sreg = new InMemorySourceRegistry()
    const bank = new InMemoryQuestionBank(sreg, mreg)
    const { misconceptions, questions } = await loadQuadraticaDataset(
      sreg,
      bank,
      mreg,
    )
    expect(misconceptions).toBe(QUADRATICA_MISCONCEPTIONS.length)
    expect(questions).toBe(QUADRATICA_QUESTIONS.length)
  })
})
