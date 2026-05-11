"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, CheckCircle2 } from "lucide-react"

interface Props {
  targetUserId: string
  initialEmail: string | null
}

export function EmailChangeCard({ targetUserId, initialEmail }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const noChange = email.trim().toLowerCase() === (initialEmail ?? "").toLowerCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(false)

    const trimmed = email.trim()
    if (!trimmed) {
      setError("E-mail não pode ser vazio.")
      return
    }
    if (noChange) {
      setError("Digite um e-mail diferente do atual.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/admin/set-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, newEmail: trimmed }),
    })
    setLoading(false)

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data?.error ?? "Erro ao trocar e-mail.")
      return
    }

    setDone(true)
    setTimeout(() => {
      setDone(false)
      router.refresh()
    }, 1200)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-accent" />
          Trocar e-mail
        </CardTitle>
        <CardDescription>
          Apenas o admin principal pode alterar o e-mail de uma conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new_email">Novo e-mail</Label>
            <Input
              id="new_email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              E-mail atualizado.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || noChange}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {loading ? "Salvando..." : "Atualizar e-mail"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
