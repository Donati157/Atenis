import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TeacherDetailHeader } from "@/components/teachers/teacher-detail-header"
import { TeacherEditForm } from "@/components/teachers/teacher-edit-form"
import { PasswordResetCard } from "@/components/admin/password-reset-card"
import { RoleChangeCard } from "@/components/admin/role-change-card"
import { EmailChangeCard } from "@/components/admin/email-change-card"
import { isSuperAdmin, isProtectedAccount } from "@/lib/super-admin"
import { isAdminOrLeadership } from "@/lib/roles"

export default async function TeacherEditPage({
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

  if (!isAdminOrLeadership(myProfile?.role)) {
    redirect("/dashboard")
  }

  const callerRole = myProfile?.role as "admin" | "leadership"
  const callerIsSuperAdmin = callerRole === "admin" && isSuperAdmin(user.id)

  const { data: prof } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, teaching_grades, teaching_natural_sub, teaching_assignments",
    )
    .eq("id", id)
    .maybeSingle()

  if (!prof || prof.role !== "professor") {
    redirect("/dashboard/teachers")
  }

  if (isProtectedAccount(id) && !callerIsSuperAdmin) {
    redirect("/dashboard/teachers")
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherDetailHeader
        professorId={id}
        fullName={prof.full_name}
        email={prof.email}
        teachingGrades={prof.teaching_grades as string[] | null}
        activeTab="edit"
      />
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <TeacherEditForm
            professorId={id}
            initialFullName={prof.full_name}
            initialEmail={prof.email}
            initialTeachingGrades={prof.teaching_grades as string[] | null}
            initialTeachingNaturalSub={
              prof.teaching_natural_sub as string[] | null
            }
            initialTeachingAssignments={
              (prof.teaching_assignments as Record<string, string[]> | null) ??
              null
            }
          />

          {callerIsSuperAdmin && (
            <EmailChangeCard targetUserId={id} initialEmail={prof.email} />
          )}
          <PasswordResetCard
            targetUserId={id}
            targetIsAdmin={false}
            callerIsSuperAdmin={callerIsSuperAdmin}
          />
          <RoleChangeCard
            targetUserId={id}
            currentRole="professor"
            callerRole={callerRole}
            callerIsSuperAdmin={callerIsSuperAdmin}
          />
        </div>
      </div>
    </div>
  )
}
