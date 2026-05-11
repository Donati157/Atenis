"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, CheckCircle2 } from "lucide-react"
import { TeachingPicker } from "@/components/teaching-picker"
import {
  cleanAssignments,
  countAssignments,
  type TeachingAssignments,
} from "@/lib/grades"

interface Props {
  professorId: string
  initialFullName: string | null
  initialEmail: string | null
  initialTeachingGrades: string[] | null
  initialTeachingNaturalSub: string[] | null
  initialTeachingAssignments: TeachingAssignments | null
}

export function TeacherEditForm({
  professorId,
  initialFullName,
  initialEmail,
  initialTeachingGrades,
  initialTeachingNaturalSub,
  initialTeachingAssignments,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [assignments, setAssignments] = useState<TeachingAssignments>(() => {
    if (initialTeachingAssignments) return initialTeachingAssignments
    const out: TeachingAssignments = {}
    if (initialTeachingGrades) {
      for (const g of initialTeachingGrades) out[g] = []
    }
    return out
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const totalAssignments = useMemo(
    () => countAssignments(assignments),
    [assignments],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!fullName.trim()) {
      setError("Nome completo não pode ficar vazio.")
      return
    }
    if (totalAssignments === 0) {
      setError("Selecione pelo menos uma matéria em alguma série.")
      return
    }

    const clean = cleanAssignments(assignments)

    setLoading(true)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("staff_update_professor", {
      p_professor_id: professorId,
      p_full_name: fullName.trim(),
      p_teaching_grades: Object.keys(clean),
      p_teaching_natural_sub: initialTeachingNaturalSub,
      p_teaching_assignments: clean,
    })

    setLoading(false)
    if (rpcError) {
      setError(
        rpcError.message.includes("access denied")
          ? "Você não tem permissão (precisa ser admin)."
          : rpcError.message.includes("not a professor")
            ? "Esta conta não é de professor."
            : `Erro ao salvar: ${rpcError.message}. Verifique se a migration 018_teaching_assignments.sql foi executada.`,
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
        <CardTitle className="text-lg">Editar dados do professor</CardTitle>
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

          <TeachingPicker
            assignments={assignments}
            onChange={setAssignments}
            disabled={loading}
            helperText="Marque as séries que ele leciona; em cada uma, escolha as matérias."
          />

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

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
