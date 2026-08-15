// lib/vnext/knowledge/types.ts
//
// Fase 2A: SourceRecord ESTENDE Source (do schema epistêmico Fase 0.1)
// com metadados de curadoria. Reutilizamos o schema Zod existente pra
// não duplicar provenance.
//
// PRINCÍPIO INEGOCIÁVEL: `provenance.status = "verified"` só se
// `verificationMethod ≠ "none"` E `verifiedAt` presente. `curatedBy`
// registra QUEM curou (humano, sistema, script), separado da provenance.

import { z } from "zod"
import {
  authorityTierSchema,
  provenanceSchema,
  sourceTypeSchema,
} from "../schema/epistemic"
import { gradeCodeSchema, subjectSchema, topicSchema } from "../curriculum/types"

// Estende Source com campos que TODA Source no Registry precisa ter
// (não opcionais como no schema epistêmico): id, curação, categorização.
export const sourceRecordSchema = z.object({
  id: z.string().min(1).max(128),
  type: sourceTypeSchema,
  title: z.string().min(1).max(500),
  authorityTier: authorityTierSchema,
  url: z.string().url().max(2048).optional(),
  publisher: z.string().max(200).optional(),
  domain: z.string().max(253).optional(),
  publishedAt: z.string().max(64).optional(),
  updatedAt: z.string().max(64).optional(),
  retrievedAt: z.string().max(64),
  provenance: provenanceSchema,
  // Categorização pra retrieval determinístico
  subjects: z.array(subjectSchema).max(20).default([]),
  grades: z.array(gradeCodeSchema).max(20).default([]),
  topics: z.array(topicSchema).max(50).default([]),
  // Curadoria — quem/quando/notas. NÃO é provenance; é o registro de
  // adição ao Atenis.
  curatedAt: z.string().max(64),
  curatedBy: z.string().min(1).max(200),
  curationNotes: z.string().max(2000).optional(),
})

export type SourceRecord = z.infer<typeof sourceRecordSchema>

// Erro específico do registry — subclass de Error pra permitir
// `instanceof` em testes.
export class SourceRegistryError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = "SourceRegistryError"
    this.code = code
  }
}
