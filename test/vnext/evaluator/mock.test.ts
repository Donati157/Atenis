// test/vnext/evaluator/mock.test.ts

import { describe, it, expect } from "vitest"
import {
  EvaluatorFixtureNotFoundError,
  EvaluatorInvokedError,
  MockEvaluator,
  evaluationResult,
} from "../../../lib/vnext/evaluator/mock"
import type { EvaluationInput } from "../../../lib/vnext/evaluator/types"

function baseInput(overrides: Partial<EvaluationInput> = {}): EvaluationInput {
  return {
    question: "Qual a raiz da equação x² - 4 = 0?",
    studentAnswer: "x = 2",
    topicContext: { topic: "quadratic" },
    ...overrides,
  }
}

describe("MockEvaluator — determinismo", () => {
  it("mesma entrada devolve mesma saída", async () => {
    const ev = new MockEvaluator()
    const input = baseInput()
    ev.registerResult(
      input,
      evaluationResult({
        outcome: "partial",
        reasoning: "Encontrou uma raiz, esqueceu a outra (x=-2).",
      }),
    )
    const a = await ev.evaluate(input)
    const b = await ev.evaluate(input)
    expect(a).toEqual(b)
    expect(a.outcome).toBe("partial")
  })
})

describe("MockEvaluator — sem fixture", () => {
  it("lança EvaluatorFixtureNotFoundError com hint útil", async () => {
    const ev = new MockEvaluator()
    await expect(ev.evaluate(baseInput())).rejects.toBeInstanceOf(
      EvaluatorFixtureNotFoundError,
    )
    try {
      await ev.evaluate(baseInput({ question: "Diga a raiz." }))
    } catch (err) {
      expect((err as Error).message).toContain("Diga a raiz.")
    }
  })
})

describe("MockEvaluator — matcher predicate", () => {
  it("matcher casa quando fixture exata não existe", async () => {
    const ev = new MockEvaluator()
    ev.registerMatcher(
      (input) => input.topicContext?.topic === "quadratic",
      {
        kind: "result",
        value: evaluationResult({
          outcome: "correct",
          reasoning: "OK genericamente pra quadratic",
        }),
      },
      "any quadratic",
    )
    const out = await ev.evaluate(baseInput({ studentAnswer: "qualquer" }))
    expect(out.outcome).toBe("correct")
  })

  it("fixture exata tem prioridade sobre matcher", async () => {
    const ev = new MockEvaluator()
    const input = baseInput()
    ev.registerResult(
      input,
      evaluationResult({ outcome: "correct", reasoning: "exata" }),
    )
    ev.registerMatcher(
      () => true,
      {
        kind: "result",
        value: evaluationResult({ outcome: "incorrect", reasoning: "matcher" }),
      },
      "catch-all",
    )
    const out = await ev.evaluate(input)
    expect(out.reasoning).toBe("exata")
  })
})

describe("MockEvaluator — erro simulado", () => {
  it("fixture kind=error lança EvaluatorInvokedError", async () => {
    const ev = new MockEvaluator()
    const input = baseInput()
    ev.registerError(input, {
      name: "ProviderError",
      message: "evaluator externo caiu",
      code: "PROV_DOWN",
    })
    try {
      await ev.evaluate(input)
      throw new Error("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(EvaluatorInvokedError)
      const e = err as EvaluatorInvokedError
      expect(e.code).toBe("PROV_DOWN")
      expect(e.message).toContain("caiu")
    }
  })
})

describe("evaluationResult builder — defaults sensatos", () => {
  it("correct → correctness=1", () => {
    const r = evaluationResult({ outcome: "correct", reasoning: "ok" })
    expect(r.correctness).toBe(1)
  })
  it("incorrect → correctness baixo", () => {
    const r = evaluationResult({ outcome: "incorrect", reasoning: "err" })
    expect(r.correctness).toBeLessThan(0.5)
  })
  it("unclear → correctness=0", () => {
    const r = evaluationResult({ outcome: "unclear", reasoning: "?" })
    expect(r.correctness).toBe(0)
  })
})
