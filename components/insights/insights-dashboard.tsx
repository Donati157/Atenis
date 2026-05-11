"use client"

import { useMemo } from "react"
import type { LearningEventRow } from "@/lib/learning-events"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, AlertCircle, CheckCircle2, Calendar, Target } from "lucide-react"

interface Props {
  events: LearningEventRow[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function withinDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() <= days * DAY_MS
}

export function InsightsDashboard({ events }: Props) {
  const stats = useMemo(() => computeStats(events), [events])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<Target className="h-5 w-5" />}
          label="Eventos nos últimos 7 dias"
          value={stats.eventsLast7}
          accent
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
          label="Acertos na semana"
          value={stats.correctLast7}
        />
        <MetricCard
          icon={<AlertCircle className="h-5 w-5 text-yellow-400" />}
          label="Erros na semana"
          value={stats.wrongLast7}
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5 text-primary" />}
          label="Dias de estudo na semana"
          value={stats.distinctDaysLast7}
        />
      </div>

      {stats.wrongLast7 > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              Revisão recomendada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topMistakes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum tópico com padrão repetido de erro. Continue assim!
              </p>
            ) : (
              stats.topMistakes.map((m) => (
                <div key={m.topic} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/90">
                    Você errou <strong>{m.wrong}×</strong> em{" "}
                    <span className="text-yellow-400">{m.topic}</span> essa semana
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {m.subject || "geral"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Progresso por matéria (últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.subjectAccuracy.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem dados ainda — faça alguns exercícios pra começar a acompanhar.
            </p>
          ) : (
            stats.subjectAccuracy.map((s) => (
              <div key={s.subject} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{s.subject.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">
                    {s.correct}/{s.total} ({s.pct}%)
                  </span>
                </div>
                <Progress value={s.pct} className="h-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico recente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Ainda não há histórico. Comece estudando no chat ou fazendo correções!
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {events.slice(0, 15).map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-6 py-2 text-sm">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      e.correct === true
                        ? "bg-green-400"
                        : e.correct === false
                        ? "bg-red-400"
                        : "bg-muted-foreground/60"
                    }`}
                  />
                  <span className="text-foreground/90 flex-1 truncate">
                    {labelForKind(e.kind)}
                    {e.subject ? ` · ${e.subject}` : ""}
                    {e.topic ? ` / ${e.topic}` : ""}
                  </span>
                  {e.score !== null && e.score !== undefined && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {typeof e.score === "number" ? e.score.toFixed(0) : String(e.score)}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatWhen(e.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              accent ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </div>
          <div>
            <div className="text-2xl font-bold font-display">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function labelForKind(k: LearningEventRow["kind"]): string {
  switch (k) {
    case "chat_message":
      return "Mensagem no chat"
    case "exercise_answer":
      return "Exercício respondido"
    case "correction_essay":
      return "Redação corrigida"
    case "simulate_attempt":
      return "Tentativa em simulado"
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const diffMin = (Date.now() - d.getTime()) / 60000
  if (diffMin < 60) return `${Math.round(diffMin)} min atrás`
  if (diffMin < 1440) return `${Math.round(diffMin / 60)}h atrás`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function computeStats(events: LearningEventRow[]) {
  const last7 = events.filter((e) => withinDays(e.created_at, 7))
  const last30 = events.filter((e) => withinDays(e.created_at, 30))

  const correctLast7 = last7.filter((e) => e.correct === true).length
  const wrongLast7 = last7.filter((e) => e.correct === false).length

  const distinctDaysLast7 = new Set(
    last7.map((e) => new Date(e.created_at).toISOString().slice(0, 10)),
  ).size

  // Top mistakes by topic
  const topicErrors = new Map<string, { wrong: number; subject: string | null }>()
  for (const e of last7) {
    if (e.correct === false && e.topic) {
      const cur = topicErrors.get(e.topic) ?? { wrong: 0, subject: e.subject ?? null }
      cur.wrong += 1
      if (!cur.subject && e.subject) cur.subject = e.subject
      topicErrors.set(e.topic, cur)
    }
  }
  const topMistakes = Array.from(topicErrors.entries())
    .filter(([, v]) => v.wrong >= 2)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 5)
    .map(([topic, v]) => ({ topic, wrong: v.wrong, subject: v.subject }))

  // Accuracy per subject (30 days)
  const subjectStats = new Map<string, { total: number; correct: number }>()
  for (const e of last30) {
    if (e.correct === null || e.correct === undefined) continue
    if (!e.subject) continue
    const cur = subjectStats.get(e.subject) ?? { total: 0, correct: 0 }
    cur.total += 1
    if (e.correct) cur.correct += 1
    subjectStats.set(e.subject, cur)
  }
  const subjectAccuracy = Array.from(subjectStats.entries())
    .map(([subject, v]) => ({
      subject,
      total: v.total,
      correct: v.correct,
      pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return {
    eventsLast7: last7.length,
    correctLast7,
    wrongLast7,
    distinctDaysLast7,
    topMistakes,
    subjectAccuracy,
  }
}
