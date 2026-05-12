import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: thread, error: threadErr } = await supabase
    .from("chat_threads")
    .select("id, title, subject, sub_subject, exam_prep, corrector, study_mode, active_learning")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (threadErr || !thread) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, parts, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })

  return NextResponse.json({ thread, messages: messages ?? [] })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("chat_threads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
