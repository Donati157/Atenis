import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Compass } from "lucide-react"
import { LeadershipEditForm } from "@/components/leaders/leadership-edit-form"
import { PasswordResetCard } from "@/components/admin/password-reset-card"
import { RoleChangeCard } from "@/components/admin/role-change-card"
import { EmailChangeCard } from "@/components/admin/email-change-card"
import { isSuperAdmin, isSuperLeadership, isProtectedAccount } from "@/lib/super-admin"
import { ROLE_LABELS, type Role } from "@/lib/roles"

export default async function LeaderEditPage({
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

  // Admin gerencia liderança. Super leadership também (gerencia outras lideranças).
  // Liderança comum não acessa.
  const callerIsAdmin = myProfile?.role === "admin"
  const callerIsSuperAdmin = isSuperAdmin(user.id)
  const callerIsSuperLeader =
    myProfile?.role === "leadership" && isSuperLeadership(user.id)
  if (!callerIsAdmin && !callerIsSuperLeader) {
    redirect("/dashboard")
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, leadership_title")
    .eq("id", id)
    .maybeSingle()

  if (!target || target.role !== "leadership") {
    redirect("/dashboard/leaders")
  }

  if (isProtectedAccount(id) && !callerIsSuperAdmin) {
    redirect("/dashboard/leaders")
  }

  // Super leadership não pode editar a si mesma por essa página
  if (callerIsSuperLeader && id === user.id) {
    redirect("/dashboard/leaders")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/leaders">
                <ArrowLeft className="h-4 w-4" />
                Liderança
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
            <Compass className="h-3.5 w-3.5 text-amber-500" />
            <span>
              Área restrita ({ROLE_LABELS[myProfile?.role as Role] ?? "Staff"})
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">
              {target.full_name || target.email || "(sem nome)"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{target.email}</p>
            {target.leadership_title && (
              <p className="text-xs text-amber-600 mt-1">{target.leadership_title}</p>
            )}
          </div>

          <LeadershipEditForm
            leadershipId={id}
            initialFullName={target.full_name}
            initialEmail={target.email}
            initialTitle={target.leadership_title}
          />

          {callerIsSuperAdmin && (
            <EmailChangeCard targetUserId={id} initialEmail={target.email} />
          )}
          <PasswordResetCard
            targetUserId={id}
            targetIsAdmin={false}
            callerIsSuperAdmin={callerIsSuperAdmin}
          />
          <RoleChangeCard
            targetUserId={id}
            currentRole="leadership"
            callerRole={callerIsAdmin ? "admin" : "leadership"}
            callerIsSuperAdmin={callerIsSuperAdmin}
            callerIsSuperLeadership={callerIsSuperLeader}
          />
        </div>
      </div>
    </div>
  )
}
