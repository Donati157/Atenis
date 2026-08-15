// lib/vnext/runtime/ensure-server-meta.ts
//
// Fase 2B.6.3: `meta` é responsabilidade do SERVER, não do LLM.
//
// Motivo: os 4 campos de `structuredResponseMetaSchema` são metadata de
// infraestrutura que o server naturalmente sabe:
//   - `generatedAt`   → `clock.nowIso()`
//   - `modelName`     → `<providerId>:<modelId>` do StructuredOutput
//   - `turnId`        → `ids.next("turn")`
//   - `methodPhase`   → a `phase` já injetada no `ComposeRequestInput`
//
// Fluxo:
//   1. `gateway.structured({schema: structuredResponseSchemaForLlm})`
//      recebe schema com `meta` opcional. LLM devolve objeto SEM meta
//      (ou com meta parcial, se ele decidiu preencher).
//   2. `ensureServerMeta(raw, ctx)` injeta os 4 campos com os valores
//      autoritativos do server. Se LLM devolveu campos, **os do server
//      ganham** (fonte de verdade é o server).
//   3. Refiner revalida com `structuredResponseSchema` completo antes de
//      passar pro Critic — invariante do contrato final preservada.
//
// Nunca lança. Sempre retorna um objeto com `meta` completo pronto para
// revalidação.

import type { IdGenerator } from "../ids"
import type { MethodPhase } from "../engine/phases"

export interface ServerMetaContext {
  providerId: string
  modelId: string
  phase: MethodPhase
  // Só usa nowIso — aceita qualquer clock que exponha esse método
  // (Clock, FakeClock, ou mock de teste).
  clock: { nowIso: () => string }
  ids: IdGenerator
}

export function buildServerMeta(ctx: ServerMetaContext): {
  generatedAt: string
  modelName: string
  turnId: string
  methodPhase: string
} {
  return {
    generatedAt: ctx.clock.nowIso(),
    modelName: `${ctx.providerId}:${ctx.modelId}`,
    turnId: ctx.ids.next("turn"),
    methodPhase: ctx.phase,
  }
}

/**
 * Injeta `meta` no payload retornado pelo LLM. Se o LLM devolveu o
 * campo `meta` (parcial ou completo), server sobrescreve — infraestrutura
 * é fonte de verdade pra timestamps, id de turno e nome do modelo real.
 *
 * Fase 2B.7: também injeta `sources[i].retrievedAt` para sources
 * criadas pelo LLM que não têm o campo (LLM não recupera fonte externa;
 * `retrievedAt` reflete o timestamp do turno em que a source foi
 * referenciada). Auditoria retrievedAt (Fase 2B.6.3) mostrou que
 * `retrievedAt` é semanticamente responsabilidade do server, não do LLM.
 *
 * Retorna sempre um objeto. Se `raw` não é objeto, retorna um objeto
 * mínimo com só `meta` — deixa a revalidação Zod subsequente falhar
 * naturalmente com mensagem clara.
 */
export function ensureServerMeta(
  raw: unknown,
  ctx: ServerMetaContext,
): Record<string, unknown> {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const serverMeta = buildServerMeta(ctx)
  const timestamp = serverMeta.generatedAt

  // Injeta retrievedAt em sources que não têm string válida.
  // Não sobrescreve valores existentes (se LLM/dataset preencheu ISO
  // real, mantém). Preenche apenas quando ausente, vazio ou não-string.
  const sources = base.sources
  if (Array.isArray(sources)) {
    const patchedSources = sources.map((s) => {
      if (!s || typeof s !== "object" || Array.isArray(s)) return s
      const source = s as Record<string, unknown>
      const existing = source.retrievedAt
      if (
        typeof existing === "string" &&
        existing.trim().length > 0
      ) {
        return source
      }
      return { ...source, retrievedAt: timestamp }
    })
    return { ...base, sources: patchedSources, meta: serverMeta }
  }

  return { ...base, meta: serverMeta }
}
