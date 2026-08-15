// lib/vnext/learning/store.ts
//
// Contrato de persistência. Fase 1.1: InMemoryLearningStore só, MAS o
// contrato é desenhado pra ser DIRETAMENTE mapeável em SupabaseLearningStore
// sem tocar o Method Engine nem o Runtime.
//
// Requisitos que o contrato honra:
//   1. Async: load/save/delete retornam Promise (Supabase é async).
//   2. Serializável: o state passado a save() é 100% JSON via
//      serialize.ts. Backends podem gravar como jsonb sem transformar.
//   3. Isolamento por (studentId, topic): a key composta é responsabilidade
//      do backend, não do Runtime.
//   4. listByStudent é opcional — não é usado no caminho crítico.
//
// SUPABASE FUTURO: `create table learning_topic_state (
//   student_id uuid, topic text, schema_version smallint, state jsonb,
//   updated_at timestamptz, primary key (student_id, topic)
// )` + RLS por auth.uid() = student_id.

import type { LearningTopicState } from "./types"

export interface LearningStore {
  load(studentId: string, topic: string): Promise<LearningTopicState | null>
  save(state: LearningTopicState): Promise<void>
  delete(studentId: string, topic: string): Promise<void>
  listByStudent?(studentId: string): Promise<LearningTopicState[]>
}

export class InMemoryLearningStore implements LearningStore {
  private map = new Map<string, LearningTopicState>()

  private key(studentId: string, topic: string): string {
    return `${studentId}::${topic}`
  }

  async load(studentId: string, topic: string): Promise<LearningTopicState | null> {
    return this.map.get(this.key(studentId, topic)) ?? null
  }

  async save(state: LearningTopicState): Promise<void> {
    this.map.set(this.key(state.studentId, state.topic), state)
  }

  async delete(studentId: string, topic: string): Promise<void> {
    this.map.delete(this.key(studentId, topic))
  }

  async listByStudent(studentId: string): Promise<LearningTopicState[]> {
    return Array.from(this.map.values()).filter(
      (s) => s.studentId === studentId,
    )
  }

  clear(): void {
    this.map.clear()
  }
}
