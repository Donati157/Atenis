// test/vnext/engine/transitions.test.ts
//
// Cobre critério de aceitação A–F, I do enunciado da Fase 1:
//   A. diagnose → teach
//   B. teach → practice
//   C. practice → evaluate
//   D. evaluate falha → adapt
//   E. adapt → teach (com nova strategy)
//   F. tentativa boa → verify
//   I. limite ciclos → abort

import { describe, it, expect } from "vitest"
import {
  MAX_ADAPT_ATTEMPTS,
  decideNext,
  pickAdaptStrategy,
} from "../../../lib/vnext/engine/transitions"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { LearningTopicState } from "../../../lib/vnext/learning/types"

function baseState(): LearningTopicState {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-11T14:00:00.000Z",
  })
}

describe("A. diagnose → teach", () => {
  it("state novo com currentPhase=diagnose + event start → next=teach com strategy inicial", () => {
    const s = baseState()
    // decideNext incrementa cycleCount FORA da função — aqui simulamos.
    const decision = decideNext(s, { kind: "start" })
    expect(decision.next).toBe("teach")
    expect(decision.nextStrategy).toBe("worked_example")
  })

  it("state novo SEM event → fica em diagnose aguardando", () => {
    const s = baseState()
    const decision = decideNext(s, null)
    // novo tópico sem attempts + phase diagnose = aguarda start
    expect(decision.next).toBe("diagnose")
  })
})

describe("B. teach → practice", () => {
  it("phase=teach + qualquer evento → next=practice mantendo strategy", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "teach",
      currentStrategy: "analogy",
      // simula estado onde attempts existem pra escapar do gate 'novo tópico'
      mastery: "emerging",
    }
    const decision = decideNext(s, null)
    expect(decision.next).toBe("practice")
    expect(decision.nextStrategy).toBe("analogy")
  })
})

describe("C. practice → evaluate", () => {
  it("phase=practice + event answer → next=evaluate", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "practice",
      currentStrategy: "worked_example",
      mastery: "emerging",
    }
    const decision = decideNext(s, {
      kind: "answer",
      correct: true,
      strategyUsed: "worked_example",
    })
    expect(decision.next).toBe("evaluate")
  })

  it("phase=practice + event confused → next=evaluate (Fase 1.1 trata confused)", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "practice",
      currentStrategy: "worked_example",
      mastery: "emerging",
    }
    const decision = decideNext(s, { kind: "confused" })
    expect(decision.next).toBe("evaluate")
  })
})

describe("D. evaluate falha → adapt", () => {
  it("último attempt=failure → next=adapt", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "evaluate",
      currentStrategy: "worked_example",
      mastery: "emerging",
      attempts: [
        {
          strategy: "worked_example",
          outcome: "failure",
          methodPhase: "practice",
          eventKind: "answer",
          at: "2026-08-11T14:00:01.000Z",
        },
      ],
    }
    const decision = decideNext(s, null)
    expect(decision.next).toBe("adapt")
  })
})

describe("E. adapt → teach com nova strategy", () => {
  it("adapt escolhe strategy AINDA NÃO tentada", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "adapt",
      currentStrategy: "worked_example",
      mastery: "emerging",
      adaptCount: 0,
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 1, successes: 0 },
      ],
    }
    const decision = decideNext(s, null)
    expect(decision.next).toBe("teach")
    // próxima strategy na ordem de fallback = analogy
    expect(decision.nextStrategy).toBe("analogy")
  })

  it("adapt com adaptCount >= MAX_ADAPT_ATTEMPTS → abort", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "adapt",
      currentStrategy: "socratic",
      mastery: "emerging",
      adaptCount: MAX_ADAPT_ATTEMPTS,
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 1, successes: 0 },
        { strategy: "analogy", tries: 1, successes: 0 },
      ],
    }
    const decision = decideNext(s, null)
    expect(decision.next).toBe("abort")
  })

  it("adapt com todas strategies esgotadas e nenhuma com sucesso → abort", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "adapt",
      currentStrategy: "first_principles",
      mastery: "emerging",
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 2, successes: 0 },
        { strategy: "analogy", tries: 1, successes: 0 },
        { strategy: "visual_diagram", tries: 1, successes: 0 },
        { strategy: "socratic", tries: 1, successes: 0 },
        { strategy: "first_principles", tries: 1, successes: 0 },
      ],
    }
    const strat = pickAdaptStrategy(s)
    expect(strat).toBeNull()
    const decision = decideNext(s, null)
    expect(decision.next).toBe("abort")
  })
})

describe("F. tentativa boa → verify (via evaluate)", () => {
  it("evaluate com success + mastery developing → next=verify", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "evaluate",
      currentStrategy: "analogy",
      mastery: "developing",
      attempts: [
        {
          strategy: "analogy",
          outcome: "success",
          methodPhase: "practice",
          eventKind: "answer",
          at: "2026-08-11T14:00:01.000Z",
        },
      ],
    }
    const decision = decideNext(s, null)
    expect(decision.next).toBe("verify")
  })

  it("evaluate com success + mastery emerging → next=verify direto (Fase 1.1: review removido)", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "evaluate",
      currentStrategy: "analogy",
      mastery: "emerging",
      attempts: [
        {
          strategy: "analogy",
          outcome: "success",
          methodPhase: "practice",
          eventKind: "answer",
          at: "2026-08-11T14:00:01.000Z",
        },
      ],
    }
    const decision = decideNext(s, null)
    expect(decision.next).toBe("verify")
  })
})

describe("terminais são absorventes", () => {
  it("phase=ready fica em ready", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "ready",
      mastery: "secure",
    }
    expect(decideNext(s, null).next).toBe("ready")
  })

  it("phase=abort fica em abort", () => {
    const s: LearningTopicState = {
      ...baseState(),
      currentMethodPhase: "abort",
    }
    expect(decideNext(s, null).next).toBe("abort")
  })
})
