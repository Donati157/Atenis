// test/vnext/engine/verify-failure.test.ts
//
// B. verify failure: aluno erra na verificação → evaluate → adapt → teach.

import { describe, it, expect } from "vitest"
import { decideNext } from "../../../lib/vnext/engine/transitions"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { LearningTopicState } from "../../../lib/vnext/learning/types"

function s0(): LearningTopicState {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-11T14:00:00.000Z",
  })
}

describe("verify failure — caminho de adaptação", () => {
  it("verify + answer(correct=false) → evaluate", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentMethodPhase: "verify",
      currentStrategy: "analogy",
      mastery: "developing",
    }
    const d = decideNext(s, {
      kind: "answer",
      correct: false,
      strategyUsed: "analogy",
    })
    expect(d.next).toBe("evaluate")
  })

  it("evaluate após verify falho → adapt", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentMethodPhase: "evaluate",
      currentStrategy: "analogy",
      mastery: "developing",
      attempts: [
        {
          strategy: "analogy",
          outcome: "failure",
          methodPhase: "verify",
          eventKind: "answer",
          at: "2026-08-11T14:00:01.000Z",
        },
      ],
    }
    const d = decideNext(s, null)
    expect(d.next).toBe("adapt")
  })

  it("adapt após verify falho escolhe nova strategy", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentMethodPhase: "adapt",
      currentStrategy: "analogy",
      mastery: "developing",
      adaptCount: 1,
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 1, successes: 0 },
        { strategy: "analogy", tries: 2, successes: 1 }, // NÃO bloqueada (tem 1 sucesso)
      ],
    }
    const d = decideNext(s, null)
    expect(d.next).toBe("teach")
    expect(d.nextStrategy).not.toBe("analogy") // evita reciclar current
  })
})
