// test/vnext/questions/selection-context.test.ts
//
// H. seleção considera preferAddressingCodes.
// I. questão respondida com sucesso é excluída.
// J. draft/retired não são retornadas (só verified).

import { describe, it, expect } from "vitest"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
  type Question,
} from "../../../lib/vnext/questions"

function q(overrides: Partial<Question> = {}): Question {
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
    epistemicRole: "authored-by-atenis",
    createdAt: "2026-08-11T00:00:00.000Z",
    ...overrides,
  }
}

describe("H. seleção considera preferAddressingCodes", () => {
  it("prefere questão que endereça código ativo", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(
      q({
        id: "q-normal",
        difficulty: "easy",
        commonErrors: [{ code: "other-error", description: "x" }],
      }),
    )
    await bank.register(
      q({
        id: "q-addresses",
        difficulty: "medium",
        commonErrors: [{ code: "sign-confusion-b", description: "y" }],
      }),
    )
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "practice",
      preferAddressingCodes: ["sign-confusion-b"],
    })
    // Ainda que easy < medium, endereçar prevalece.
    expect(picked?.id).toBe("q-addresses")
  })

  it("se nenhuma questão endereça, cai pro comportamento normal (difficulty asc)", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(
      q({
        id: "q1",
        difficulty: "easy",
        commonErrors: [{ code: "other-1", description: "x" }],
      }),
    )
    await bank.register(
      q({
        id: "q2",
        difficulty: "medium",
        commonErrors: [{ code: "other-2", description: "y" }],
      }),
    )
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "practice",
      preferAddressingCodes: ["nada-a-ver"],
    })
    expect(picked?.id).toBe("q1")
  })

  it("prefere questão com MAIS matches", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(
      q({
        id: "q-one",
        commonErrors: [{ code: "a", description: "x" }],
      }),
    )
    await bank.register(
      q({
        id: "q-two",
        commonErrors: [
          { code: "a", description: "x" },
          { code: "b", description: "y" },
        ],
      }),
    )
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "practice",
      preferAddressingCodes: ["a", "b"],
    })
    expect(picked?.id).toBe("q-two")
  })
})

describe("I. excludeIds — respondidas com sucesso são puladas", () => {
  it("pula id em excludeIds", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(q({ id: "q-a", difficulty: "easy" }))
    await bank.register(q({ id: "q-b", difficulty: "medium" }))
    const sel = new DeterministicQuestionSelector(bank)
    const picked = await sel.select({
      subject: "matematica",
      grade: "EM01",
      topic: "funcao-quadratica",
      phase: "practice",
      excludeIds: ["q-a"],
    })
    expect(picked?.id).toBe("q-b")
  })
})

describe("J. draft/retired não são retornadas", () => {
  it("só verified é candidata", async () => {
    const bank = new InMemoryQuestionBank()
    await bank.register(q({ id: "q-draft", status: "draft" }))
    await bank.register(q({ id: "q-reviewed", status: "reviewed" }))
    await bank.register(q({ id: "q-retired", status: "retired" }))
    await bank.register(q({ id: "q-verified", status: "verified" }))
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
