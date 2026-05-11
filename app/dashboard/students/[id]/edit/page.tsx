import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentDetailHeader } from "@/components/students/student-detail-header"
import { StudentEditForm } from "@/components/students/student-edit-form"
import { PasswordResetCard } from "@/components/admin/password-reset-card"
import { RoleChangeCard } from "@/components/admin/role-change-card"
import { EmailChangeCard } from "@/components/admin/email-change-card"
import { isSuperAdmin, isProtectedAccount } from "@/lib/super-admin"
import { isStaffRole, isAdminOrLeadership, ROLE_LABELS } from "@/lib/roles"

export default async function StudentEditPage({
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
  if (!isStaffRole(role)) {
    redirect("/dashboard")
  }

  const callerCanAdmin = isAdminOrLeadership(role)
  const callerIsSuperAdmin = role === "admin" && isSuperAdmin(user.id)

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email, grade_level, role")
    .eq("id", id)
    .maybeSingle()

  if (!student || student.role !== "student") {
    redirect("/dashboard/students")
  }

  // Conta protegida: só super admin pode editar
  if (isProtectedAccount(id) && !callerIsSuperAdmin) {
    redirect("/dashboard/students")
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentDetailHeader
        studentId={id}
        fullName={student.full_name}
        email={student.email}
        gradeLevel={student.grade_level}
        staffRoleLabel={role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? "Staff" : "Staff"}
        activeTab="edit"
      />
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <StudentEditForm
            studentId={id}
            initialFullName={student.full_name}
            initialGradeLevel={student.grade_level}
            email={student.email}
          />

          {callerCanAdmin && (
            <>
              {callerIsSuperAdmin && (
                <EmailChangeCard targetUserId={id} initialEmail={student.email} />
              )}
              <PasswordResetCard
                targetUserId={id}
                targetIsAdmin={false}
                callerIsSuperAdmin={callerIsSuperAdmin}
              />
              <RoleChangeCard
                targetUserId={id}
                currentRole="student"
                callerRole={role as "admin" | "leadership"}
                callerIsSuperAdmin={callerIsSuperAdmin}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
