// test/vnext/runtime/multi-misconception.test.ts
//
// L. Dois alunos com misconceptions diferentes recebem caminhos
//    diferentes na seleção de questões:
//
//   Aluno A: errou sign-confusion-b → next practice prefere questão com
//            esse code em commonErrors → q-quadratica-diagnostic-01
//   Aluno B: errou delta-sign → next practice prefere questão com
//            esse code → q-quadratica-practice-01
//
// Nenhuma regra específica por code — só a política genérica
// preferAddressingCodes.

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
import { MockEvaluator, evaluationResult } from "../../../lib/vnext/evaluator/mock"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

async function buildRuntime() {
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
  return { runtime, bank, evaluator }
}

// Fixture: evaluator retorna erro específico baseado num "code" que
// injetamos no student answer via texto.
function registerEvaluatorForCode(evaluator: MockEvaluator, code: string) {
  evaluator.registerMatcher(
    () => true,
    {
      kind: "result",
      value: evaluationResult({
        outcome: "incorrect",
        reasoning: `simulando erro ${code}`,
        errors: [
          {
            kind: "algebraic",
            code,
            description: `erro simulado ${code}`,
            severity: "major",
          },
        ],
      }),
    },
    `always-${code}`,
  )
}

describe("L. dois alunos, misconceptions diferentes → seleções distintas", () => {
  it("aluno A com sign-confusion-b vs aluno B com delta-sign", async () => {
    // ============ ALUNO A ============
    const a = await buildRuntime()
    registerEvaluatorForCode(a.evaluator, "sign-confusion-b")
    const studentA = "aluno-A"
    const topic = "funcao-quadratica"

    // diagnose
    const diagA = await a.runtime.tick({
      studentId: studentA,
      topic,
      message: "?",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
    })
    // aluno A erra sign-confusion-b
    await a.runtime.tick({
      studentId: studentA,
      topic,
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "any",
      },
      answerContext: {
        question: diagA.selectedQuestion!.question,
        questionId: diagA.selectedQuestion!.id,
      },
    })
    // adapt (internal) + teach (generative) + practice (generative com nova seleção)
    await a.runtime.tick({ studentId: studentA, topic, message: "" }) // adapt
    await a.runtime.tick({ studentId: studentA, topic, message: "" }) // teach
    const practiceA = await a.runtime.tick({
      studentId: studentA,
      topic,
      message: "",
    })
    const questionA = practiceA.selectedQuestion!
    // A questão preferida DEVE endereçar sign-confusion-b
    expect(
      questionA.commonErrors.some((e) => e.code === "sign-confusion-b"),
    ).toBe(true)

    // ============ ALUNO B ============
    const b = await buildRuntime()
    registerEvaluatorForCode(b.evaluator, "delta-sign")
    const studentB = "aluno-B"

    const diagB = await b.runtime.tick({
      studentId: studentB,
      topic,
      message: "?",
      context: { subject: "matematica", grade: "EM01", schoolStage: "high" },
    })
    await b.runtime.tick({
      studentId: studentB,
      topic,
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "any",
      },
      answerContext: {
        question: diagB.selectedQuestion!.question,
        questionId: diagB.selectedQuestion!.id,
      },
    })
    await b.runtime.tick({ studentId: studentB, topic, message: "" }) // adapt
    await b.runtime.tick({ studentId: studentB, topic, message: "" }) // teach
    const practiceB = await b.runtime.tick({
      studentId: studentB,
      topic,
      message: "",
    })
    const questionB = practiceB.selectedQuestion!
    // A questão preferida DEVE endereçar delta-sign
    expect(
      questionB.commonErrors.some((e) => e.code === "delta-sign"),
    ).toBe(true)

    // Os dois alunos receberam questões DIFERENTES
    expect(questionA.id).not.toBe(questionB.id)
  })
})
