// lib/vnext/domains/registry.ts
//
// Fase 2A.2 (final): registry mínimo. NÃO é obrigatório no Runtime — só
// serve pra código futuro que quiser resolver metadata de domínio
// (ex: mostrar nome amigável no dashboard) ou validar que
// `EducationalContext.subject` aponta pra domínio conhecido.

import type { AcademicDomain } from "./types"
import { AcademicDomainRegistryError, academicDomainSchema } from "./types"

export interface AcademicDomainRegistry {
  register(domain: AcademicDomain): Promise<AcademicDomain>
  registerAll(domains: AcademicDomain[]): Promise<AcademicDomain[]>
  exists(id: string): boolean
  get(id: string): AcademicDomain | null
  list(): AcademicDomain[]
  listByType(type: AcademicDomain["domainType"]): AcademicDomain[]
}

export class InMemoryAcademicDomainRegistry
  implements AcademicDomainRegistry
{
  private byId = new Map<string, AcademicDomain>()

  async register(domain: AcademicDomain): Promise<AcademicDomain> {
    const parsed = academicDomainSchema.safeParse(domain)
    if (!parsed.success) {
      throw new AcademicDomainRegistryError(
        `Domain inválido: ${summarize(parsed.error.issues)}`,
        "INVALID_DOMAIN_SHAPE",
      )
    }
    if (this.byId.has(parsed.data.id)) {
      throw new AcademicDomainRegistryError(
        `Domain "${parsed.data.id}" já registrado.`,
        "DUPLICATE_ID",
      )
    }
    this.byId.set(parsed.data.id, parsed.data)
    return parsed.data
  }

  async registerAll(domains: AcademicDomain[]): Promise<AcademicDomain[]> {
    const out: AcademicDomain[] = []
    for (const d of domains) out.push(await this.register(d))
    return out
  }

  exists(id: string): boolean {
    return this.byId.has(id)
  }

  get(id: string): AcademicDomain | null {
    return this.byId.get(id) ?? null
  }

  list(): AcademicDomain[] {
    return Array.from(this.byId.values())
  }

  listByType(type: AcademicDomain["domainType"]): AcademicDomain[] {
    return this.list().filter((d) => d.domainType === type)
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
