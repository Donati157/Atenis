import type { SupabaseClient } from "@supabase/supabase-js"

export type EventKind =
  | "chat_message"
  | "exercise_answer"
  | "correction_essay"
  | "simulate_attempt"

export interface LearningEventInput {
  kind: EventKind
  subject?: string | null
  topic?: string | null
  correct?: boolean | null
  score?: number | null
  metadata?: Record<string, unknown>
}

export interface LearningEventRow extends LearningEventInput {
  id: string
  user_id: string
  created_at: string
}

/**
 * Logs a learning event. Safe to call from client after auth.getUser().
 * Silently swallows errors — logging must never block the UX.
 */
export async function logLearningEvent(
  supabase: SupabaseClient,
  userId: string,
  event: LearningEventInput,
) {
  try {
    await supabase.from("learning_events").insert({
      user_id: userId,
      kind: event.kind,
      subject: event.subject ?? null,
      topic: event.topic ?? null,
      correct: event.correct ?? null,
      score: event.score ?? null,
      metadata: event.metadata ?? {},
    })
  } catch (err) {
    console.warn("[learning-events] log failed", err)
  }
}
