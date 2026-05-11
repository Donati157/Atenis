"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UserCog, CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SELECT_CLASS } from "@/lib/grades"
import { ROLE_LABELS, type Role } from "@/lib/roles"

type CallerRole = "admin" | "leadership"

interface Props {
  targetUserId: string
  currentRole: Role
  callerRole: CallerRole
  callerIsSuperAdmin: boolean
  callerIsSuperLeadership?: boolean
}

export function RoleChangeCard({
  targetUserId,
  currentRole,
  callerRole,
  callerIsSuperAdmin,
  callerIsSuperLeadership = false,
}: Props) {
  const router = useRouter()
  const [newRole, setNewRole] = useState<Role>(currentRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Permission matrix:
  // - Super admin: pode tudo
  // - Admin comum: tudo menos envolver admin
  // - Super leadership: tudo menos envolver admin (igual admin comum, no tier dela)
  // - Liderança comum: só student↔professor (não envolve leadership nem admin)
  const callerIsAdmin = callerRole === "admin"
  const callerIsLeader = callerRole === "leadership"
  const callerIsRegularLeader = callerIsLeader && !callerIsSuperLeadership

  const adminInvolved = currentRole === "admin" || newRole === "admin"
  const leadershipInvolved =
    currentRole === "leadership" || newRole === "leadership"

  const wouldFail =
    (adminInvolved && !callerIsSuperAdmin) ||
    (leadershipInvolved && callerIsRegularLeader)

  const noChange = newRole === currentRole

  const adminOptionDisabled = !callerIsSuperAdmin
  const leadershipOptionDisabled = callerIsRegularLeader

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(false)

    if (noChange) {
      setError("Selecione uma role diferente da atual.")
      return
    }
    if (wouldFail) {
      setError(
        adminInvolved && !callerIsSuperAdmin
          ? "Apenas o admin principal pode envolver a role admin."
          : "Liderança não pode promover/rebaixar liderança. Peça pra um admin.",
      )
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("staff_change_role", {
      p_target_id: targetUserId,
      p_new_role: newRole,
    })
    setLoading(false)

    if (rpcError) {
      setError(
        rpcError.message.includes("only super admin")
          ? "Apenas o admin principal pode envolver a role admin."
          : rpcError.message.includes("leadership cannot")
            ? "Liderança não pode promover/rebaixar liderança."
            : rpcError.message.includes("cannot demote the super admin")
              ? "O admin principal não pode ser rebaixado."
              : `Erro: ${rpcError.message}. Verifique se as migrations 019/021 foram executadas.`,
      )
      return
    }

    setDone(true)
    setTimeout(() => {
      if (newRole === "student") router.push(`/dashboard/students/${targetUserId}/edit`)
      else if (newRole === "professor") router.push(`/dashboard/teachers/${targetUserId}/edit`)
      else if (newRole === "admin") router.push(`/dashboard/admins/${targetUserId}/edit`)
      else if (newRole === "leadership") router.push(`/dashboard/leaders/${targetUserId}/edit`)
      else router.refresh()
    }, 800)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCog className="h-5 w-5 text-accent" />
          Mudar tipo de conta
        </CardTitle>
        <CardDescription>
          Atualmente: <span className="font-medium">{ROLE_LABELS[currentRole]}</span>.
          {callerIsLeader && (
            <span className="block text-xs mt-1 text-muted-foreground">
              Você é liderança — pode trocar entre Aluno e Professor. Para mexer em
              Liderança ou Admin, peça a um admin.
            </span>
          )}
          {callerIsAdmin && !callerIsSuperAdmin && (
            <span className="block text-xs mt-1 text-muted-foreground">
              Você é admin comum — pode trocar entre Aluno, Professor e Liderança.
              Apenas o admin principal envolve Admin.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new_role">Nova role</Label>
            <select
              id="new_role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              disabled={loading}
              className={SELECT_CLASS}
            >
              <option value="student">Aluno</option>
              <option value="professor">Professor</option>
              <option value="leadership" disabled={leadershipOptionDisabled}>
                Liderança {leadershipOptionDisabled ? "(só admin)" : ""}
              </option>
              <option value="admin" disabled={adminOptionDisabled}>
                Admin {adminOptionDisabled ? "(só admin principal)" : ""}
              </option>
            </select>
            {wouldFail && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Essa transição vai falhar com sua permissão.
              </p>
            )}
            {!wouldFail && !noChange && newRole !== currentRole && (
              <p className="text-xs text-muted-foreground">
                {newRole === "professor" && currentRole === "student" &&
                  "Vai limpar a série e abrir formulário de séries que leciona."}
                {newRole === "student" && currentRole === "professor" &&
                  "Vai limpar séries que leciona; precisa definir uma série."}
                {newRole === "leadership" &&
                  "Vira liderança — precisa definir cargo livre depois."}
                {newRole === "admin" &&
                  "Vira admin com poderes de gestão."}
                {currentRole === "admin" && newRole !== "admin" &&
                  "Remove poderes de admin."}
                {currentRole === "leadership" && newRole !== "leadership" &&
                  "Remove poderes de liderança."}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {done && (
            <p className="text-sm text-accent flex items-center gap-2" role="status">
              <CheckCircle2 className="h-4 w-4" />
              Role atualizada. Redirecionando...
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || noChange || wouldFail}
              className={cn(noChange && "opacity-50 cursor-not-allowed")}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCog className="h-4 w-4" />
              )}
              {loading ? "Aplicando..." : "Aplicar mudança de role"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
