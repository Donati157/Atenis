"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Code2,
  Trash2,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CalendarEvent,
  CalendarGrid,
  EventList,
  EventScheduler,
  StudyEvent,
  ExamEvent,
  AssignmentEvent,
  eventFromJSON,
  isStudyEvent,
  isExamEvent,
  isAssignmentEvent,
  isSchoolDayEvent,
  buildJoseSchedule,
  getJoseScheduleDateKeys,
  type EventCategory,
  type SerializedEvent,
} from "@/lib/calendar"
import { ConceptPanel } from "@/components/calendar/concept-panel"
import { EventForm } from "@/components/calendar/event-form"

interface CalendarClientProps {
  userId: string
}

const STORAGE_PREFIX = "atenis.calendar."

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

// Tira o array de SerializedEvent do localStorage e devolve uma EventList
// fresca (com instâncias reais das subclasses).
function loadEvents(userId: string): EventList {
  if (typeof window === "undefined") return new EventList()
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return new EventList()
    const arr = JSON.parse(raw) as SerializedEvent[]
    const list = new EventList()
    for (const r of arr) list.add(eventFromJSON(r))
    return list
  } catch {
    return new EventList()
  }
}

function saveEvents(userId: string, list: EventList): void {
  if (typeof window === "undefined") return
  try {
    const arr = list.toArray().map((ev) => ev.toJSON())
    window.localStorage.setItem(storageKey(userId), JSON.stringify(arr))
  } catch {
    // ignora — quota cheia / modo privado
  }
}

export function CalendarClient({ userId }: CalendarClientProps) {
  // Cursor mensal — começa no mês atual.
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // Lista de eventos (mantida como EventList para mostrar a API do CED).
  // O state guarda um "tick" — cada mutação incrementa para forçar re-render.
  const [list, setList] = useState<EventList>(() => new EventList())
  const [, setTick] = useState(0)
  const bump = () => setTick((t) => t + 1)

  // Dia selecionado para mostrar a lista do dia / criar evento ali.
  const [selected, setSelected] = useState<{
    year: number
    month: number
    day: number
  } | null>(null)

  // Modal de criação.
  const [formOpen, setFormOpen] = useState(false)

  // Carrega do localStorage uma vez no mount.
  useEffect(() => {
    const loaded = loadEvents(userId)
    setList(loaded)
  }, [userId])

  // Persiste sempre que mudar o tamanho da lista ou um item.
  // Note: a EventList é mutada in-place; bump força a re-renderização e
  // dispara este efeito.
  useEffect(() => {
    saveEvents(userId, list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, userId])

  const grid = useMemo(() => new CalendarGrid(year, month), [year, month])

  // Agrupamento por dia para acesso O(1) na renderização.
  const byDay = useMemo(() => {
    // bump no state força recálculo via list reference; useMemo quebra
    // só pela dep `list`, mas como nós fazemos saveEvents no mesmo effect
    // e mantemos a referência, o `tick` no array de deps abaixo garante.
    return EventScheduler.groupByDay(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, list.size()])

  const counts = useMemo(() => list.countByCategory(), [list, list.size()])
  const sorted = useMemo(() => list.sortedByDate(), [list, list.size()])
  const next = useMemo(() => {
    const sortedList = new EventList(sorted)
    return EventScheduler.nextUpcoming(sortedList)
  }, [sorted])

  const goPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const goToday = () => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelected({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    })
  }

  const handleAddEvent = (data: {
    kind: EventCategory
    title: string
    date: Date
    description: string
    subject?: string
    durationMinutes?: number
    exam?: string
  }) => {
    let event: CalendarEvent
    if (data.kind === "study") {
      event = new StudyEvent(
        data.title,
        data.date,
        data.subject ?? "",
        data.durationMinutes ?? 30,
        data.description,
      )
    } else if (data.kind === "exam") {
      event = new ExamEvent(
        data.title,
        data.date,
        data.exam ?? "ENEM",
        data.description,
      )
    } else {
      event = new AssignmentEvent(
        data.title,
        data.date,
        data.subject ?? "",
        data.description,
      )
    }
    list.add(event)
    bump()
    setFormOpen(false)
  }

  const handleDelete = (id: string) => {
    list.removeById(id)
    bump()
  }

  // Carrega a agenda da persona José.
  // Idempotente: remove qualquer SchoolDayEvent existente nas datas
  // cobertas, depois adiciona os novos. Re-clicar não duplica.
  const handleLoadJoseSchedule = () => {
    const targetDates = getJoseScheduleDateKeys()
    // Unit 4: traverse reverso para remover seguro durante iteração.
    const arr = list.toArray()
    for (let i = arr.length - 1; i >= 0; i--) {
      const ev = arr[i]
      if (ev.getCategory() !== "school_day") continue
      const d = ev.getDate()
      const key = EventScheduler.dayKey(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      )
      if (targetDates.has(key)) list.removeById(ev.getId())
    }
    for (const ev of buildJoseSchedule()) list.add(ev)
    // Pula o cursor para o mês da agenda (maio/2026).
    setYear(2026)
    setMonth(4) // maio = índice 4
    bump()
  }

  const selectedEvents = selected
    ? list.filterByDate(selected.year, selected.month, selected.day)
    : null

  const isSameDate = (
    cell: { year: number; month: number; day: number },
    target: { year: number; month: number; day: number } | null,
  ) =>
    target !== null &&
    cell.year === target.year &&
    cell.month === target.month &&
    cell.day === target.day

  const todayCell = {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* Coluna principal: navegação + grade + dia selecionado */}
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goPrevMonth}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goNextMonth}
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToday}>
                  Hoje
                </Button>
              </div>
              <CardTitle className="text-xl font-display">
                {CalendarGrid.monthName(month)} {year}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLoadJoseSchedule}
                  title="Carrega a agenda da persona José (15 dias letivos em maio/2026)"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Agenda do José</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const sel =
                      selected ??
                      {
                        year: todayCell.year,
                        month: todayCell.month,
                        day: todayCell.day,
                      }
                    setSelected(sel)
                    setFormOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo evento</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Cabeçalho da semana */}
            <div className="grid grid-cols-7 mb-2">
              {CalendarGrid.weekdayHeaders().map((h) => (
                <div
                  key={h}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground text-center py-1"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Grade 6×7 — Unit 8 (2D Arrays) renderizada com nested map */}
            <div className="grid grid-cols-7 gap-1">
              {grid.getCells().flatMap((row, r) =>
                row.map((cell, c) => {
                  const key = EventScheduler.dayKey(
                    cell.year,
                    cell.month,
                    cell.day,
                  )
                  const dayEvents = byDay.get(key)
                  const evCount = dayEvents?.size() ?? 0
                  const isToday =
                    cell.year === todayCell.year &&
                    cell.month === todayCell.month &&
                    cell.day === todayCell.day
                  const isSel = isSameDate(cell, selected)
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() =>
                        setSelected({
                          year: cell.year,
                          month: cell.month,
                          day: cell.day,
                        })
                      }
                      className={cn(
                        "h-20 sm:h-24 rounded-lg border text-left p-1.5 flex flex-col gap-1 transition-colors",
                        cell.inMonth
                          ? "bg-card hover:bg-secondary/50 border-border/60"
                          : "bg-secondary/20 text-muted-foreground/60 border-border/30",
                        isToday &&
                          "ring-1 ring-accent border-accent/60",
                        isSel && "bg-accent/10 border-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isToday && "text-accent",
                        )}
                      >
                        {cell.day}
                      </span>
                      {dayEvents && evCount > 0 && (
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {dayEvents
                            .toArray()
                            .slice(0, 2)
                            .map((ev) => (
                              <span
                                key={ev.getId()}
                                className={cn(
                                  "text-[10px] px-1 py-0.5 rounded border truncate",
                                  ev.getColor(),
                                )}
                                title={ev.toString()}
                              >
                                <span className="mr-1">{ev.getIcon()}</span>
                                {ev.getTitle()}
                              </span>
                            ))}
                          {evCount > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{evCount - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                }),
              )}
            </div>
          </CardContent>
        </Card>

        {/* Painel do dia selecionado */}
        {selected && (
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">
                  {selected.day} de {CalendarGrid.monthName(selected.month)},{" "}
                  {selected.year}
                </CardTitle>
                <CardDescription>
                  {selectedEvents && selectedEvents.size() > 0
                    ? `${selectedEvents.size()} evento${selectedEvents.size() > 1 ? "s" : ""}`
                    : "Nenhum evento neste dia"}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEvents && selectedEvents.size() > 0 ? (
                selectedEvents.toArray().map((ev) => (
                  <EventCard
                    key={ev.getId()}
                    event={ev}
                    onDelete={() => handleDelete(ev.getId())}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Clique em "Adicionar" para criar um evento neste dia.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Coluna lateral: estatísticas + conceitos AP CS */}
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo</CardTitle>
            <CardDescription>
              Total: {list.size()} evento{list.size() === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Stat
              label="Estudo"
              icon="📖"
              value={counts.study}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <Stat
              label="Provas"
              icon="📝"
              value={counts.exam}
              color="text-rose-600 dark:text-rose-400"
            />
            <Stat
              label="Tarefas"
              icon="📌"
              value={counts.assignment}
              color="text-amber-600 dark:text-amber-400"
            />
            <Stat
              label="Dias letivos"
              icon="🏫"
              value={counts.school_day}
              color="text-blue-600 dark:text-blue-400"
            />
            {next && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Próximo evento
                </p>
                <div
                  className={cn(
                    "text-xs px-2 py-1.5 rounded border",
                    next.getColor(),
                  )}
                >
                  <span className="mr-1">{next.getIcon()}</span>
                  {next.getTitle()} — {next.getDate().toLocaleDateString("pt-BR")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ConceptPanel />
      </div>

      {formOpen && (
        <EventForm
          initialDate={
            selected
              ? new Date(selected.year, selected.month, selected.day, 9, 0)
              : new Date()
          }
          onCancel={() => setFormOpen(false)}
          onSubmit={handleAddEvent}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Componentes auxiliares locais
// ─────────────────────────────────────────────

function Stat({
  label,
  icon,
  value,
  color,
}: {
  label: string
  icon: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-foreground/80">{label}</span>
      </span>
      <span className={cn("font-semibold tabular-nums", color)}>{value}</span>
    </div>
  )
}

function EventCard({
  event,
  onDelete,
}: {
  event: CalendarEvent
  onDelete: () => void
}) {
  // Polimorfismo (Unit 9): event.getCategory() despacha para o método
  // certo da subclass; idem getColor/getIcon. Aqui usamos type guards
  // para extrair detalhes específicos da subclasse.
  let detail: string | null = null
  if (isStudyEvent(event)) {
    detail = `${event.getSubject() || "Estudo"} · ${event.getDurationMinutes()} min`
  } else if (isExamEvent(event)) {
    detail = `Prova: ${event.getExam()}`
  } else if (isAssignmentEvent(event)) {
    detail = `Matéria: ${event.getSubject() || "—"}`
  } else if (isSchoolDayEvent(event)) {
    detail = `Rotação Concept SP · ${event.countAcademicPeriods()} aulas acadêmicas`
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 flex items-start justify-between gap-3",
        event.getColor(),
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm flex items-center gap-1.5">
          <span>{event.getIcon()}</span>
          <span className="truncate">{event.getTitle()}</span>
        </div>
        {detail && (
          <p className="text-xs opacity-80 mt-0.5">{detail}</p>
        )}
        {isSchoolDayEvent(event) && (
          <ul className="mt-2 space-y-0.5 text-xs">
            {event.getPeriods().map((p) => (
              <li
                key={p.getIndex()}
                className={cn(
                  "flex items-center gap-2",
                  p.isAcademic() ? "" : "opacity-60 italic",
                )}
              >
                <span className="font-mono tabular-nums opacity-70 w-24 shrink-0">
                  {p.getStartLabel()}–{p.getEndLabel()}
                </span>
                <span className="truncate">{p.getSubject()}</span>
              </li>
            ))}
          </ul>
        )}
        {event.getDescription() && !isSchoolDayEvent(event) && (
          <p className="text-xs opacity-80 mt-1 whitespace-pre-wrap">
            {event.getDescription()}
          </p>
        )}
        <p className="text-[10px] opacity-60 mt-2 flex items-center gap-1">
          <Code2 className="h-3 w-3" />
          {event.constructor.name}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onDelete}
        aria-label="Remover evento"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
