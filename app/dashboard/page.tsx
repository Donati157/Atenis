import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatDashboard } from "@/components/chat-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  // Sem profile: o trigger pode ter falhado silenciosamente ou alguém apagou.
  // Manda pro /auth/complete que cria via RPC e pede dados faltantes.
  // Isso garante que TODO usuário logado apareça na Gestão (exceto os marcados
  // como hidden_from_staff).
  if (!profile) {
    redirect("/auth/complete")
  }

  // Enforcement: aluno precisa ter série, professor precisa ter pelo menos
  // uma série que leciona. Sem isso, manda completar antes de entrar.
  // Admin não tem essa exigência.
  const role = profile.role
  const studentMissingGrade = role === "student" && !profile.grade_level
  const teacherMissingGrades =
    role === "professor" &&
    (!Array.isArray(profile.teaching_grades) ||
      profile.teaching_grades.length === 0)
  if (studentMissingGrade || teacherMissingGrades) {
    redirect("/auth/complete")
  }

  return <ChatDashboard user={user} profile={profile} />
}
