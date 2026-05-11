"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, KeyRound, CheckCircle2, ShieldAlert } from "lucide-react"

interface Props {
  targetUserId: string
  targetIsAdmin: boolean
  callerIsSuperAdmin: boolean
}

export function PasswordResetCard({
  targetUserId,
  targetIsAdmin,
  callerIsSuperAdmin,
}: Props) {
  const blocked = targetIsAdmin && !callerIsSuperAdmin

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(false)

    if (password.length < 6) {
      setError("Senha precisa ter pelo menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, newPassword: password }),
    })
    setLoading(false)

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data?.error ?? "Erro ao trocar a senha.")
      return
    }

    setDone(true)
    setPassword("")
    setConfirm("")
    setTimeout(() => setDone(false), 4000)
  }

  if (blocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            Trocar senha
          </CardTitle>
          <CardDescription>
            Apenas o admin principal pode trocar a senha de outro admin.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-accent" />
          Trocar senha
        </CardTitle>
        <CardDescription>
          Defina uma senha nova. O usuário vai precisar usá-la no próximo login.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new_password">Nova senha</Label>
            <Input
              id="new_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm_password">Confirmar senha</Label>
            <Input
              id="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {done && (
            <p className="text-sm text-accent flex items-center gap-2" role="status">
              <CheckCircle2 className="h-4 w-4" />
              Senha atualizada. Avise o usuário.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {loading ? "Salvando..." : "Definir nova senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
