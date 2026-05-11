"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  ClipboardCheck,
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUBJECTS } from "@/lib/subjects"

const GRADE_LEVELS = [
  { value: "6th_grade", label: "6º" },
  { value: "7th_grade", label: "7º" },
  { value: "8th_grade", label: "8º" },
  { value: "9th_grade", label: "9º" },
  { value: "10th_grade", label: "10º" },
  { value: "11th_grade", label: "11º" },
  { value: "12th_grade", label: "12º" },
] as const

const TYPES = [
  {
    value: "materia",
    label: "Matéria",
    description: "Conteúdo de aula",
    icon: BookOpen,
    color: "text-accent",
  },
  {
    value: "prova",
    label: "Prova",
    description: "Datas, formato, tópicos",
    icon: ClipboardCheck,
    color: "text-primary",
  },
  {
    value: "estudar",
    label: "O que estudar",
    description: "Roteiro de revisão",
    icon: Lightbulb,
    color: "text-yellow-400",
  },
] as const

type ContentType = (typeof TYPES)[number]["value"]

interface TeachingContent {
  id: string
  professor_id: string
  type: ContentType
  subject: string | null
  grade_levels: string[] | null
  title: string
  content: string | null
  created_at: string
  updated_at: string
}

interface Props {
  defaultTeachingGrades: string[] | null
  defaultTeachingNaturalSub: string[] | null
}

const SUBJECT_LABELS: Record<string, string> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s.label]),
)

export function TeachingContentManager({
  defaultTeachingGrades,
}: Props) {
  const [items, setItems] = useState<TeachingContent[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = async () => {
    setLoadingList(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("teaching_content")
      .select("*")
      .order("created_at", { ascending: false })
    setItems((data ?? []) as TeachingContent[])
    setLoadingList(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="space-y-5">
      {!creating && editingId === null && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            {items.length === 0
              ? "Você ainda não publicou nada. Comece criando a primeira matéria, prova ou roteiro de estudos."
              : `${items.length} item${items.length === 1 ? "" : "s"} publicado${
                  items.length === 1 ? "" : "s"
                }.`}
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Novo conteúdo
          </Button>
        </div>
      )}

      {creating && (
        <ContentForm
          defaultGrades={defaultTeachingGrades ?? []}
          onCancel={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            await refresh()
          }}
        />
      )}

      {loadingList ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <ContentForm
                key={item.id}
                initial={item}
                defaultGrades={defaultTeachingGrades ?? []}
                onCancel={() => setEditingId(null)}
                onSaved={async () => {
                  setEditingId(null)
                  await refresh()
                }}
              />
            ) : (
              <ContentItem
                key={item.id}
                item={item}
                onEdit={() => setEditingId(item.id)}
                onDeleted={async () => {
                  await refresh()
                }}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

function ContentItem({
  item,
  onEdit,
  onDeleted,
}: {
  item: TeachingContent
  onEdit: () => void
  onDeleted: () => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  const typeInfo = TYPES.find((t) => t.value === item.type)
  const Icon = typeInfo?.icon ?? BookOpen

  const handleDelete = async () => {
    if (!confirm(`Apagar "${item.title}"? Esta ação não pode ser desfeita.`)) {
      return
    }
    setDeleting(true)
    const supabase = createClient()
    await supabase.from("teaching_content").delete().eq("id", item.id)
    await onDeleted()
    setDeleting(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3 flex-wrap">
          <div
            className={cn(
              "h-9 w-9 rounded-lg bg-card flex items-center justify-center shrink-0 border border-border/50",
              typeInfo?.color,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                {typeInfo?.label}
              </Badge>
              {item.subject && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                  {SUBJECT_LABELS[item.subject] ?? item.subject}
                </Badge>
              )}
              {(item.grade_levels ?? []).map((g) => {
                const label =
                  GRADE_LEVELS.find((gl) => gl.value === g)?.label ?? g
                return (
                  <Badge
                    key={g}
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 h-4 border-accent/40 text-accent"
                  >
                    {label}
                  </Badge>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={deleting}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Editar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {item.content && (
        <CardContent className="pt-0">
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">
            {item.content.length > 280
              ? item.content.slice(0, 280) + "..."
              : item.content}
          </p>
        </CardContent>
      )}
    </Card>
  )
}

function ContentForm({
  initial,
  defaultGrades,
  onCancel,
  onSaved,
}: {
  initial?: TeachingContent
  defaultGrades: string[]
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [type, setType] = useState<ContentType>(initial?.type ?? "materia")
  const [subject, setSubject] = useState<string>(initial?.subject ?? "")
  const [gradeLevels, setGradeLevels] = useState<string[]>(
    initial?.grade_levels ?? defaultGrades ?? [],
  )
  const [title, setTitle] = useState(initial?.title ?? "")
  const [content, setContent] = useState(initial?.content ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleGrade = (g: string) => {
    setGradeLevels((cur) =>
      cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g],
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError("Dê um título pro conteúdo.")
      return
    }
    if (!subject) {
      setError("Selecione a matéria.")
      return
    }
    if (gradeLevels.length === 0) {
      setError("Selecione pelo menos uma série.")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) {
      setError("Sessão expirada — entre de novo.")
      setSaving(false)
      return
    }
    const payload = {
      type,
      subject: subject || null,
      grade_levels: gradeLevels.length > 0 ? gradeLevels : null,
      title: title.trim(),
      content: content.trim() || null,
    }
    const { error: dbError } = initial
      ? await supabase
          .from("teaching_content")
          .update(payload)
          .eq("id", initial.id)
      : await supabase.from("teaching_content").insert({
          ...payload,
          professor_id: uid,
        })
    setSaving(false)
    if (dbError) {
      setError(
        `Erro ao salvar: ${dbError.message}. Verifique se a migration 017_teaching_content.sql foi executada.`,
      )
      return
    }
    await onSaved()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {initial ? "Editar conteúdo" : "Novo conteúdo"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Tipo */}
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TYPES.map((t) => {
                const selected = type === t.value
                const Icon = t.icon
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setType(t.value)}
                    disabled={saving}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 transition-colors text-left",
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-input bg-background hover:bg-secondary/50",
                    )}
                    aria-pressed={selected}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", t.color)} />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          selected && "text-accent",
                        )}
                      >
                        {t.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Título */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              placeholder={
                type === "prova"
                  ? "Ex: Prova bimestral - Equações do 2º grau"
                  : type === "estudar"
                    ? "Ex: Roteiro pra recuperação - Frações"
                    : "Ex: Funções trigonométricas - aulas 1 a 4"
              }
            />
          </div>

          {/* Matéria */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject">Matéria</Label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={saving}
              required
              className={cn(
                "h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !subject && "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                — Selecione a matéria —
              </option>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Séries */}
          <div className="flex flex-col gap-2">
            <Label>Séries</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Selecione pra quem é (pelo menos uma).
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {GRADE_LEVELS.map((g) => {
                const selected = gradeLevels.includes(g.value)
                return (
                  <button
                    type="button"
                    key={g.value}
                    onClick={() => toggleGrade(g.value)}
                    disabled={saving}
                    className={cn(
                      "h-10 rounded-lg border text-sm transition-colors",
                      selected
                        ? "border-accent bg-accent/15 text-accent font-medium"
                        : "border-input bg-background hover:bg-secondary/50",
                    )}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={saving}
              rows={8}
              placeholder={
                type === "prova"
                  ? "Data, formato, tópicos cobrados, peso, dicas..."
                  : type === "estudar"
                    ? "Lista de tópicos, exercícios, capítulos do livro, vídeos, etc."
                    : "Resumo, links, anotações, exemplos, exercícios..."
              }
            />
            <p className="text-xs text-muted-foreground">
              Suporta texto simples. Quebras de linha são preservadas.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Salvando..." : initial ? "Salvar alterações" : "Publicar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
