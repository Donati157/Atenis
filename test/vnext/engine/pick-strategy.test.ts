// test/vnext/engine/pick-strategy.test.ts
//
// D. Estratégia baseada em evidência: pickAdaptStrategy usa
// StrategyEffectiveness pra decidir, não só ordem estática.

import { describe, it, expect } from "vitest"
import { pickAdaptStrategy } from "../../../lib/vnext/engine/transitions"
import { newTopicState } from "../../../lib/vnext/learning/types"
import type { LearningTopicState } from "../../../lib/vnext/learning/types"

function s0(): LearningTopicState {
  return newTopicState({
    studentId: "s1",
    topic: "quadratic",
    createdAt: "2026-08-11T14:00:00.000Z",
  })
}

describe("pickAdaptStrategy — bloqueio por 0% em ≥2 tries", () => {
  it("worked_example com 0/2 é bloqueada — escolhe outra não-tentada", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentStrategy: null,
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 2, successes: 0 },
      ],
    }
    const picked = pickAdaptStrategy(s)
    expect(picked).not.toBe("worked_example")
    // Primeira não-tentada não-bloqueada da ordem = analogy
    expect(picked).toBe("analogy")
  })

  it("worked_example bloqueada (0/3) + analogy bloqueada (0/2) → escolhe visual_diagram", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentStrategy: null,
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 3, successes: 0 },
        { strategy: "analogy", tries: 2, successes: 0 },
      ],
    }
    expect(pickAdaptStrategy(s)).toBe("visual_diagram")
  })

  it("worked_example com 1/2 (50%) NÃO é bloqueada — mas é evitada se é currentStrategy", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentStrategy: "worked_example",
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 2, successes: 1 },
      ],
    }
    // currentStrategy é worked_example — pega outra não-tentada.
    const picked = pickAdaptStrategy(s)
    expect(picked).toBe("analogy")
  })
})

describe("pickAdaptStrategy — evita reciclar currentStrategy", () => {
  it("current=analogy, todas outras não tentadas → escolhe worked_example primeiro", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentStrategy: "analogy",
      strategyEffectiveness: [],
    }
    // A ordem de fallback é worked_example primeiro; analogy é current, evita.
    expect(pickAdaptStrategy(s)).toBe("worked_example")
  })
})

describe("pickAdaptStrategy — após todas tentadas, usa evidência", () => {
  it("todas tentadas com ratios diferentes → escolhe maior ratio (excluindo current)", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentStrategy: "first_principles",
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 3, successes: 1 }, // 33%
        { strategy: "analogy", tries: 4, successes: 3 }, // 75%
        { strategy: "socratic", tries: 2, successes: 1 }, // 50%
        { strategy: "visual_diagram", tries: 2, successes: 1 }, // 50%
        { strategy: "first_principles", tries: 3, successes: 1 }, // current
      ],
    }
    // Melhor ratio entre não-current = analogy 75%
    expect(pickAdaptStrategy(s)).toBe("analogy")
  })

  it("todas com ratio 0 → retorna null (abort)", () => {
    const s: LearningTopicState = {
      ...s0(),
      currentStrategy: "first_principles",
      strategyEffectiveness: [
        { strategy: "worked_example", tries: 2, successes: 0 },
        { strategy: "analogy", tries: 2, successes: 0 },
        { strategy: "socratic", tries: 2, successes: 0 },
        { strategy: "visual_diagram", tries: 2, successes: 0 },
        { strategy: "first_principles", tries: 2, successes: 0 },
      ],
    }
    expect(pickAdaptStrategy(s)).toBeNull()
  })
})
