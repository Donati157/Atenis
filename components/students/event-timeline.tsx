"use client"

import { useMemo, useState } from "react"
import type { LearningEventRow } from "@/lib/learning-events"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageSquare,
  Pencil,
  CheckSquare,
  Target,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

interface Props {
  events: LearningEventRow[]
}

export function EventTimeline({ events }: Props) {
  const [filter, setFilter] = useState<string>("all")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (filter === "all") return events
    return events.filter((e) => e.kind === filter)
  }, [events, filter])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            <SelectItem value="chat_message">Mensagens no chat</SelectItem>
            <SelectItem value="correction_essay">Correções de redação</SelectItem>
            <SelectItem value="exercise_answer">Respostas de exercícios</SelectItem>
            <SelectItem value="simulate_attempt">Tentativas em simulado</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} eventos</Badge>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {events.length === 0
              ? "Este aluno ainda não tem histórico registrado."
              : "Nenhum evento corresponde ao filtro."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, dateLabel, events: dayEvents }) => (
            <div key={date}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {dateLabel} · {dayEvents.length} evento{dayEvents.length === 1 ? "" : "s"}
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {dayEvents.map((e) => {
                      const isExpanded = expandedIds.has(e.id)
                      const hasDetail =
                        (e.metadata &&
                          Object.keys(e.metadata as Record<string, unknown>).length > 0) ||
                        e.topic ||
                        e.score !== null
                      return (
                        <div key={e.id} className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(e.id)}
                            disabled={!hasDetail}
                            className="w-full flex items-center gap-3 text-left disabled:cursor-default"
                          >
                            <div className="h-8 w-8 shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                              {iconFor(e.kind)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-foreground">
                                {labelForKind(e.kind)}
                                {e.subject && (
                                  <span className="text-muted-foreground">
                                    {" · "}
                                    {e.subject}
                                  </span>
                                )}
                              </div>
                              {e.topic && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {e.topic}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {e.score !== null && e.score !== undefined && (
                                <Badge
                                  className={scoreBadgeClass(
                                    e.score,
                                    (e.metadata as { max?: number })?.max,
                                  )}
                                >
                                  {formatScore(e.score, (e.metadata as { max?: number })?.max)}
                                </Badge>
                              )}
                              {e.correct === true && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  ✓ acerto
                                </Badge>
                              )}
                              {e.correct === false && (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                  ✗ erro
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatTime(e.created_at)}
                              </span>
                              {hasDetail &&
                                (isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                ))}
                            </div>
                          </button>
                          {isExpanded && e.metadata && (
                            <pre className="mt-3 ml-11 p-3 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground overflow-x-auto">
                              {JSON.stringify(e.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function iconFor(kind: LearningEventRow["kind"]) {
  switch (kind) {
    case "chat_message":
      return <MessageSquare className="h-4 w-4" />
    case "correction_essay":
      return <Pencil className="h-4 w-4" />
    case "exercise_answer":
      return <CheckSquare className="h-4 w-4" />
    case "simulate_attempt":
      return <Target className="h-4 w-4" />
  }
}

function labelForKind(k: LearningEventRow["kind"]): string {
  switch (k) {
    case "chat_message":
      return "Mensagem no chat"
    case "correction_essay":
      return "Correção de redação"
    case "exercise_answer":
      return "Exercício respondido"
    case "simulate_attempt":
      return "Tentativa em simulado"
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatScore(score: number, max?: number): string {
  if (max) return `${Math.round(score)}/${max}`
  if (score >= 0 && score <= 100) return `${Math.round(score)}%`
  return String(score)
}

function scoreBadgeClass(score: number, max?: number): string {
  const pct = max ? (score / max) * 100 : score
  if (pct >= 80) return "bg-green-500/20 text-green-400 border-green-500/30"
  if (pct >= 60) return "bg-blue-500/20 text-blue-400 border-blue-500/30"
  if (pct >= 40) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  return "bg-red-500/20 text-red-400 border-red-500/30"
}

function groupByDate(events: LearningEventRow[]) {
  const groups = new Map<string, LearningEventRow[]>()
  for (const e of events) {
    const key = new Date(e.created_at).toISOString().slice(0, 10)
    const arr = groups.get(key) ?? []
    arr.push(e)
    groups.set(key, arr)
  }
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)

  return Array.from(groups.entries()).map(([date, evs]) => {
    let dateLabel: string
    if (date === today) dateLabel = "Hoje"
    else if (date === yesterday) dateLabel = "Ontem"
    else
      dateLabel = new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    return { date, dateLabel, events: evs }
  })
}
