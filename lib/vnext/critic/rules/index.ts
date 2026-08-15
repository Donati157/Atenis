// lib/vnext/critic/rules/index.ts
// Registry default de regras do Critic.

import { schemaIntegrityRule } from "./schema-integrity"
import { evidenceCoverageRule } from "./evidence-coverage"
import { sourceAuthorityRule } from "./source-authority"
import { sourceProvenanceRule } from "./source-provenance"
import { factualSupportRule } from "./factual-support"
import { analysisNotRepetitionRule } from "./analysis-not-repetition"
import { sourceConflictRule } from "./source-conflict"
import { factualValidatorHookRule } from "./factual-validator-hook"
import type { CriticRule } from "../types"

export const DEFAULT_RULES: CriticRule[] = [
  schemaIntegrityRule,
  evidenceCoverageRule,
  sourceAuthorityRule,
  sourceProvenanceRule,
  factualSupportRule,
  analysisNotRepetitionRule,
  sourceConflictRule,
  factualValidatorHookRule,
]

export {
  schemaIntegrityRule,
  evidenceCoverageRule,
  sourceAuthorityRule,
  sourceProvenanceRule,
  factualSupportRule,
  analysisNotRepetitionRule,
  sourceConflictRule,
  factualValidatorHookRule,
}
