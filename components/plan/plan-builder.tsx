"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, Clock, Sparkles } from "lucide-react"

interface GeneratedPlan {
  title: string
  goal: string
  days: Array<{
    day: number
    subject: string
    topic: string
    tasks: string[]
    estimatedMinutes: number
  }>
}

interface PlanBuilderProps {
  defaultGradeLevel?: string | null
}

export function PlanBuilder({ defaultGradeLevel }: PlanBuilderProps = {}) {
  const [goal, setGoal] = useState("")
  const [days, setDays] = useState("7")
  const [gradeLevel, setGradeLevel] = useState(defaultGradeLevel ?? "")
  const gradeLockedFromProfile = !!defaultGradeLevel
  const [weakAreas, setWeakAreas] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const router = useRouter()

  const handleGenerate = async () => {
    if (!goal.trim()) return
    setLoading(true)
    setError(null)
    setPlan(null)
    try {
      const res = await fetch("/api/study-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          days: parseInt(days, 10) || 7,
          gradeLevel: gradeLevel || null,
          weakAreas: weakAreas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error("Falha ao gerar o plano")
      const data = await res.json()
      setPlan(data.plan)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!plan) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("Você precisa estar logado")
      const { data, error } = await supabase
        .from("study_plans")
        .insert({
          user_id: userData.user.id,
          title: plan.title,
          goal: plan.goal,
          days: plan.days,
          status: "active",
        })
        .select("id")
        .single()
      if (error) throw error
      setSavedId((data as { id: string }).id)
      setTimeout(() => router.push("/dashboard/plan"), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Novo plano de estudos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal">Seu objetivo *</Label>
            <Textarea
              id="goal"
              placeholder="Ex: 'Quero tirar 800+ na redação do ENEM 2026' ou 'Preciso passar no vestibular da USP em medicina'"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <div
            className={`grid grid-cols-1 gap-4 ${
              gradeLockedFromProfile ? "sm:grid-cols-2" : ""
            }`}
          >
            <div className="space-y-2">
              <Label htmlFor="days">Duração do plano</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger id="days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias (1 semana)</SelectItem>
                  <SelectItem value="14">14 dias (2 semanas)</SelectItem>
                  <SelectItem value="21">21 dias (3 semanas)</SelectItem>
                  <SelectItem value="30">30 dias (1 mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {gradeLockedFromProfile && (
              <div className="space-y-2">
                <Label htmlFor="grade">Série</Label>
                <div
                  id="grade"
                  className="h-10 rounded-lg border border-input bg-muted/30 px-3 flex items-center text-sm text-muted-foreground"
                  title="Puxado automaticamente do seu perfil"
                >
                  {gradeLevel} <span className="ml-auto text-xs">· do perfil</span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weak">Pontos fracos (opcional)</Label>
            <Input
              id="weak"
              placeholder="Ex: crase, figuras de linguagem, física mecânica"
              value={weakAreas}
              onChange={(e) => setWeakAreas(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separe por vírgula. A IA vai incluir revisão desses pontos no plano.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!goal.trim() || loading}
            className="w-full h-11"
          >
            {loading ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Gerando plano...
              </>
            ) : (
              "Gerar plano com IA"
            )}
          </Button>
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between gap-2 flex-wrap">
              <span>{plan.title}</span>
              <Badge variant="secondary">{plan.days.length} dias</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{plan.goal}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.days.map((d) => (
              <div
                key={d.day}
                className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Dia {d.day}</Badge>
                    <span className="font-medium">{d.subject}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-foreground/80">{d.topic}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {d.estimatedMinutes} min
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {d.tasks.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !!savedId} className="flex-1">
                {saving ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Salvando...
                  </>
                ) : savedId ? (
                  "✓ Plano salvo!"
                ) : (
                  "Salvar este plano"
                )}
              </Button>
              <Button variant="outline" onClick={() => setPlan(null)}>
                Gerar outro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
