// test/vnext/questions/selector.test.ts

import { describe, it, expect } from "vitest"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
  type Question,
} from "../../../lib/vnext/questions"

function baseQ(overrides: Partial<Question> = {}): Question {
  return {
    id: "q-x",
    version: 1,
    status: "verified",
    question: "?",
    subject: "matematica",
    grade: "EM01",
    schoolStage: "high",
    topic: "funcao-quadratica",
    skill: "EM13MAT302",
    difficulty: "medium",
    cognitiveDepth: "apply",
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
    createdAt: "2026-08-11T00:00:00.000Z",
    ...overrides,
  }
}

describe("DeterministicQuestionSelector — asc pra practice", () => {
  it("escolhe easy antes de medium antes de hard", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(baseQ({ id: "q-hard", difficulty: "hard" }))
    await bank.register(baseQ({ id: "q-easy", difficulty: "easy" }))
    await bank.register(baseQ({ id: "q-med", difficulty: "medium" }))
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "practice",
    })
    expect(picked?.id).toBe("q-easy")
  })
})

describe("DeterministicQuestionSelector — desc pra verify", () => {
  it("escolhe hard antes de medium antes de easy", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(
      baseQ({
        id: "q-e",
        difficulty: "easy",
        questionType: "verification",
        usableInPhases: ["verify"],
      }),
    )
    await bank.register(
      baseQ({
        id: "q-h",
        difficulty: "hard",
        questionType: "verification",
        usableInPhases: ["verify"],
      }),
    )
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "verify",
    })
    expect(picked?.id).toBe("q-h")
  })
})

describe("DeterministicQuestionSelector — excludeIds", () => {
  it("pula id já usado com sucesso", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(baseQ({ id: "q1", difficulty: "easy" }))
    await bank.register(baseQ({ id: "q2", difficulty: "medium" }))
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "practice",
      excludeIds: ["q1"],
    })
    expect(picked?.id).toBe("q2")
  })
})

describe("DeterministicQuestionSelector — vazio devolve null", () => {
  it("sem candidatos → null", async () => {
    const bank = new InMemoryQuestionBank()
    const sel = new DeterministicQuestionSelector(bank)
    expect(
      await sel.select({
        subject: "matematica",
        grade: "EM01",
        topic: "funcao-quadratica",
        phase: "practice",
      }),
    ).toBeNull()
  })
})

describe("DeterministicQuestionSelector — só verified", () => {
  it("ignora draft/retired", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(baseQ({ id: "q-draft", status: "draft" }))
    await bank.register(baseQ({ id: "q-verified", status: "verified" }))
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "practice",
    })
    expect(picked?.id).toBe("q-verified")
  })
})
