// lib/vnext/evaluator/mock.ts
//
// MockEvaluator determinístico. Casamento por hash canônico da
// (question, studentAnswer) OU por matcher predicate. Sem fixture: lança
// EvaluatorFixtureNotFoundError — MESMA disciplina do MockProvider, pra
// que testes não passem em cima de bug.
//
// Suporta simular:
//   - resultado registrado (fixture normal)
//   - erro do evaluator (fixture kind=error)
//   - unclear (via fixture explícita)

import type {
  EvaluationInput,
  EvaluationResult,
  StudentAnswerEvaluator,
} from "./types"

export class EvaluatorFixtureNotFoundError extends Error {
  readonly code = "EVALUATOR_FIXTURE_NOT_FOUND"
  constructor(hint: string) {
    super(
      `MockEvaluator não encontrou fixture pra esse input. Hint: ${hint}. Use registerFixture ou registerMatcher.`,
    )
    this.name = "EvaluatorFixtureNotFoundError"
  }
}

export class EvaluatorInvokedError extends Error {
  readonly code: string
  constructor(message: string, code = "EVALUATOR_ERROR") {
    super(message)
    this.name = "EvaluatorInvokedError"
    this.code = code
  }
}

export type MockEvaluatorFixture =
  | { kind: "result"; value: EvaluationResult }
  | { kind: "error"; error: { name: string; message: string; code?: string } }

export type MockEvaluatorMatcher = (input: EvaluationInput) => boolean

interface MatcherEntry {
  matcher: MockEvaluatorMatcher
  fixture: MockEvaluatorFixture
  description: string
}

export function canonicalEvaluatorKey(input: EvaluationInput): string {
  return JSON.stringify({
    question: input.question,
    studentAnswer: input.studentAnswer,
    topic: input.topicContext?.topic ?? null,
  })
}

interface MockEvaluatorOptions {
  id?: string
}

export class MockEvaluator implements StudentAnswerEvaluator {
  readonly id: string
  private fixtures = new Map<string, MockEvaluatorFixture>()
  private matchers: MatcherEntry[] = []

  constructor(options: MockEvaluatorOptions = {}) {
    this.id = options.id ?? "mock-evaluator"
  }

  registerFixture(
    input: EvaluationInput,
    fixture: MockEvaluatorFixture,
  ): string {
    const key = canonicalEvaluatorKey(input)
    this.fixtures.set(key, fixture)
    return key
  }

  registerResult(input: EvaluationInput, result: EvaluationResult): string {
    return this.registerFixture(input, { kind: "result", value: result })
  }

  registerError(
    input: EvaluationInput,
    error: { name: string; message: string; code?: string },
  ): string {
    return this.registerFixture(input, { kind: "error", error })
  }

  registerMatcher(
    matcher: MockEvaluatorMatcher,
    fixture: MockEvaluatorFixture,
    description = "unnamed-matcher",
  ): void {
    this.matchers.push({ matcher, fixture, description })
  }

  clear(): void {
    this.fixtures.clear()
    this.matchers = []
  }

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const key = canonicalEvaluatorKey(input)
    const exact = this.fixtures.get(key)
    const fixture = exact ?? this.matcherFor(input)
    if (!fixture) throw new EvaluatorFixtureNotFoundError(this.hint(input))
    if (fixture.kind === "error") {
      throw new EvaluatorInvokedError(
        fixture.error.message,
        fixture.error.code,
      )
    }
    return fixture.value
  }

  private matcherFor(input: EvaluationInput): MockEvaluatorFixture | null {
    for (const entry of this.matchers) {
      if (entry.matcher(input)) return entry.fixture
    }
    return null
  }

  private hint(input: EvaluationInput): string {
    return `topic=${input.topicContext?.topic ?? "(none)"}; q="${truncate(input.question, 60)}"; a="${truncate(input.studentAnswer, 60)}"`
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text
}

// ------------------------------------------------------------
// Helper: builder de EvaluationResult com defaults sensatos
// ------------------------------------------------------------
export function evaluationResult(
  overrides: Partial<EvaluationResult> & {
    outcome: EvaluationResult["outcome"]
    reasoning: string
    evaluatorId?: string
  },
): EvaluationResult {
  const correctnessDefault = (() => {
    switch (overrides.outcome) {
      case "correct":
        return 1
      case "partial":
        return 0.6
      case "incorrect":
        return 0.1
      case "unclear":
        return 0
    }
  })()
  return {
    outcome: overrides.outcome,
    correctness: overrides.correctness ?? correctnessDefault,
    detectedConcepts: overrides.detectedConcepts ?? [],
    errors: overrides.errors ?? [],
    evidence: overrides.evidence,
    reasoning: overrides.reasoning,
    recommendedNextAction: overrides.recommendedNextAction ?? "unknown",
    evaluatorId: overrides.evaluatorId ?? "mock-evaluator",
  }
}
