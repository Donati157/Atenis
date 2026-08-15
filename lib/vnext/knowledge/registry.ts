// lib/vnext/knowledge/registry.ts
//
// SourceRegistry — Fase 2A: InMemory. Invariantes reforçadas:
//   1. `provenance.status = "verified"` exige `verificationMethod ≠ "none"`
//      E `verifiedAt` presente. Sem isso, registry REJEITA (não aceita
//      silenciosamente).
//   2. `sourceRecordSchema` valida shape antes de qualquer aceitação.
//   3. ID duplicado é REJEITADO.
//
// Contrato genérico o suficiente pra mapear em SupabaseSourceRegistry
// depois (mesma superfície).

import type { SourceRecord } from "./types"
import { SourceRegistryError, sourceRecordSchema } from "./types"

export interface SourceRegistry {
  register(record: SourceRecord): Promise<SourceRecord>
  get(id: string): Promise<SourceRecord | null>
  has(id: string): Promise<boolean>
  list(): Promise<SourceRecord[]>
  findByDomain(domain: string): Promise<SourceRecord[]>
  findBySubject(subject: string): Promise<SourceRecord[]>
}

export class InMemorySourceRegistry implements SourceRegistry {
  private byId = new Map<string, SourceRecord>()

  async register(record: SourceRecord): Promise<SourceRecord> {
    const parsed = sourceRecordSchema.safeParse(record)
    if (!parsed.success) {
      throw new SourceRegistryError(
        `Source inválida: ${summarize(parsed.error.issues)}`,
        "INVALID_SOURCE_SHAPE",
      )
    }
    const validated = parsed.data

    // Invariante 1: verified exige método real + timestamp
    if (validated.provenance.status === "verified") {
      if (validated.provenance.verificationMethod === "none") {
        throw new SourceRegistryError(
          `Source "${validated.id}" declara provenance.status="verified" mas verificationMethod="none". Sem método, não é verificada.`,
          "INVALID_VERIFIED_WITHOUT_METHOD",
        )
      }
      if (!validated.provenance.verifiedAt) {
        throw new SourceRegistryError(
          `Source "${validated.id}" declara provenance.status="verified" mas verifiedAt está ausente.`,
          "INVALID_VERIFIED_WITHOUT_TIMESTAMP",
        )
      }
    }

    // Invariante 3: id duplicado
    if (this.byId.has(validated.id)) {
      throw new SourceRegistryError(
        `Source "${validated.id}" já registrada. Use update se quiser modificar.`,
        "DUPLICATE_ID",
      )
    }
    this.byId.set(validated.id, validated)
    return validated
  }

  async get(id: string): Promise<SourceRecord | null> {
    return this.byId.get(id) ?? null
  }

  async has(id: string): Promise<boolean> {
    return this.byId.has(id)
  }

  async list(): Promise<SourceRecord[]> {
    return Array.from(this.byId.values())
  }

  async findByDomain(domain: string): Promise<SourceRecord[]> {
    return Array.from(this.byId.values()).filter((s) => s.domain === domain)
  }

  async findBySubject(subject: string): Promise<SourceRecord[]> {
    return Array.from(this.byId.values()).filter((s) =>
      s.subjects.includes(subject),
    )
  }

  // Test-only reset
  clear(): void {
    this.byId.clear()
  }
}

function summarize(zodIssues: unknown): string {
  if (!Array.isArray(zodIssues)) return "unknown format"
  return zodIssues
    .slice(0, 3)
    .map((i: { path?: unknown[]; message?: string }) => {
      const path = Array.isArray(i.path) ? i.path.join(".") : "?"
      return `${path}: ${i.message ?? "?"}`
    })
    .join("; ")
}
