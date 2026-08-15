// lib/vnext/engine/index.ts

import type { StudentEvent } from "./events"
import type { MethodPhase } from "./phases"
import {
  awaitsStudentInput,
  isGenerative,
  isInternal,
  isTerminal,
} from "./phases"
import type { LearningTopicState } from "../learning/types"
import {
  MAX_ADAPT_ATTEMPTS,
  VERIFY_STREAK_TO_READY,
  decideNext,
  pickAdaptStrategy,
} from "./transitions"
import type { PickAdaptOptions, TransitionDecision } from "./transitions"

export class MethodEngine {
  readonly limits = {
    MAX_ADAPT_ATTEMPTS,
    VERIFY_STREAK_TO_READY,
  } as const

  decideNext(
    state: LearningTopicState,
    event: StudentEvent | null,
  ): TransitionDecision {
    return decideNext(state, event)
  }

  pickAdaptStrategy(
    state: LearningTopicState,
    options: PickAdaptOptions = {},
  ) {
    return pickAdaptStrategy(state, options)
  }

  classify(phase: MethodPhase): {
    generative: boolean
    internal: boolean
    terminal: boolean
    awaitsInput: boolean
  } {
    return {
      generative: isGenerative(phase),
      internal: isInternal(phase),
      terminal: isTerminal(phase),
      awaitsInput: awaitsStudentInput(phase),
    }
  }
}

export {
  MAX_ADAPT_ATTEMPTS,
  VERIFY_STREAK_TO_READY,
  decideNext,
  pickAdaptStrategy,
}
export type { PickAdaptOptions, TransitionDecision }
export { awaitsStudentInput, isGenerative, isInternal, isTerminal }
export type { MethodPhase }
export type { StudentEvent }
