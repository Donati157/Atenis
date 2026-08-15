// test/vnext/tutor-turn/composer.test.ts
//
// A. Prompt Composer recebe EducationalContext.
// B. Prompt Composer recebe Learning State (misconceptions, mastery).
// C. Prompt Composer recebe Question quando disponível.
// D. Prompt Composer funciona sem Question.
// E. Dois EducationalContexts produzem prompts diferentes.

import { describe, it, expect } from "vitest"
import { composeTutorTurnRequest } from "../../../lib/vnext/tutor-turn/composer"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { LearningTopicState } from "../../../lib/vnext/learning/types"
import type { Question } from "../../../lib/vnext/questions/types"

const CREATED = "2026-08-11T00:00:00.000Z"

function stateWith(over: Partial<LearningTopicState> = {}): LearningTopicState {
  return {
    ...newTopicState({ studentId: "s1", topic: "funcao-quadratica", createdAt: CREATED }),
    ...over,
  }
}

function baseQuestion(): Question {
  return {
    id: "q-quadratica-diag-01",
    version: 1,
    status: "verified",
    question: "Identifique os coeficientes a, b, c em f(x)=3x²-5x+2.",
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
      kind: "algebraic",
      canonicalForm: "a=3, b=-5, c=2",
    },
    commonErrors: [
      { code: "sign-confusion-b", description: "trocou sinal do b" },
    ],
    sourceId: "bncc-em13mat302",
    epistemicRole: "curricular-reference",
    createdAt: CREATED,
  }
}

describe("A. composer recebe EducationalContext", () => {
  it("blocks incluem context; JSON contém subject/grade/skill", () => {
    const { request, blocksIncluded } = composeTutorTurnRequest({
      phase: "diagnose",
      strategy: null,
      topic: "funcao-quadratica",
      context: {
        subject: "matematica",
        grade: "EM01",
        schoolStage: "high",
        skill: "EM13MAT302",
      },
      state: stateWith(),
      taskInstruction: "Diagnosticar familiaridade com coeficientes.",
    })
    expect(blocksIncluded).toContain("context")
    const user = request.messages.find((m) => m.role === "user")!.content
    expect(user).toContain('name="context"')
    expect(user).toContain('"subject": "matematica"')
    expect(user).toContain('"grade": "EM01"')
    expect(user).toContain('"skill": "EM13MAT302"')
  })
})

describe("B. composer recebe Learning State", () => {
  it("bloco learning inclui mastery e activeMisconceptions", () => {
    const state = stateWith({
      mastery: "emerging",
      misconceptions: [
        {
          code: "sign-confusion-b",
          topic: "funcao-quadratica",
          attempts: 1,
          resolvedEvidence: 0,
          lastSeen: CREATED,
        },
      ],
    })
    const { request, blocksIncluded } = composeTutorTurnRequest({
      phase: "practice",
      strategy: "worked_example",
      topic: "funcao-quadratica",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
      state,
      taskInstruction: "Praticar identificação de coeficientes.",
    })
    expect(blocksIncluded).toContain("learning")
    const user = request.messages.find((m) => m.role === "user")!.content
    expect(user).toContain('"mastery": "emerging"')
    expect(user).toContain("sign-confusion-b")
    expect(user).toContain('"activeMisconceptions"')
  })
})

describe("C. composer inclui Question quando disponível", () => {
  it("bloco question-from-bank aparece com id/text/skill/commonErrorCodes", () => {
    const { request, blocksIncluded } = composeTutorTurnRequest({
      phase: "diagnose",
      strategy: null,
      topic: "funcao-quadratica",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
      state: stateWith(),
      selectedQuestion: baseQuestion(),
      taskInstruction: "Apresentar a questão diagnóstica.",
    })
    expect(blocksIncluded).toContain("question-from-bank")
    const user = request.messages.find((m) => m.role === "user")!.content
    expect(user).toContain('name="question-from-bank"')
    expect(user).toContain("q-quadratica-diag-01")
    expect(user).toContain("f(x)=3x²-5x+2")
    expect(user).toContain("sign-confusion-b")
  })
})

describe("D. composer funciona sem Question", () => {
  it("bloco question-from-bank ausente quando selectedQuestion=null", () => {
    const { request, blocksIncluded } = composeTutorTurnRequest({
      phase: "teach",
      strategy: "worked_example",
      topic: "funcao-quadratica",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
      state: stateWith(),
      selectedQuestion: null,
      taskInstruction: "Ensinar o conceito.",
    })
    expect(blocksIncluded).not.toContain("question-from-bank")
    const user = request.messages.find((m) => m.role === "user")!.content
    expect(user).not.toContain("question-from-bank")
  })
})

describe("E. dois EducationalContexts produzem prompts diferentes", () => {
  it("contexto matemática vs português: user prompts distintos", () => {
    const shared = {
      phase: "diagnose" as const,
      strategy: null,
      topic: "funcao-quadratica",
      state: stateWith(),
      taskInstruction: "Diagnosticar.",
    }
    const mat = composeTutorTurnRequest({
      ...shared,
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
    })
    const port = composeTutorTurnRequest({
      ...shared,
      topic: "concordancia-verbal",
      context: { subject: "portugues", grade: "9", schoolStage: "middle" },
    })
    const matUser = mat.request.messages.find((m) => m.role === "user")!.content
    const portUser = port.request.messages.find((m) => m.role === "user")!.content
    expect(matUser).not.toBe(portUser)
    expect(matUser).toContain("matematica")
    expect(portUser).toContain("portugues")
    expect(portUser).toContain('"grade": "9"')
    // useCase inclui phase, é igual pra ambos aqui (diagnose)
    expect(mat.request.useCase).toBe("atenis.tutor-turn.diagnose")
    expect(port.request.useCase).toBe("atenis.tutor-turn.diagnose")
  })

  it("contexto AP/language sem grade também gera prompt válido", () => {
    const { request, blocksIncluded } = composeTutorTurnRequest({
      phase: "diagnose",
      strategy: null,
      topic: "greetings",
      context: {
        subject: "japanese-language",
        framework: "cefr",
        proficiencyLevel: "A1",
      },
      state: stateWith({ studentId: "s-jp", topic: "greetings" }),
      taskInstruction: "Diagnosticar familiaridade com saudações.",
    })
    expect(blocksIncluded).toContain("context")
    const user = request.messages.find((m) => m.role === "user")!.content
    expect(user).toContain('"subject": "japanese-language"')
    expect(user).toContain('"framework": "cefr"')
    expect(user).toContain('"proficiencyLevel": "A1"')
    // grade é null (não hardcoded)
    expect(user).toContain('"grade": null')
  })
})

describe("system prompt estável (max caching)", () => {
  it("mesmo system prompt entre chamadas diferentes", () => {
    const a = composeTutorTurnRequest({
      phase: "diagnose",
      strategy: null,
      topic: "x",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
      state: stateWith(),
      taskInstruction: "a",
    })
    const b = composeTutorTurnRequest({
      phase: "teach",
      strategy: "analogy",
      topic: "y",
      context: { subject: "portugues", grade: "9", schoolStage: "middle" },
      state: stateWith({ topic: "y" }),
      taskInstruction: "b",
    })
    const sysA = a.request.messages.find((m) => m.role === "system")!.content
    const sysB = b.request.messages.find((m) => m.role === "system")!.content
    expect(sysA).toBe(sysB)
    expect(a.systemPromptFingerprint).toBe(b.systemPromptFingerprint)
  })

  it("system prompt inclui aviso de prompt injection defense", () => {
    const { request } = composeTutorTurnRequest({
      phase: "diagnose",
      strategy: null,
      topic: "x",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
      state: stateWith(),
      taskInstruction: "a",
    })
    const sys = request.messages.find((m) => m.role === "system")!.content
    expect(sys).toContain("<atenis-data")
    expect(sys).toMatch(/DADO.*INSTRUÇÃO|DADO.*nunca/i)
  })
})
