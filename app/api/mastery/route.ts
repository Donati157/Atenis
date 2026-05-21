import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { applyAttempt, masteryPercent } from "@/lib/spaced-repetition"

// GET /api/mastery
//   ?due=1  → só tópicos vencidos pra revisão (next_review <= now)
//   (sem due) → todos os tópicos do aluno, ordenados por next_review
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ topics: [] }, { status: 401 })

  const url = new URL(req.url)
  const onlyDue = url.searchParams.get("due") === "1"

  let query = supabase
    .from("topic_mastery")
    .select("id, subject, topic, box, times_seen, times_correct, last_seen, next_review")
    .eq("user_id", user.id)
    .order("next_review", { ascending: true })
    .limit(100)

  if (onlyDue) {
    query = query.lte("next_review", new Date().toISOString())
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ topics: [] }, { status: 500 })

  const topics = (data ?? []).map((t) => ({
    ...t,
    mastery: masteryPercent(t.box as number),
  }))
  return NextResponse.json({ topics })
}

interface RecordBody {
  subject?: string
  topic?: string
  correct?: boolean
}

// POST /api/mastery  { subject, topic, correct }
// Registra uma tentativa num tópico e recalcula a caixa Leitner +
// próxima revisão. Upsert por (user, subject, topic).
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { subject, topic, correct }: RecordBody = await req.json()
  if (!subject || !topic || typeof correct !== "boolean") {
    return NextResponse.json({ error: "subject, topic e correct são obrigatórios" }, { status: 400 })
  }

  const subj = subject.trim().slice(0, 80)
  const top = topic.trim().slice(0, 120)

  // Lê estado atual (se existe).
  const { data: existing } = await supabase
    .from("topic_mastery")
    .select("box, times_seen, times_correct")
    .eq("user_id", user.id)
    .eq("subject", subj)
    .eq("topic", top)
    .maybeSingle()

  const next = applyAttempt(
    existing
      ? {
          box: existing.box as number,
          timesSeen: existing.times_seen as number,
          timesCorrect: existing.times_correct as number,
        }
      : null,
    correct,
  )

  const { error } = await supabase.from("topic_mastery").upsert(
    {
      user_id: user.id,
      subject: subj,
      topic: top,
      box: next.box,
      times_seen: next.timesSeen,
      times_correct: next.timesCorrect,
      last_seen: next.lastSeen.toISOString(),
      next_review: next.nextReview.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,subject,topic" },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    ok: true,
    box: next.box,
    mastery: masteryPercent(next.box),
    nextReview: next.nextReview.toISOString(),
  })
}
