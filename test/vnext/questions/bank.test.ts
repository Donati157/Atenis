// test/vnext/questions/bank.test.ts
//
// C. registrar Question
// D. Question exige metadata mínima
// E. recuperar por topic
// F. recuperar por grade
// G. recuperar por tipo
// H. recuperar por skill
// I. Middle/High distinguidos
// J. Question com sourceId válida é aceita
// K (parte): Question com sourceId inválida é REJEITADA

import { describe, it, expect } from "vitest"
import {
  InMemoryQuestionBank,
  QuestionBankError,
  type Question,
} from "../../../lib/vnext/questions"
import { InMemorySourceRegistry } from "../../../lib/vnext/knowledge"

function baseQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
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
    questionType: "diagnostic",
    usableInPhases: ["diagnose"],
    prerequisites: [],
    expectedAnswer: {
      kind: "short-answer",
      acceptedAnswers: ["sim"],
      caseSensitive: false,
    },
    commonErrors: [],
    sourceId: null,
    createdAt: "2026-08-11T00:00:00.000Z",
    ...overrides,
  }
}

describe("C. registrar Question válida", () => {
  it("aceita e retorna deep copy", async () => {
    const bank = new InMemoryQuestionBank()
    const q = await bank.register(baseQuestion())
    expect(q.id).toBe("q1")
    // mutar retorno não afeta bank
    q.question = "MUTATED"
    const stored = await bank.getById("q1")
    expect(stored?.question).not.toBe("MUTATED")
  })
})

describe("D. metadata mínima obrigatória", () => {
  it("faltando skill → erro", async () => {
    const bank = new InMemoryQuestionBank()
    const bad = { ...baseQuestion(), skill: "" }
    await expect(bank.register(bad)).rejects.toBeInstanceOf(QuestionBankError)
  })
  it("questionType inválido → erro", async () => {
    const bank = new InMemoryQuestionBank()
    const bad = { ...baseQuestion(), questionType: "review" as never }
    await expect(bank.register(bad)).rejects.toBeInstanceOf(QuestionBankError)
  })
  it("usableInPhases vazio → erro", async () => {
    const bank = new InMemoryQuestionBank()
    const bad = { ...baseQuestion(), usableInPhases: [] }
    await expect(bank.register(bad)).rejects.toBeInstanceOf(QuestionBankError)
  })
  it("id duplicado → erro", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(baseQuestion())
    await expect(bank.register(baseQuestion())).rejects.toBeInstanceOf(
      QuestionBankError,
    )
  })
})

describe("E. F. G. H. findBy — filtros", () => {
  async function seed(bank: InMemoryQuestionBank) {
    await bank.register(
      baseQuestion({ id: "q-diag", questionType: "diagnostic" }),
    )
    await bank.register(
      baseQuestion({
        id: "q-prac",
        questionType: "practice",
        usableInPhases: ["practice"],
        difficulty: "medium",
      }),
    )
    await bank.register(
      baseQuestion({
        id: "q-veri",
        questionType: "verification",
        usableInPhases: ["verify"],
        difficulty: "hard",
      }),
    )
    await bank.register(
      baseQuestion({
        id: "q-8-mid",
        grade: "8",
        schoolStage: "middle",
        skill: "EF08MA13",
      }),
    )
  }

  it("E. filtra por topic", async () => {
    const bank = new InMemoryQuestionBank()
    await seed(bank)
    const rows = await bank.findBy({ topic: "funcao-quadratica" })
    expect(rows.length).toBe(4)
  })

  it("F. filtra por grade", async () => {
    const bank = new InMemoryQuestionBank()
    await seed(bank)
    const em01 = await bank.findBy({ grade: "EM01" })
    expect(em01.every((q) => q.grade === "EM01")).toBe(true)
    const g8 = await bank.findBy({ grade: "8" })
    expect(g8.map((q) => q.id)).toEqual(["q-8-mid"])
  })

  it("G. filtra por questionType", async () => {
    const bank = new InMemoryQuestionBank()
    await seed(bank)
    const prac = await bank.findBy({ questionType: "practice" })
    expect(prac.map((q) => q.id)).toEqual(["q-prac"])
  })

  it("G'. filtra por phase via usableInPhases", async () => {
    const bank = new InMemoryQuestionBank()
    await seed(bank)
    const verify = await bank.findBy({ phase: "verify" })
    expect(verify.map((q) => q.id)).toEqual(["q-veri"])
  })

  it("H. filtra por skill", async () => {
    const bank = new InMemoryQuestionBank()
    await seed(bank)
    const rows = await bank.findBy({ skill: "EF08MA13" })
    expect(rows.map((q) => q.id)).toEqual(["q-8-mid"])
  })

  it("I. filtra por schoolStage (middle vs high)", async () => {
    const bank = new InMemoryQuestionBank()
    await seed(bank)
    const middle = await bank.findBy({ schoolStage: "middle" })
    const high = await bank.findBy({ schoolStage: "high" })
    expect(middle.map((q) => q.id)).toEqual(["q-8-mid"])
    expect(high.length).toBe(3)
  })

  it("default exclui retired", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(baseQuestion({ id: "q-alive", status: "verified" }))
    await bank.register(baseQuestion({ id: "q-dead", status: "retired" }))
    const rows = await bank.findBy({})
    expect(rows.map((q) => q.id)).toEqual(["q-alive"])
    const withRetired = await bank.findBy({ status: "retired" })
    expect(withRetired.map((q) => q.id)).toEqual(["q-dead"])
  })
})

describe("J. K. integração com SourceRegistry", () => {
  it("J. Question com sourceId válida é aceita", async () => {
    const reg = new InMemorySourceRegistry()
    await reg.register({
      id: "src-1",
      type: "textbook",
      title: "t",
      authorityTier: "textbook",
      retrievedAt: "2026-08-11T00:00:00.000Z",
      provenance: { status: "unverified", verificationMethod: "none" },
      subjects: ["matematica"],
      grades: ["EM01"],
      topics: ["funcao-quadratica"],
      curatedAt: "2026-08-11T00:00:00.000Z",
      curatedBy: "curator",
    })
    const bank = new InMemoryQuestionBank(reg)
    const q = await bank.register(baseQuestion({ sourceId: "src-1" }))
    expect(q.sourceId).toBe("src-1")
  })

  it("K. Question com sourceId INVÁLIDA é REJEITADA (não silenciosa)", async () => {
    const reg = new InMemorySourceRegistry()
    const bank = new InMemoryQuestionBank(reg)
    await expect(
      bank.register(baseQuestion({ sourceId: "src-fantasma" })),
    ).rejects.toBeInstanceOf(QuestionBankError)
  })

  it("K'. mensagem de erro cita sourceId ausente", async () => {
    const reg = new InMemorySourceRegistry()
    const bank = new InMemoryQuestionBank(reg)
    try {
      await bank.register(baseQuestion({ sourceId: "src-fantasma" }))
      throw new Error("should have thrown")
    } catch (err) {
      const e = err as QuestionBankError
      expect(e.code).toBe("SOURCE_NOT_FOUND")
      expect(e.message).toContain("src-fantasma")
    }
  })
})
