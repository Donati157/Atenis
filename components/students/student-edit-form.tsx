"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, CheckCircle2 } from "lucide-react"

const GRADE_LEVELS = [
  { value: "", label: "— sem série —" },
  { value: "6th_grade", label: "6º ano" },
  { value: "7th_grade", label: "7º ano" },
  { value: "8th_grade", label: "8º ano" },
  { value: "9th_grade", label: "9º ano" },
  { value: "10th_grade", label: "10º ano" },
  { value: "11th_grade", label: "11º ano" },
  { value: "12th_grade", label: "12º ano" },
] as const

const selectClass =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

interface Props {
  studentId: string
  initialFullName: string | null
  initialGradeLevel: string | null
  email: string | null
}

export function StudentEditForm({
  studentId,
  initialFullName,
  initialGradeLevel,
  email,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [gradeLevel, setGradeLevel] = useState(initialGradeLevel ?? "")
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
    const { error: rpcError } = await supabase.rpc("staff_update_student", {
      p_student_id: studentId,
      p_full_name: fullName.trim(),
      p_grade_level: gradeLevel || null,
    })

    setLoading(false)
    if (rpcError) {
      setError(
        rpcError.message.includes("access denied")
          ? "Você não tem permissão para editar este aluno."
          : rpcError.message.includes("not a student")
            ? "Só é possível editar contas de alunos por aqui."
            : `Erro ao salvar: ${rpcError.message}. Verifique se a migration 012_staff_update_student.sql foi executada.`,
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
        <CardTitle className="text-lg">Editar dados do aluno</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email ?? ""}
              disabled
              readOnly
              className="opacity-70 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado aqui. Peça ao aluno para usar a tela de
              recuperação/alteração.
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
            <Label htmlFor="grade">Série</Label>
            <select
              id="grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              disabled={loading}
              className={selectClass}
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g.value || "none"} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
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
