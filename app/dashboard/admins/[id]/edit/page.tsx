import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Shield, Lock, Crown } from "lucide-react"
import { AdminEditForm } from "@/components/admins/admin-edit-form"
import { PasswordResetCard } from "@/components/admin/password-reset-card"
import { RoleChangeCard } from "@/components/admin/role-change-card"
import { EmailChangeCard } from "@/components/admin/email-change-card"
import { SUPER_ADMIN_ID, isSuperAdmin, isProtectedAccount } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

export default async function AdminEditPage({
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

  // Gestão de admins é exclusiva do super-admin (mesmo critério da lista).
  if (myProfile?.role !== "admin" || !isSuperAdmin(user.id)) {
    redirect("/dashboard")
  }

  const callerIsSuperAdmin = isSuperAdmin(user.id)

  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", id)
    .maybeSingle()

  if (!target || target.role !== "admin") {
    redirect("/dashboard/admins")
  }

  if (isProtectedAccount(id) && !callerIsSuperAdmin) {
    redirect("/dashboard/admins")
  }

  const targetIsSuper = id === SUPER_ADMIN_ID

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/admins">
                <ArrowLeft className="h-4 w-4" />
                Admins
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
            <span>Área restrita (Admin)</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display flex items-center gap-2">
              {target.full_name || target.email || "(sem nome)"}
              {targetIsSuper && <Crown className="h-6 w-6 text-amber-500" />}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{target.email}</p>
          </div>

          {targetIsSuper ? (
            // Conta do admin principal — totalmente travada por design.
            // Nem o próprio super admin pode editar a si mesmo aqui.
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-500" />
                  Conta do admin principal
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/80 space-y-2">
                <p>
                  Esta conta é blindada por segurança. <strong>Ninguém pode editar
                  nada por aqui</strong> — nem nome, nem e-mail, nem senha, nem role.
                </p>
                <p className="text-xs text-muted-foreground">
                  Pra mudar dados do admin principal, é necessário SQL direto no
                  Supabase com decisão consciente fora deste painel.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <AdminEditForm
                adminId={id}
                initialFullName={target.full_name}
                initialEmail={target.email}
                isSuper={false}
              />

              {callerIsSuperAdmin && (
                <EmailChangeCard
                  targetUserId={id}
                  initialEmail={target.email}
                />
              )}

              <PasswordResetCard
                targetUserId={id}
                targetIsAdmin={true}
                callerIsSuperAdmin={callerIsSuperAdmin}
              />
              <RoleChangeCard
                targetUserId={id}
                currentRole="admin"
                callerRole="admin"
                callerIsSuperAdmin={callerIsSuperAdmin}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
