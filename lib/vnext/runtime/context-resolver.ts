// lib/vnext/runtime/context-resolver.ts
//
// Fase 2A.2: resolve o EducationalContext do tick. Ordem de precedência:
//   1. input.context (override explícito)
//   2. state.context (persistido da primeira interação)
//   3. null (chamador decide se aborta)

import type { EducationalContext } from "../context/types"
import type { LearningTopicState } from "../learning/types"

export interface ResolvedContext {
  context: EducationalContext | null
  source: "input" | "state" | "absent"
}

export function resolveEducationalContext(
  inputContext: EducationalContext | undefined,
  state: LearningTopicState,
): ResolvedContext {
  if (inputContext) {
    return { context: inputContext, source: "input" }
  }
  if (state.context) {
    return { context: state.context, source: "state" }
  }
  return { context: null, source: "absent" }
}
