import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { InsightsDashboard } from "@/components/insights/insights-dashboard"
import { StudentDetailHeader } from "@/components/students/student-detail-header"
import type { LearningEventRow } from "@/lib/learning-events"

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const role = myProfile?.role
  if (role !== "professor" && role !== "admin") {
    redirect("/dashboard")
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email, grade_level, role")
    .eq("id", id)
    .maybeSingle()

  if (!student) {
    redirect("/dashboard/students")
  }

  const { data: events, error } = await supabase.rpc("list_events_for_user", {
    target_user_id: id,
    limit_rows: 500,
  })

  if (error) {
    console.error("[students/progress] list_events_for_user failed:", error.message)
  }

  const list: LearningEventRow[] = (events as LearningEventRow[] | null) ?? []

  return (
    <div className="min-h-screen bg-background">
      <StudentDetailHeader
        studentId={id}
        fullName={student.full_name}
        email={student.email}
        gradeLevel={student.grade_level}
        staffRoleLabel={role === "admin" ? "Admin" : "Professor"}
        activeTab="progress"
      />
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          {list.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/50 bg-card/40 p-8 text-center text-sm text-muted-foreground">
                Este aluno ainda não tem atividades registradas.
                <br />
                Assim que ele usar o chat, corrigir uma redação ou fazer um exercício, os dados
                aparecem aqui.
              </div>
              {error && (
                <details className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-200/80">
                  <summary className="cursor-pointer font-medium">
                    Aviso técnico (só staff vê)
                  </summary>
                  <p className="mt-2">
                    A consulta ao banco falhou: <code>{error.message}</code>. Se for sobre a
                    função <code>list_events_for_user</code> não existir, rode a migration{" "}
                    <code>013_fix_events_rpc.sql</code> no Supabase. Enquanto isso, esta página
                    mostra como se não houvesse atividades.
                  </p>
                </details>
              )}
            </div>
          ) : (
            <InsightsDashboard events={list} />
          )}
        </div>
      </div>
    </div>
  )
}
