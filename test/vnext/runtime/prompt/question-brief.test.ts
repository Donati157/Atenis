// test/vnext/runtime/prompt/question-brief.test.ts
//
// INVARIANTE DE SEGURANÇA PEDAGÓGICA — o modelo NUNCA recebe o gabarito
// da Question, em nenhuma fase. Este teste cobre as 5 variantes de
// `expectedAnswer.kind` × 4 fases generativas.

import { describe, it, expect } from "vitest"
import { buildQuestionBrief } from "../../../../lib/vnext/runtime/prompt/question-brief"
import type { Question } from "../../../../lib/vnext/questions/types"
import type { MethodPhase } from "../../../../lib/vnext/engine/phases"

const PHASES: MethodPhase[] = ["diagnose", "teach", "practice", "verify"]

function baseQuestion(overrides: Partial<Question>): Question {
  return {
    id: "q-secret-1",
    version: 1,
    status: "verified",
    question: "Enunciado da questão para o aluno ler.",
    subject: "matematica",
    grade: "EM01",
    schoolStage: "high",
    topic: "funcao-quadratica",
    skill: "identificar-coeficientes",
    difficulty: "easy",
    cognitiveDepth: "apply",
    questionType: "diagnostic",
    usableInPhases: ["diagnose"],
    prerequisites: [],
    expectedAnswer: { kind: "numeric", value: 42 },
    commonErrors: [],
    sourceId: "src-1",
    epistemicRole: "authored-by-atenis",
    createdAt: "2026-08-14T00:00:00.000Z",
    ...overrides,
  } as Question
}

describe("buildQuestionBrief — invariante anti-vazamento (NUMERIC)", () => {
  const q = baseQuestion({
    expectedAnswer: { kind: "numeric", value: 12345, tolerance: 0.01, unit: "m/s" },
  })
  for (const phase of PHASES) {
    it(`fase ${phase} não vaza value nem tolerance`, () => {
      const brief = buildQuestionBrief(q, phase)
      expect(brief).not.toContain("12345")
      expect(brief).not.toContain("0.01")
      // unit é OK (contexto, não gabarito)
      expect(brief).toContain("m/s")
    })
  }
})

describe("buildQuestionBrief — invariante anti-vazamento (ALGEBRAIC)", () => {
  const q = baseQuestion({
    expectedAnswer: {
      kind: "algebraic",
      canonicalForm: "x = SECRET_CANONICAL_FORM_ZZZ",
      variables: { a: 1, b: -5, c: 6 },
      equivalentForms: ["EQUIV_FORM_ALPHA", "EQUIV_FORM_BETA"],
    },
  })
  for (const phase of PHASES) {
    it(`fase ${phase} não vaza canonicalForm, variables nem equivalentForms`, () => {
      const brief = buildQuestionBrief(q, phase)
      expect(brief).not.toContain("SECRET_CANONICAL_FORM_ZZZ")
      expect(brief).not.toContain("EQUIV_FORM_ALPHA")
      expect(brief).not.toContain("EQUIV_FORM_BETA")
      // Coefficient values não podem vazar em runs isolados
      expect(brief).not.toMatch(/\{.*a:.*b:.*c:.*\}/)
    })
  }
})

describe("buildQuestionBrief — invariante anti-vazamento (MULTIPLE-CHOICE)", () => {
  const q = baseQuestion({
    expectedAnswer: {
      kind: "multiple-choice",
      correctOptionId: "SECRET_CORRECT_ID_XPTO",
      options: [
        { id: "a", text: "Alternativa A visível ao aluno", explanation: "EXPLANATION_LEAK_A" },
        { id: "b", text: "Alternativa B visível ao aluno", explanation: "EXPLANATION_LEAK_B" },
        { id: "c", text: "Alternativa C visível ao aluno" },
      ],
    },
  })
  for (const phase of PHASES) {
    it(`fase ${phase} não vaza correctOptionId nem explanations`, () => {
      const brief = buildQuestionBrief(q, phase)
      expect(brief).not.toContain("SECRET_CORRECT_ID_XPTO")
      expect(brief).not.toContain("EXPLANATION_LEAK_A")
      expect(brief).not.toContain("EXPLANATION_LEAK_B")
      expect(brief).not.toMatch(/correctOptionId/)
      // Texto das alternativas SIM (aluno precisa ver pra escolher)
      expect(brief).toContain("Alternativa A visível ao aluno")
      expect(brief).toContain("Alternativa B visível ao aluno")
      expect(brief).toContain("Alternativa C visível ao aluno")
    })
  }
})

describe("buildQuestionBrief — invariante anti-vazamento (SHORT-ANSWER)", () => {
  const q = baseQuestion({
    expectedAnswer: {
      kind: "short-answer",
      acceptedAnswers: [
        "SECRET_ACCEPTED_ANSWER_ONE",
        "SECRET_ACCEPTED_ANSWER_TWO",
      ],
      caseSensitive: true,
    },
  })
  for (const phase of PHASES) {
    it(`fase ${phase} não vaza acceptedAnswers`, () => {
      const brief = buildQuestionBrief(q, phase)
      expect(brief).not.toContain("SECRET_ACCEPTED_ANSWER_ONE")
      expect(brief).not.toContain("SECRET_ACCEPTED_ANSWER_TWO")
    })
  }
})

describe("buildQuestionBrief — invariante anti-vazamento (RUBRIC-BASED)", () => {
  const q = baseQuestion({
    expectedAnswer: {
      kind: "rubric-based",
      rubricId: "SECRET_RUBRIC_ID_XXX",
      guidance: "SECRET_GUIDANCE_CONTENT_YYY",
    },
  })
  for (const phase of PHASES) {
    it(`fase ${phase} não vaza rubricId nem guidance`, () => {
      const brief = buildQuestionBrief(q, phase)
      expect(brief).not.toContain("SECRET_RUBRIC_ID_XXX")
      expect(brief).not.toContain("SECRET_GUIDANCE_CONTENT_YYY")
    })
  }
})

describe("buildQuestionBrief — invariante anti-vazamento (AUTHOR NOTE)", () => {
  const q = baseQuestion({
    expectedAnswer: { kind: "numeric", value: 7 },
    authorNote:
      "SECRET_AUTHOR_NOTE_LEAK — este comentário pode conter a resposta ou dicas",
  })
  for (const phase of PHASES) {
    it(`fase ${phase} não vaza authorNote (texto livre suspeito)`, () => {
      const brief = buildQuestionBrief(q, phase)
      expect(brief).not.toContain("SECRET_AUTHOR_NOTE_LEAK")
    })
  }
})

describe("buildQuestionBrief — expõe metadata pedagogicamente útil", () => {
  const q = baseQuestion({
    expectedAnswer: { kind: "numeric", value: 42 },
    commonErrors: [
      {
        code: "swap-a-b",
        description: "Aluno troca a por b nos coeficientes.",
        misconception: "Confusão sobre ordem canônica dos coeficientes.",
        diagnosticHint: "Peça pro aluno reescrever destacando o termo x².",
      },
    ],
    prerequisites: ["identificar-termos"],
    epistemicRole: "curricular-reference",
    sourceRole: "referência BNCC EM13MAT302; NÃO fornece gabarito",
    framework: "BNCC",
    proficiencyLevel: "básico",
  })
  const brief = buildQuestionBrief(q, "diagnose")

  it("expõe question, skill, subject, topic, grade", () => {
    expect(brief).toContain("Enunciado da questão para o aluno ler.")
    expect(brief).toContain("identificar-coeficientes")
    expect(brief).toContain("matematica")
    expect(brief).toContain("EM01")
  })

  it("expõe commonErrors completos (code + description + misconception + hint)", () => {
    expect(brief).toContain("swap-a-b")
    expect(brief).toContain("Aluno troca a por b nos coeficientes.")
    expect(brief).toContain("Confusão sobre ordem canônica dos coeficientes.")
    expect(brief).toContain("Peça pro aluno reescrever destacando o termo x².")
  })

  it("expõe prerequisites", () => {
    expect(brief).toContain("identificar-termos")
  })

  it("expõe epistemicRole e sourceRole (proteções anti-fabricação)", () => {
    expect(brief).toContain("curricular-reference")
    expect(brief).toContain("referência BNCC EM13MAT302; NÃO fornece gabarito")
  })

  it("expõe framework e proficiencyLevel quando presentes", () => {
    expect(brief).toContain("BNCC")
    expect(brief).toContain("básico")
  })

  it("inclui aviso explícito de que gabarito NÃO foi passado", () => {
    expect(brief).toMatch(/NÃO recebeu o gabarito|não recebeu o gabarito/)
  })
})

describe("buildQuestionBrief — propósito por fase é distinto", () => {
  const q = baseQuestion({})
  it("diagnose fala em ÂNCORA/investigação", () => {
    expect(buildQuestionBrief(q, "diagnose")).toMatch(/ÂNCORA|âncora|investigação|investigação/)
  })
  it("teach fala em REFERÊNCIA/não resolver agora", () => {
    expect(buildQuestionBrief(q, "teach")).toMatch(/REFERÊNCIA|referência|sem resolvê-la/)
  })
  it("practice fala em APRESENTE/aguardar tentativa", () => {
    expect(buildQuestionBrief(q, "practice")).toMatch(/APRESENTE|Não resolva antes/)
  })
  it("verify fala em Evaluator/aluno responde", () => {
    expect(buildQuestionBrief(q, "verify")).toMatch(/Evaluator|verificar o domínio/)
  })
})
