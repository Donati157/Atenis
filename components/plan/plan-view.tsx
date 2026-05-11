"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock, ChevronRight, Pause, Trash2 } from "lucide-react"

export interface StudyPlanRow {
  id: string
  title: string
  goal: string | null
  days: Array<{
    day: number
    subject: string
    topic: string
    tasks: string[]
    estimatedMinutes: number
  }>
  current_day: number
  status: string
  created_at: string
}

interface Props {
  plans: StudyPlanRow[]
}

export function PlanView({ plans }: Props) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Você ainda não tem um plano de estudos.</p>
          <Button onClick={() => router.push("/dashboard/plan/new")}>Criar plano com IA</Button>
        </CardContent>
      </Card>
    )
  }

  const advance = async (planId: string, currentDay: number, total: number) => {
    setUpdating(planId)
    try {
      const supabase = createClient()
      const nextDay = Math.min(currentDay + 1, total)
      const newStatus = nextDay >= total ? "completed" : "active"
      await supabase
        .from("study_plans")
        .update({ current_day: nextDay, status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", planId)
      router.refresh()
    } finally {
      setUpdating(null)
    }
  }

  const togglePause = async (planId: string, status: string) => {
    setUpdating(planId)
    try {
      const supabase = createClient()
      await supabase
        .from("study_plans")
        .update({ status: status === "paused" ? "active" : "paused" })
        .eq("id", planId)
      router.refresh()
    } finally {
      setUpdating(null)
    }
  }

  const deletePlan = async (planId: string) => {
    if (!confirm("Tem certeza que quer apagar este plano?")) return
    setUpdating(planId)
    try {
      const supabase = createClient()
      await supabase.from("study_plans").delete().eq("id", planId)
      router.refresh()
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      {plans.map((plan) => {
        const total = plan.days.length
        const cur = plan.current_day
        const pct = Math.round((Math.min(cur - 1, total) / total) * 100)
        const today = plan.days.find((d) => d.day === cur) || plan.days[0]
        const isCompleted = plan.status === "completed"
        const isPaused = plan.status === "paused"

        return (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{plan.title}</CardTitle>
                  {plan.goal && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.goal}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isCompleted && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Concluído</Badge>}
                  {isPaused && <Badge variant="secondary">Pausado</Badge>}
                  {!isCompleted && !isPaused && <Badge>Ativo</Badge>}
                </div>
              </div>
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Dia {Math.min(cur, total)} de {total}</span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isCompleted && today && (
                <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Hoje · Dia {today.day}</Badge>
                      <span className="font-medium">{today.subject}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground/80">{today.topic}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {today.estimatedMinutes} min
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {today.tasks.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-foreground/90">{t}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => advance(plan.id, cur, total)}
                      disabled={updating === plan.id}
                    >
                      Marcar dia como concluído
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePause(plan.id, plan.status)}
                      disabled={updating === plan.id}
                    >
                      <Pause className="h-4 w-4" />
                      {isPaused ? "Retomar" : "Pausar"}
                    </Button>
                  </div>
                </div>
              )}

              <details className="rounded-lg border border-border/60 bg-card/40">
                <summary className="cursor-pointer px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Ver plano completo ({total} dias)
                </summary>
                <div className="px-4 pb-3 pt-1 space-y-2">
                  {plan.days.map((d) => (
                    <div
                      key={d.day}
                      className={`text-sm p-2 rounded ${
                        d.day === cur
                          ? "bg-accent/10 text-accent"
                          : d.day < cur
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      <strong>Dia {d.day}</strong> · {d.subject} — {d.topic}
                      <span className="text-muted-foreground text-xs"> · {d.estimatedMinutes} min</span>
                    </div>
                  ))}
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePlan(plan.id)}
                  disabled={updating === plan.id}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={() => router.push("/dashboard/plan/new")}>
          + Novo plano
        </Button>
      </div>
    </div>
  )
}
