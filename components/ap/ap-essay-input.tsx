"use client"

import { useEffect, useMemo, useState } from "react"
import { useDraft } from "@/lib/use-draft"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getRubricById, samplePrompts } from "@/lib/ap-rubric"
import {
  AP_COURSES,
  AP_COURSE_CATEGORIES,
  getCourseById,
  getCoursesByCategory,
  type APCourse,
} from "@/lib/ap-courses"
import { Sparkles, ChevronDown, ChevronUp, Check } from "lucide-react"
import {
  AttachmentPicker,
  attachmentToDataUrl,
  type Attachment,
} from "@/components/attachment-picker"
import { cn } from "@/lib/utils"

interface APEssayInputProps {
  onAnalyze: (
    essay: string,
    rubricId: string,
    prompt: string | null,
    images: string[],
    apCourseId?: string | null,
  ) => void
  isLoading: boolean
}

type HistoryType = "history-saq" | "history-leq" | "history-dbq"

const HISTORY_CARDS: Array<{
  id: HistoryType
  title: string
  acronym: string
  description: string
  points: string
}> = [
  {
    id: "history-saq",
    title: "Resposta curta",
    acronym: "SAQ · Short Answer Question",
    description: "3 perguntinhas (a, b, c) de 1–3 frases cada. Sem escrever ensaio.",
    points: "3 pts",
  },
  {
    id: "history-leq",
    title: "Ensaio sem documentos",
    acronym: "LEQ · Long Essay Question",
    description: "Argumento histórico completo: introdução + desenvolvimento + conclusão. Sem fontes.",
    points: "6 pts",
  },
  {
    id: "history-dbq",
    title: "Ensaio com 7 documentos",
    acronym: "DBQ · Document-Based Question",
    description: "Análise de 7 fontes históricas da época + argumento próprio que as usa.",
    points: "7 pts",
  },
]

const RUBRIC_SHORT_DESC: Record<string, string> = {
  "eng-lang": "Ensaio argumentativo · Thesis + Evidence + Sophistication",
  "eng-lit": "Análise literária · Thesis + Evidence + Sophistication",
  "history-saq": "3 perguntas curtas (a, b, c) · Cada uma vale 1 ponto",
  "history-leq": "Ensaio histórico sem documentos · Tese + Contexto + Evidência + Análise",
  "history-dbq": "Ensaio com 7 documentos · Tese + Contexto + Evidência + Sourcing + Complexidade",
  "generic-ap":
    "Rubrica genérica AP · Claim + Evidence + Reasoning + Communication (6 pts)",
}

export function APEssayInput({ onAnalyze, isLoading }: APEssayInputProps) {
  const [categoryId, setCategoryId] = useState<string>("english")
  const [courseId, setCourseId] = useState<string | null>(null)
  const [historyType, setHistoryType] = useState<HistoryType | null>(null)
  const [essay, setEssay, clearEssay] = useDraft("atenis.ap.essay")
  const [prompt, setPrompt, clearPrompt] = useDraft("atenis.ap.prompt")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showRubricPreview, setShowRubricPreview] = useState(false)

  const course: APCourse | undefined = useMemo(
    () => (courseId ? getCourseById(courseId) : undefined),
    [courseId],
  )

  // Derive rubricId:
  // - History with subtypes (World/US/Euro) → historyType picked
  // - Any other course → course.rubricId directly
  const rubricId: string | null = useMemo(() => {
    if (!course) return null
    if (course.hasHistorySubtypes) return historyType
    return course.rubricId
  }, [course, historyType])

  const rubric = useMemo(() => (rubricId ? getRubricById(rubricId) : undefined), [rubricId])
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0
  const hasImages = attachments.some((a) => a.kind === "image")
  const isValidLength = wordCount >= 50 || hasImages
  const rubricSamples = rubricId ? samplePrompts[rubricId] ?? [] : []

  useEffect(() => {
    if (!course?.hasHistorySubtypes && historyType) setHistoryType(null)
  }, [course, historyType])

  const getWordCountColor = () => {
    if (!rubric?.wordRange) return "text-muted-foreground"
    if (wordCount < rubric.wordRange.min) return "text-yellow-400"
    if (wordCount > rubric.wordRange.max) return "text-red-400"
    return "text-green-400"
  }

  const handleSubmit = async () => {
    if (!rubricId) return
    if ((!essay.trim() && !hasImages) || isLoading) return
    const images = await Promise.all(
      attachments.filter((a) => a.kind === "image").map(attachmentToDataUrl),
    )
    onAnalyze(essay, rubricId, prompt.trim() || null, images, courseId)
    clearEssay()
    clearPrompt()
    setAttachments([])
  }

  const pickCourse = (c: APCourse) => {
    setCourseId(c.id)
    if (!c.hasHistorySubtypes) setHistoryType(null)
  }

  const stepsUnlocked = !!rubric

  return (
    <div className="space-y-6">
      {/* STEP 1 — Category + Course */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <StepBadge>1</StepBadge>
          <label className="text-sm font-medium text-foreground">
            Qual AP você está estudando?
          </label>
        </div>

        <Tabs value={categoryId} onValueChange={setCategoryId}>
          <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto">
            {AP_COURSE_CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="flex flex-col py-2 gap-0.5 text-xs"
                title={cat.description}
              >
                <span className="text-base leading-none">{cat.emoji}</span>
                <span className="text-[11px] leading-tight">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {AP_COURSE_CATEGORIES.map((cat) => {
            const courses = getCoursesByCategory(cat.id)
            return (
              <TabsContent key={cat.id} value={cat.id} className="mt-4">
                <p className="text-xs text-muted-foreground mb-3 px-1">
                  {cat.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {courses.map((c) => {
                    const selected = courseId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCourse(c)}
                        disabled={isLoading}
                        className={cn(
                          "rounded-lg border px-3 py-2.5 text-left transition-all disabled:opacity-50",
                          selected
                            ? "border-accent bg-accent/10 ring-1 ring-accent"
                            : "border-border/60 bg-card/40 hover:border-accent/50 hover:bg-secondary/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">
                              {c.shortTitle}
                            </div>
                            {c.notes && (
                              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                {c.notes}
                              </div>
                            )}
                          </div>
                          {c.rubricId !== "generic-ap" && (
                            <Badge variant="secondary" className="text-[9px] shrink-0">
                              Rubrica oficial
                            </Badge>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>

      {/* STEP 1b — History subtype (only for World/US/Euro History) */}
      {course?.hasHistorySubtypes && (
        <div className="space-y-3 pl-4 border-l-2 border-accent/40 animate-fade-in">
          <div className="flex items-center gap-2">
            <StepBadge>1b</StepBadge>
            <label className="text-sm font-medium text-foreground">
              Que tipo de questão de História?
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {HISTORY_CARDS.map((h) => {
              const selected = historyType === h.id
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHistoryType(h.id)}
                  disabled={isLoading}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all disabled:opacity-50",
                    selected
                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                      : "border-border/60 bg-card/40 hover:border-accent/50 hover:bg-secondary/30",
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{h.title}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {h.points}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {h.acronym}
                  </p>
                  <p className="text-sm text-foreground/80 mt-2">{h.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Rubric preview (once a rubric is picked) */}
      {rubric && course && (
        <Card className="bg-accent/5 border-accent/30">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{course.title}</span>
                  <Badge variant="secondary">{rubric.totalPoints} pts</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {RUBRIC_SHORT_DESC[rubric.id] ?? rubric.notesPt}
                </p>
                {rubric.id === "generic-ap" && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                    Este curso usa a rubrica genérica AP. A IA adapta o feedback ao contexto
                    específico de {course.shortTitle}.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowRubricPreview((v) => !v)}
                className="text-xs text-accent hover:underline flex items-center gap-1 shrink-0"
              >
                {showRubricPreview ? "Esconder" : "Ver"} critérios
                {showRubricPreview ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>
            {showRubricPreview && (
              <div className="pt-2 border-t border-accent/20 space-y-2">
                {rubric.criteria.map((c) => (
                  <div key={c.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-accent shrink-0" />
                      <span className="font-medium text-foreground">{c.namePt}</span>
                      <span className="text-muted-foreground">
                        · até {c.maxPoints} pt{c.maxPoints === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground pt-1">
                  Veja os descritores completos na aba <strong>Rubrica</strong>.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — prompt */}
      <div
        className={cn(
          "space-y-2 transition-opacity",
          stepsUnlocked ? "opacity-100" : "opacity-40 pointer-events-none",
        )}
      >
        <div className="flex items-center gap-2">
          <StepBadge>2</StepBadge>
          <label className="text-sm font-medium text-foreground">
            Cole o enunciado da questão{" "}
            <span className="text-muted-foreground font-normal">(opcional mas recomendado)</span>
          </label>
        </div>
        {rubricSamples.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" />
              Ou usa um exemplo real do AP 2024:
            </span>
            {rubricSamples.map((sp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(sp.prompt)}
                disabled={isLoading}
                className="text-xs px-2 py-1 rounded-md border border-border/60 bg-card/50 hover:border-accent/50 hover:bg-accent/10 text-foreground/80 transition-colors"
                title={sp.title}
              >
                {sp.title}
              </button>
            ))}
          </div>
        )}
        <Textarea
          placeholder="Cole aqui o enunciado exato da prova AP..."
          className="min-h-[100px] resize-none text-sm"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading || !stepsUnlocked}
        />
      </div>

      {/* STEP 3 — answer */}
      <div
        className={cn(
          "space-y-2 transition-opacity",
          stepsUnlocked ? "opacity-100" : "opacity-40 pointer-events-none",
        )}
      >
        <div className="flex items-center gap-2">
          <StepBadge>3</StepBadge>
          <label className="text-sm font-medium text-foreground">
            Cole sua resposta (ou anexe uma foto/scan da folha)
          </label>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">
            {rubric?.id === "history-saq"
              ? "3 partes de 1-3 frases cada"
              : rubric?.id === "generic-ap" && course
              ? `Resposta típica de ${course.shortTitle}`
              : rubric?.category === "history"
              ? "Ensaio histórico — introdução + 2-3 parágrafos + conclusão"
              : rubric?.category === "english"
              ? "Ensaio argumentativo — thesis, body com evidência + commentary, sophistication"
              : ""}
          </span>
          <span className={`text-sm font-mono ${getWordCountColor()}`}>
            {wordCount}
            {rubric?.wordRange ? ` / ${rubric.wordRange.min}–${rubric.wordRange.max}` : ""} palavras
          </span>
        </div>
        <Textarea
          placeholder="Cole ou digite sua resposta aqui..."
          className="min-h-[350px] resize-none text-base leading-relaxed"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          disabled={isLoading || !stepsUnlocked}
        />
        <AttachmentPicker
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          disabled={isLoading || !stepsUnlocked}
          accept="image/*,.pdf"
        />
        {hasImages && (
          <p className="text-xs text-muted-foreground">
            📸 A IA vai ler o texto manuscrito/impresso das imagens e corrigir pela rubrica.
          </p>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValidLength || isLoading || !stepsUnlocked}
        className="w-full h-12 text-base font-medium"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            Corrigindo pela rubrica oficial...
          </span>
        ) : !stepsUnlocked ? (
          course?.hasHistorySubtypes
            ? "Escolhe o tipo de questão de História acima"
            : !course
            ? "Escolhe qual AP acima"
            : "Escolhe qual AP acima"
        ) : (
          `Corrigir pela rubrica AP (${rubric?.totalPoints ?? ""} pts)`
        )}
      </Button>
    </div>
  )
}

function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-[20px] px-1.5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
      {children}
    </span>
  )
}
