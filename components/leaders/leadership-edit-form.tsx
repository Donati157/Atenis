"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, CheckCircle2 } from "lucide-react"

interface Props {
  leadershipId: string
  initialFullName: string | null
  initialEmail: string | null
  initialTitle: string | null
}

export function LeadershipEditForm({
  leadershipId,
  initialFullName,
  initialEmail,
  initialTitle,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [title, setTitle] = useState(initialTitle ?? "")
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
    const { error: rpcError } = await supabase.rpc("staff_update_leadership", {
      p_leadership_id: leadershipId,
      p_full_name: fullName.trim(),
      // Cargo é opcional — passa null (preserva existente) se vazio,
      // ou string vazia (limpa) se usuário apagou de propósito.
      p_leadership_title: title,
    })
    setLoading(false)

    if (rpcError) {
      setError(
        rpcError.message.includes("access denied")
          ? "Você não tem permissão (precisa ser admin)."
          : `Erro ao salvar: ${rpcError.message}. Verifique se a migration 021_leadership_role.sql foi executada.`,
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
        <CardTitle className="text-lg">Editar dados da liderança</CardTitle>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="leadership_title">Cargo (opcional)</Label>
            <Input
              id="leadership_title"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="Ex: Diretora, Coordenadora pedagógica"
            />
            <p className="text-xs text-muted-foreground">
              Texto livre — descreve a função na escola. Pode deixar em branco.
            </p>
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
