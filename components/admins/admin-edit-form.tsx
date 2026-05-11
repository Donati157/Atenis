"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, CheckCircle2, Crown } from "lucide-react"

interface Props {
  adminId: string
  initialFullName: string | null
  initialEmail: string | null
  isSuper: boolean
}

export function AdminEditForm({
  adminId,
  initialFullName,
  initialEmail,
  isSuper,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!fullName.trim()) {
      setError("Nome completo não pode ficar vazio.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("staff_update_admin_name", {
      p_admin_id: adminId,
      p_full_name: fullName.trim(),
    })
    setLoading(false)

    if (rpcError) {
      setError(
        rpcError.message.includes("access denied")
          ? "Você não tem permissão."
          : `Erro ao salvar: ${rpcError.message}. Verifique se a migration 019_super_admin_role_change.sql foi executada.`,
      )
      return
    }

    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Editar dados do admin
          {isSuper && (
            <span className="text-xs font-normal flex items-center gap-1 text-amber-600 ml-2">
              <Crown className="h-3.5 w-3.5" />
              Admin principal
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={initialEmail ?? ""}
              disabled
              readOnly
              className="opacity-70 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado por aqui.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-sm text-accent flex items-center gap-2" role="status">
              <CheckCircle2 className="h-4 w-4" />
              Alterações salvas com sucesso.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
