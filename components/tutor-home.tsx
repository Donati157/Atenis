"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { Calendar, TrendingUp, AlertCircle, Sparkles, Clock, ChevronRight } from "lucide-react"
import type { LearningEventRow } from "@/lib/learning-events"
import type { StudyPlanRow } from "@/components/plan/plan-view"
import { getDisplayName } from "@/lib/display-name"

interface Props {
  userName?: string
  userEmail?: string | null
  userRole?: string | null
}

const ROLE_SUBTITLE: Record<string, string> = {
  student:
    "Aqui está o seu dia. Posso te ajudar a seguir o plano, corrigir uma prova ou tirar qualquer dúvida.",
  professor:
    "Acompanhe seus alunos, gere conteúdo de aula e tire dúvidas pedagógicas comigo.",
  leadership:
    "Acompanhe a evolução da escola, alunos e professores. Use o painel pra coordenar.",
  admin:
    "Acesso total. Gestão, conteúdo, dados — tudo aqui.",
}

export function TutorHome({ userName, userEmail, userRole }: Props) {
  const [plan, setPlan] = useState<StudyPlanRow | null>(null)
  const [events, setEvents] = useState<LearningEventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient()
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          setLoading(false)
          return
        }

        const [planRes, eventRes] = await Promise.all([
          supabase
            .from("study_plans")
            .select("*")
            .eq("user_id", userData.user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("learning_events")
            .select("*")
            .eq("user_id", userData.user.id)
            .gte(
              "created_at",
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            )
            .order("created_at", { ascending: false })
            .limit(200),
        ])

        if (planRes.data) setPlan(planRes.data as StudyPlanRow)
        if (eventRes.data) setEvents(eventRes.data as LearningEventRow[])
      } catch {
        // Se falhar (p.ex. migration não rodou), apenas não mostramos as seções.
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const today = plan?.days.find((d) => d.day === plan.current_day) || plan?.days[0] || null
  const topMistakes = computeTopMistakes(events)
  const wrongCount = events.filter((e) => e.correct === false).length
  const distinctDays = new Set(
    events.map((e) => new Date(e.created_at).toISOString().slice(0, 10)),
  ).size

  const roleKey = userRole ?? "student"
  const firstName = getDisplayName({
    fullName: userName,
    email: userEmail,
    role: userRole,
  })
  const subtitle = ROLE_SUBTITLE[roleKey] ?? ROLE_SUBTITLE.student
  const isStudent = roleKey === "student"

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 space-y-5 sm:space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display">
          Olá, {firstName} 👋
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {subtitle}
        </p>
      </div>

      {isStudent && !loading && plan && today && (
        <Card className="border-accent/40 bg-accent/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                Seu plano de hoje
              </CardTitle>
              <Badge variant="default">
                Dia {plan.current_day} de {plan.days.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium">{today.subject}</span>
                <span className="text-muted-foreground hidden sm:inline">·</span>
                <span className="text-foreground/80 break-words min-w-0">
                  {today.topic}
                </span>
                <span className="sm:ml-auto text-xs text-muted-foreground flex items-center gap-1 w-full sm:w-auto">
                  <Clock className="h-3 w-3" /> {today.estimatedMinutes} min
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {today.tasks.slice(0, 3).map((t, i) => (
                  <li key={i} className="text-foreground/80 flex items-start gap-2">
                    <span className="text-accent">•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href="/dashboard/plan">
                  Abrir plano
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isStudent && !loading && !plan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Comece com um plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Me fale seu objetivo (ENEM, vestibular, prova de inglês) e a IA monta um plano
              personalizado dia a dia.
            </p>
            <Button asChild>
              <Link href="/dashboard/plan/new">Criar plano com IA</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isStudent && !loading && topMistakes.length > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              Revisão recomendada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topMistakes.map((m) => (
              <div key={m.topic} className="text-sm">
                Você errou <strong>{m.wrong}×</strong> em{" "}
                <span className="text-yellow-400">{m.topic}</span> nos últimos 7 dias.
                <Button
                  asChild
                  variant="link"
                  size="sm"
                  className="text-yellow-400 h-auto p-0 ml-2"
                >
                  <Link href="/dashboard/insights">Ver detalhes</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isStudent && !loading && events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold font-display">{events.length}</div>
                <div className="text-xs text-muted-foreground">Atividades</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-red-400">{wrongCount}</div>
                <div className="text-xs text-muted-foreground">Erros</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{distinctDays}/7</div>
                <div className="text-xs text-muted-foreground">Dias ativos</div>
              </div>
            </div>
            <Progress value={(distinctDays / 7) * 100} className="h-2" />
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/insights">Ver insights completos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-border/50 bg-card/30 p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Ou escolha uma matéria, preparação ou correção no menu lateral ↖
        </p>
        <p className="text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> ative o <span className="text-accent">Modo Socrático</span> no
          topo pra aprender tentando, em vez de só ler respostas.
        </p>
      </div>
    </div>
  )
}

function computeTopMistakes(events: LearningEventRow[]) {
  const map = new Map<string, number>()
  for (const e of events) {
    if (e.correct === false && e.topic) {
      map.set(e.topic, (map.get(e.topic) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .filter(([, wrong]) => wrong >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, wrong]) => ({ topic, wrong }))
}
