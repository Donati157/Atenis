// lib/vnext/tutor-turn/analyzer/rules/index.ts

import { schemaShapeRule } from "./schema-shape"
import { uncertaintyNeedsAnalysisRule } from "./uncertainty-needs-analysis"
import { explanationSubstanceRule } from "./explanation-substance"
import type { TurnRule } from "./schema-shape"

export const DEFAULT_TURN_RULES: TurnRule[] = [
  schemaShapeRule,
  explanationSubstanceRule,
  uncertaintyNeedsAnalysisRule,
]

export {
  schemaShapeRule,
  uncertaintyNeedsAnalysisRule,
  explanationSubstanceRule,
}
export type { TurnRule, TurnRuleResult } from "./schema-shape"
