// lib/vnext/misconceptions/registry.ts

import type { MisconceptionEntry } from "./types"
import { MisconceptionRegistryError, misconceptionEntrySchema } from "./types"

export interface MisconceptionRegistry {
  register(entry: MisconceptionEntry): Promise<MisconceptionEntry>
  registerAll(entries: MisconceptionEntry[]): Promise<MisconceptionEntry[]>
  exists(id: string): boolean
  get(id: string): MisconceptionEntry | null
  list(): MisconceptionEntry[]
  listByTopic(topic: string): MisconceptionEntry[]
}

export class InMemoryMisconceptionRegistry implements MisconceptionRegistry {
  private byId = new Map<string, MisconceptionEntry>()

  async register(entry: MisconceptionEntry): Promise<MisconceptionEntry> {
    const parsed = misconceptionEntrySchema.safeParse(entry)
    if (!parsed.success) {
      throw new MisconceptionRegistryError(
        `Misconception inválida: ${summarize(parsed.error.issues)}`,
        "INVALID_MISCONCEPTION_SHAPE",
      )
    }
    if (this.byId.has(parsed.data.id)) {
      throw new MisconceptionRegistryError(
        `Misconception "${parsed.data.id}" já registrada.`,
        "DUPLICATE_ID",
      )
    }
    this.byId.set(parsed.data.id, parsed.data)
    return parsed.data
  }

  async registerAll(
    entries: MisconceptionEntry[],
  ): Promise<MisconceptionEntry[]> {
    const out: MisconceptionEntry[] = []
    for (const e of entries) out.push(await this.register(e))
    return out
  }

  exists(id: string): boolean {
    return this.byId.has(id)
  }

  get(id: string): MisconceptionEntry | null {
    return this.byId.get(id) ?? null
  }

  list(): MisconceptionEntry[] {
    return Array.from(this.byId.values())
  }

  listByTopic(topic: string): MisconceptionEntry[] {
    return this.list().filter((e) => e.topics.includes(topic))
  }

  clear(): void {
    this.byId.clear()
  }
}

function summarize(zodIssues: unknown): string {
  if (!Array.isArray(zodIssues)) return "unknown"
  return zodIssues
    .slice(0, 3)
    .map((i: { path?: unknown[]; message?: string }) => {
      const p = Array.isArray(i.path) ? i.path.join(".") : "?"
      return `${p}: ${i.message ?? "?"}`
    })
    .join("; ")
}
