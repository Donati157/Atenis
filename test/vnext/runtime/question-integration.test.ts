// test/vnext/runtime/question-integration.test.ts
//
// A. Runtime solicita questão via selector antes de generative que aguarda input.
// C. questionId chega ao evaluator via questionRef.
// D. expectedAnswer chega ao evaluator.
// E. commonErrors chegam ao evaluator.
// F. evaluator retorna error.code=sign-confusion-b.
// G. Runtime registra esse erro em state.misconceptions.
// Cenário completo: aluno erra → adapta → nova questão preferida.

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import { InMemorySourceRegistry } from "../../../lib/vnext/knowledge"
import { InMemoryMisconceptionRegistry } from "../../../lib/vnext/misconceptions"
import { loadQuadraticaDataset } from "../../../lib/vnext/datasets/matematica-funcao-quadratica"
import {
  MockEvaluator,
  evaluationResult,
} from "../../../lib/vnext/evaluator/mock"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"
import type { EvaluationInput } from "../../../lib/vnext/evaluator/types"

async function newRuntime(opts: {
  captureEvaluatorInputs?: EvaluationInput[]
} = {}) {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
  const gateway = createGateway()
  gateway.register(mock)

  const registry = new InMemorySourceRegistry()
  const misconceptions = new InMemoryMisconceptionRegistry()
  const bank = new InMemoryQuestionBank(registry, misconceptions)
  await loadQuadraticaDataset(registry, bank, misconceptions)
  const selector = new DeterministicQuestionSelector(bank)

  const evaluator = new MockEvaluator()
  // Evaluator devolve erro sign-confusion-b quando texto do aluno bate.
  // Isso simula um LLM real que consultou commonErrors da questão.
  evaluator.registerMatcher(
    (input) => {
      opts.captureEvaluatorInputs?.push(input)
      return input.studentAnswer.includes("b=5") ||
        input.studentAnswer.includes("b = 5")
    },
    {
      kind: "result",
      value: evaluationResult({
        outcome: "incorrect",
        reasoning: "Aluno trocou o sinal de b.",
        errors: [
          {
            kind: "algebraic",
            code: "sign-confusion-b",
            description: "Trocou sinal de b",
            severity: "major",
          },
        ],
      }),
    },
    "sign-confusion-b matcher",
  )
  // Fallback matcher pra outros inputs (respostas corretas): outcome=correct
  evaluator.registerMatcher(
    (input) => {
      opts.captureEvaluatorInputs?.push(input)
      return true
    },
    {
      kind: "result",
      value: evaluationResult({
        outcome: "correct",
        reasoning: "correto",
      }),
    },
    "catch-all correct",
  )

  const runtime = new Runtime({
    gateway,
    engine: new MethodEngine(),
    store: new InMemoryLearningStore(),
    clock: new FakeClock(),
    ids: new CounterIdGenerator(),
    criticAnalyze: (r) => analyze(r),
    evaluator,
    questionBank: bank,
    questionSelector: selector,
    misconceptionRegistry: misconceptions,
    requireQuestion: true,
  })
  return { runtime, bank, selector }
}

describe("A. Runtime solicita questão antes de generative aguardando input", () => {
  it("primeira diagnose chega com selectedQuestion setado", async () => {
    const { runtime } = await newRuntime()
    const out = await runtime.tick({
      studentId: "s1",
      topic: "funcao-quadratica",
      message: "Não sei identificar os coeficientes.",
      context: {
        subject: "matematica",
        grade: "EM01",
        schoolStage: "high",
      },
    })
    expect(out.executedPhase).toBe("diagnose")
    expect(out.selectedQuestion).not.toBeNull()
    expect(out.selectedQuestion?.questionType).toBe("diagnostic")
    // trace registra a seleção
    expect(
      out.trace.some((t) => t.step === "runtime.select-question"),
    ).toBe(true)
  })
})

describe("C.D.E. questionRef chega ao evaluator com metadata", () => {
  it("evaluator recebe questionRef {id, skill, expectedAnswer, commonErrors}", async () => {
    const captured: EvaluationInput[] = []
    const { runtime } = await newRuntime({ captureEvaluatorInputs: captured })
    const studentId = "s2"
    const topic = "funcao-quadratica"

    // 1. diagnose → selectedQuestion apresentada
    const diagOut = await runtime.tick({
      studentId,
      topic,
      message: "Não sei coeficientes.",
      context: {
        subject: "matematica",
        grade: "EM01",
        schoolStage: "high",
      },
    })
    const selectedId = diagOut.selectedQuestion?.id ?? null
    expect(selectedId).toBeDefined()

    // 2. student responde -> evaluate deve chamar evaluator com questionRef
    await runtime.tick({
      studentId,
      topic,
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false, // ignorado (evaluator sobrepõe)
        strategyUsed: "worked_example",
        text: "a=3, b=5, c=2", // trigger sign-confusion-b matcher
      },
      answerContext: {
        question: diagOut.selectedQuestion!.question,
        questionId: selectedId!,
      },
    })

    // Assertions sobre input capturado
    const lastCaptured = captured[captured.length - 1]
    expect(lastCaptured.questionRef).toBeDefined()
    expect(lastCaptured.questionRef!.id).toBe(selectedId)
    expect(lastCaptured.questionRef!.skill).toBe("EM13MAT302")
    expect(lastCaptured.questionRef!.expectedAnswer.kind).toBe("algebraic")
    expect(lastCaptured.questionRef!.commonErrors.length).toBeGreaterThan(0)
    // O código sign-confusion-b DEVE estar no catálogo.
    const codes = lastCaptured.questionRef!.commonErrors.map((e) => e.code)
    expect(codes).toContain("sign-confusion-b")
  })
})

describe("F.G. evaluator retorna sign-confusion-b e Runtime registra", () => {
  it("state.misconceptions inclui sign-confusion-b após erro do aluno", async () => {
    const { runtime } = await newRuntime()
    const studentId = "s3"
    const topic = "funcao-quadratica"

    const diagOut = await runtime.tick({
      studentId,
      topic,
      message: "?",
      context: {
        subject: "matematica",
        grade: "EM01",
        schoolStage: "high",
      },
    })
    const selectedQ = diagOut.selectedQuestion!

    await runtime.tick({
      studentId,
      topic,
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "b = 5",
      },
      answerContext: {
        question: selectedQ.question,
        questionId: selectedQ.id,
      },
    })

    // Verifica state via output do último tick
    const state = diagOut.state // ← estado ANTES do evaluate; vou pegar novamente:
    void state
    // Re-tick pra pegar state atualizado (idempotente)
    const afterEvaluate = await runtime.tick({
      studentId,
      topic,
      message: "",
    })
    // A misconception já foi gravada no store no evaluate anterior:
    expect(
      afterEvaluate.state.misconceptions.some(
        (m) => m.code === "sign-confusion-b",
      ),
    ).toBe(true)
    const m = afterEvaluate.state.misconceptions.find(
      (m) => m.code === "sign-confusion-b",
    )!
    expect(m.attempts).toBeGreaterThanOrEqual(1)
    expect(m.resolvedEvidence).toBe(0)
  })
})

describe("cenário completo: erro → adapt → nova questão preferida", () => {
  it("segunda seleção prefere questão que endereça sign-confusion-b", async () => {
    const { runtime, bank } = await newRuntime()
    const studentId = "s4"
    const topic = "funcao-quadratica"

    // Pega qualquer diagnostic com sign-confusion-b — o Bank tem uma
    // ("q-quadratica-diagnostic-01") com esse code no catálogo.
    const withCode = await bank.findBy({
      questionType: "practice",
      status: "verified",
    })
    void withCode

    // 1. diagnose
    const diag = await runtime.tick({
      studentId,
      topic,
      message: "Não sei.",
      context: {
        subject: "matematica",
        grade: "EM01",
        schoolStage: "high",
      },
    })
    const q1 = diag.selectedQuestion!

    // 2. aluno erra sign-confusion-b
    await runtime.tick({
      studentId,
      topic,
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "a=3, b=5, c=2",
      },
      answerContext: { question: q1.question, questionId: q1.id },
    })

    // 3. tick interno vai fazer adapt (internal) e depois teach (generative).
    // teach NÃO seleciona questão (não é diagnose/practice/verify). Continua.
    await runtime.tick({ studentId, topic, message: "" }) // adapt
    await runtime.tick({ studentId, topic, message: "" }) // teach
    // 4. practice (generative) — AGORA seleciona nova questão preferindo
    // codes ativos:
    const practice = await runtime.tick({ studentId, topic, message: "" })
    expect(practice.executedPhase).toBe("practice")
    expect(practice.selectedQuestion).not.toBeNull()
    // Trace deve mostrar activeMisconceptions inclui sign-confusion-b
    const selectTrace = practice.trace.find(
      (t) => t.step === "runtime.select-question",
    )!
    const active =
      (selectTrace.detail as { activeMisconceptions: string[] })
        .activeMisconceptions
    expect(active).toContain("sign-confusion-b")
  })
})
