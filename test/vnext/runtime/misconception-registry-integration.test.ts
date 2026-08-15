// test/vnext/runtime/misconception-registry-integration.test.ts
//
// D. Misconception CONHECIDA (no registry) é registrada.
// E. Misconception DESCONHECIDA NÃO entra silenciosamente na memória
//    (fica no trace como UNKNOWN_MISCONCEPTION).

import { describe, it, expect } from "vitest"
import { Runtime } from "../../../lib/vnext/runtime"
import { MethodEngine } from "../../../lib/vnext/engine"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { createGateway } from "../../../lib/vnext/gateway"
import { MockProvider } from "../../../lib/vnext/gateway/providers/mock"
import { analyze } from "../../../lib/vnext/critic"
import { FakeClock } from "../../../lib/vnext/clock"
import { CounterIdGenerator } from "../../../lib/vnext/ids"
import { InMemorySourceRegistry } from "../../../lib/vnext/knowledge"
import { InMemoryMisconceptionRegistry } from "../../../lib/vnext/misconceptions"
import {
  DeterministicQuestionSelector,
  InMemoryQuestionBank,
} from "../../../lib/vnext/questions"
import { loadQuadraticaDataset } from "../../../lib/vnext/datasets/matematica-funcao-quadratica"
import {
  MockEvaluator,
  evaluationResult,
} from "../../../lib/vnext/evaluator/mock"
import { registerScenarioFixtures } from "../../../lib/vnext/scenarios/quadratic-adapt-then-succeed"

async function buildRuntime(codeToReturn: string) {
  const mock = new MockProvider()
  registerScenarioFixtures(mock, "quadratic-adapt-then-succeed")
  const gateway = createGateway()
  gateway.register(mock)
  const sreg = new InMemorySourceRegistry()
  const mreg = new InMemoryMisconceptionRegistry()
  const bank = new InMemoryQuestionBank(sreg, mreg)
  await loadQuadraticaDataset(sreg, bank, mreg)
  const selector = new DeterministicQuestionSelector(bank)
  const evaluator = new MockEvaluator()
  evaluator.registerMatcher(
    () => true,
    {
      kind: "result",
      value: evaluationResult({
        outcome: "incorrect",
        reasoning: "erro",
        errors: [
          {
            kind: "algebraic",
            code: codeToReturn,
            description: "simulado",
            severity: "major",
          },
        ],
      }),
    },
    "always-error",
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
    misconceptionRegistry: mreg,
    requireQuestion: true,
  })
  return runtime
}

const CTX = {
  subject: "matematica",
  grade: "EM01" as const,
  schoolStage: "high" as const,
}

describe("D. code conhecido é registrado no state", () => {
  it("sign-confusion-b entra no state.misconceptions", async () => {
    const runtime = await buildRuntime("sign-confusion-b")
    const diag = await runtime.tick({
      studentId: "s1",
      topic: "funcao-quadratica",
      message: "?",
      context: CTX,
    })
    const answered = await runtime.tick({
      studentId: "s1",
      topic: "funcao-quadratica",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "?",
      },
      answerContext: {
        question: diag.selectedQuestion!.question,
        questionId: diag.selectedQuestion!.id,
      },
    })
    expect(
      answered.state.misconceptions.some(
        (m) => m.code === "sign-confusion-b",
      ),
    ).toBe(true)
    expect(
      answered.trace.some(
        (t) => t.step === "runtime.evaluate.misconceptions-recorded",
      ),
    ).toBe(true)
  })
})

describe("E. code INVENTADO NÃO entra no state — fica só no trace", () => {
  it("code fora do catálogo → UNKNOWN_MISCONCEPTION no trace, state.misconceptions vazio", async () => {
    const runtime = await buildRuntime("errata-code-inventada")
    const diag = await runtime.tick({
      studentId: "s2",
      topic: "funcao-quadratica",
      message: "?",
      context: CTX,
    })
    const answered = await runtime.tick({
      studentId: "s2",
      topic: "funcao-quadratica",
      message: "",
      studentEvent: {
        kind: "answer",
        correct: false,
        strategyUsed: "worked_example",
        text: "?",
      },
      answerContext: {
        question: diag.selectedQuestion!.question,
        questionId: diag.selectedQuestion!.id,
      },
    })
    // NENHUMA misconception persistida com esse code
    expect(
      answered.state.misconceptions.some(
        (m) => m.code === "errata-code-inventada",
      ),
    ).toBe(false)
    // Trace registra explicit
    const unknownTrace = answered.trace.find(
      (t) => t.step === "runtime.evaluate.unknown-misconception",
    )
    expect(unknownTrace).toBeDefined()
    const detail = unknownTrace!.detail as { unknown: string[] }
    expect(detail.unknown).toContain("errata-code-inventada")
  })
})
