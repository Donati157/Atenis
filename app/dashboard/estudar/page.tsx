// app/dashboard/estudar/page.tsx
//
// Página SESSÃO GUIADA — nova experiência principal do Atenis conectada
// ao Runtime pedagógico vNext (via /api/vnext/session, OpenAI direto).
//
// Coexiste com /dashboard (chat livre legacy /api/chat) — aluno escolhe
// a experiência pelo sidebar.

import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StudySession } from "@/components/study-session"

export const dynamic = "force-dynamic"

// Mapeamento profile.grade_level (Supabase) → grade code vNext (curriculum/grades.ts).
function mapGrade(gradeLevel: string | null | undefined): {
  grade?: string
  schoolStage?: string
} {
  if (!gradeLevel) return {}
  const map: Record<string, { grade: string; schoolStage: string }> = {
    "6th_grade": { grade: "6", schoolStage: "middle" },
    "7th_grade": { grade: "7", schoolStage: "middle" },
    "8th_grade": { grade: "8", schoolStage: "middle" },
    "9th_grade": { grade: "9", schoolStage: "middle" },
    "10th_grade": { grade: "EM01", schoolStage: "high" },
    "11th_grade": { grade: "EM02", schoolStage: "high" },
    "12th_grade": { grade: "EM03", schoolStage: "high" },
  }
  return map[gradeLevel] ?? {}
}

export default async function EstudarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login?next=/dashboard/estudar")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, grade_level")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    redirect("/auth/complete")
  }

  const { grade, schoolStage } = mapGrade(profile.grade_level)
  const studentName = profile.full_name || "estudante"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
          <span className="text-xs text-muted-foreground">
            Sessão guiada · beta
          </span>
        </div>
      </header>
      <StudySession
        studentName={studentName}
        subject="matematica"
        grade={grade}
        schoolStage={schoolStage}
        topic="funcao-quadratica"
      />
    </div>
  )
}
