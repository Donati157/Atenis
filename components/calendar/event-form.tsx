"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { EventCategory } from "@/lib/calendar"

interface EventFormProps {
  initialDate: Date
  onCancel: () => void
  onSubmit: (data: {
    kind: EventCategory
    title: string
    date: Date
    description: string
    subject?: string
    durationMinutes?: number
    exam?: string
  }) => void
}

// Converte Date → "YYYY-MM-DDTHH:mm" (formato datetime-local).
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventForm({ initialDate, onCancel, onSubmit }: EventFormProps) {
  const [kind, setKind] = useState<EventCategory>("study")
  const [title, setTitle] = useState("")
  const [datetime, setDatetime] = useState(toDatetimeLocal(initialDate))
  const [description, setDescription] = useState("")
  const [subject, setSubject] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [exam, setExam] = useState("ENEM")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const date = new Date(datetime)
    if (Number.isNaN(date.getTime())) return
    onSubmit({
      kind,
      title: title.trim(),
      date,
      description: description.trim(),
      subject: subject.trim() || undefined,
      durationMinutes,
      exam: exam.trim() || undefined,
    })
  }

  const kinds: { id: EventCategory; label: string; icon: string }[] = [
    { id: "study", label: "Estudo", icon: "📖" },
    { id: "exam", label: "Prova", icon: "📝" },
    { id: "assignment", label: "Tarefa", icon: "📌" },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Novo evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {kinds.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className={cn(
                      "py-2 px-2 rounded-lg border text-sm transition-colors flex flex-col items-center gap-0.5",
                      kind === k.id
                        ? "bg-accent/15 text-accent border-accent"
                        : "bg-card hover:bg-secondary/50 border-border/60",
                    )}
                  >
                    <span className="text-lg">{k.icon}</span>
                    <span className="text-xs">{k.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cada tipo cria uma instância de uma subclasse diferente
                (StudyEvent / ExamEvent / AssignmentEvent).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Revisar Função Quadrática"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datetime">Data e hora</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                required
              />
            </div>

            {kind === "study" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">Matéria</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Matemática"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(parseInt(e.target.value, 10) || 30)
                    }
                  />
                </div>
              </>
            )}

            {kind === "exam" && (
              <div className="space-y-2">
                <Label htmlFor="exam">Prova</Label>
                <Input
                  id="exam"
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  placeholder="ENEM, Fuvest, AP Calculus, simulado..."
                />
              </div>
            )}

            {kind === "assignment" && (
              <div className="space-y-2">
                <Label htmlFor="subject-a">Matéria</Label>
                <Input
                  id="subject-a"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Português"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detalhes, capítulos, links..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Criar evento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
