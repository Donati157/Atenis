import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ threads: [] }, { status: 401 })

  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, subject, exam_prep, study_mode, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ threads: [] }, { status: 500 })
  return NextResponse.json({ threads: data ?? [] })
}
