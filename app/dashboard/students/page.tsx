import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StudentsList, type Student } from "@/components/students/students-list"
import { ArrowLeft, Shield } from "lucide-react"
import { isStaffRole, ROLE_LABELS } from "@/lib/roles"

export const dynamic = "force-dynamic"

export default async function StudentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle()

  const role = myProfile?.role
  if (!isStaffRole(role)) {
    redirect("/dashboard")
  }

  const { data: students, error } = await supabase.rpc("list_students_for_staff")

  const list: Student[] = (students as Student[] | null) ?? []

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/50 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/logo.jpeg"
                alt="Atenis"
                width={28}
                height={28}
                className="rounded-full ring-1 ring-border/50"
              />
              <span className="font-semibold font-display">Atenis</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span>Área restrita ({role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? "Staff" : "Staff"})</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">Alunos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Histórico dos estudantes cadastrados. Visível apenas para professores e admins.
            </p>
          </div>

          {error ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
              Erro ao carregar estudantes: {error.message}. Verifique se a migration{" "}
              <code className="font-mono">009_staff_access.sql</code> foi executada no Supabase.
            </div>
          ) : (
            <StudentsList students={list} />
          )}
        </div>
      </div>
    </div>
  )
}
