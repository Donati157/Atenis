// lib/vnext/critic/types.ts
//
// Contratos internos do Critic. Uma CriticRule é determinística: recebe
// uma StructuredResponse (já validada pelo schema Zod) + contexto, e
// devolve uma lista de RuleResults.

import type { Claim, Evidence, StructuredResponse } from "../schema/epistemic"
import type { Issue } from "../schema/critic"

export interface RuleContext {
  factualValidator?: FactualValidator | null
  gradeLevel?: string
  subject?: string
}

export interface RuleResult {
  ruleId: string
  passed: boolean
  issue?: Issue // presente sse passed=false
}

export interface CriticRule {
  readonly id: string
  readonly description: string
  check(response: StructuredResponse, ctx: RuleContext): RuleResult[]
}

// -----------------------------------------------------------------------
// FACTUAL VALIDATOR — Fase 0.1
// -----------------------------------------------------------------------
// Interface pra plug-in de validadores externos: matemática simbólica,
// verificação contra Knowledge, checagem de datas históricas, etc.
//
// O validator recebe UMA claim + suas evidences (não a resposta inteira)
// pra manter escopo pequeno e permitir cache por claim. Retorna verdicts
// estruturados que a regra `factual-validator-hook` transforma em Issues
// (com location, suggestion, expression analisada, etc.).
//
// Retorno null = "não sei julgar essa claim" (ignorado silenciosamente).
// Retorno { ok: true } = passou.
// Retorno { ok: false, verdicts: [...] } = falhou; verdicts descrevem
// exatamente onde e por quê.

export interface FactualVerdict {
  claimId: string
  // expressão analisada (ex: "2 + 2", "1500-04-22", "capital(BR)").
  // Opcional pra validadores que não trabalham com expressões formais.
  expression?: string
  reason: string
  // JSON path onde o problema está (ex: "claims.0.text").
  location: string
  // trecho da resposta pra highlight
  evidence?: {
    claimId?: string
    evidenceId?: string
    snippet?: string
  }
  // como poderia ser corrigido (opcional; se ausente, issue vira fatal)
  suggestedCorrection?: string
}

export interface FactualValidationResult {
  ok: boolean
  verdicts?: FactualVerdict[]
}

export interface FactualValidatorInput {
  claim: Claim
  evidences: Evidence[]
}

export interface FactualValidator {
  readonly id: string // pra rastreabilidade (ex: "mock-math-validator")
  validateClaim(input: FactualValidatorInput): FactualValidationResult | null
}
