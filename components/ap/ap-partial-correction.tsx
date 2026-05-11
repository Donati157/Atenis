"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { getRubricById } from "@/lib/ap-rubric"
import {
  AP_COURSES,
  AP_COURSE_CATEGORIES,
  getCourseById,
  getCoursesByCategory,
  type APCourse,
} from "@/lib/ap-courses"
import { CheckCircle2, Lightbulb, AlertTriangle, Copy, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

type HistoryType = "history-saq" | "history-leq" | "history-dbq"

const HISTORY_OPTIONS: Array<{ id: HistoryType; label: string; pts: string }> = [
  { id: "history-saq", label: "Resposta curta (SAQ)", pts: "3 pts" },
  { id: "history-leq", label: "Ensaio sem documentos (LEQ)", pts: "6 pts" },
  { id: "history-dbq", label: "Ensaio com documentos (DBQ)", pts: "7 pts" },
]

const essayParts = [
  { id: "thesis", label: "Tese / Claim", description: "Primeira frase ou parágrafo de tese" },
  { id: "introduction", label: "Introdução", description: "Abertura + contextualização" },
  { id: "body", label: "Parágrafo do desenvolvimento", description: "Argumento + evidência + comentário" },
  { id: "evidence", label: "Evidência + comentário", description: "Trecho específico com citação e análise" },
  { id: "conclusion", label: "Conclusão", description: "Fechamento e síntese" },
  { id: "custom", label: "Trecho personalizado", description: "Qualquer parte do texto" },
]

interface CorrectionResult {
  originalText: string
  correctedText: string
  feedback: string
  improvements: string[]
  grammarIssues: string[]
  score: number
}

export function APPartialCorrection() {
  const [categoryId, setCategoryId] = useState<string>("english")
  const [courseId, setCourseId] = useState<string | null>(null)
  const [historyType, setHistoryType] = useState<HistoryType | null>(null)
  const [selectedPart, setSelectedPart] = useState<string>("")
  const [text, setText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CorrectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const course: APCourse | undefined = useMemo(
    () => (courseId ? getCourseById(courseId) : undefined),
    [courseId],
  )

  const rubricId: string | null = useMemo(() => {
    if (!course) return null
    if (course.hasHistorySubtypes) return historyType
    return course.rubricId
  }, [course, historyType])

  const rubric = useMemo(() => (rubricId ? getRubricById(rubricId) : undefined), [rubricId])
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  useEffect(() => {
    if (!course?.hasHistorySubtypes && historyType) setHistoryType(null)
  }, [course, historyType])

  const handleCorrect = async () => {
    if (!rubricId || !text.trim() || !selectedPart || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/ap/correct-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, part: selectedPart, rubricId, apCourseId: courseId }),
      })
      if (!response.ok) throw new Error("Falha ao corrigir o trecho")
      const data = await response.json()
      setResult(data.correction)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (result?.correctedText) {
      await navigator.clipboard.writeText(result.correctedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  const selectedPartInfo = essayParts.find((p) => p.id === selectedPart)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Qual AP?</label>
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
          {AP_COURSE_CATEGORIES.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {getCoursesByCategory(cat.id).map((c) => {
                  const selected = courseId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCourseId(c.id)}
                      disabled={isLoading}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                        selected
                          ? "border-accent bg-accent/10 ring-1 ring-accent"
                          : "border-border/60 bg-card/40 hover:border-accent/50 hover:bg-secondary/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{c.shortTitle}</span>
                        {c.rubricId !== "generic-ap" && (
                          <Badge variant="secondary" className="text-[9px] shrink-0">
                            Oficial
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {course?.hasHistorySubtypes && (
        <div className="pl-4 border-l-2 border-accent/40 space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-foreground">
            Tipo de questão de História
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {HISTORY_OPTIONS.map((h) => {
              const selected = historyType === h.id
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHistoryType(h.id)}
                  disabled={isLoading}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                    selected
                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                      : "border-border/60 bg-card/40 hover:border-accent/50 hover:bg-secondary/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{h.label}</span>
                    <Badge variant="secondary" className="text-[9px] shrink-0">
                      {h.pts}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {rubric && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm flex items-center gap-2 flex-wrap">
          <span className="text-foreground/90">
            Corrigindo <strong>{course?.title}</strong>
          </span>
          <Badge variant="secondary">{rubric.totalPoints} pts</Badge>
          {rubric.id === "generic-ap" && (
            <span className="text-xs text-muted-foreground">(rubrica genérica adaptada)</span>
          )}
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 transition-opacity",
          rubric ? "opacity-100" : "opacity-40 pointer-events-none",
        )}
      >
        {essayParts.map((part) => (
          <button
            key={part.id}
            onClick={() => setSelectedPart(part.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedPart === part.id
                ? "border-accent bg-accent/10 ring-1 ring-accent"
                : "border-border bg-card hover:border-accent/50"
            }`}
          >
            <span className="block text-sm font-medium text-foreground">{part.label}</span>
            <span className="block text-xs text-muted-foreground mt-1">{part.description}</span>
          </button>
        ))}
      </div>

      {selectedPart && !result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {selectedPartInfo?.label}
              </label>
              <span className="text-sm font-mono text-muted-foreground">{wordCount} palavras</span>
            </div>
            <Textarea
              placeholder={`Cole o trecho (${selectedPartInfo?.label.toLowerCase()}) aqui...`}
              className="min-h-[250px] resize-none text-base leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              A correção segue os padrões da rubrica {rubric?.namePt}.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleCorrect}
            disabled={!text.trim() || isLoading}
            className="w-full h-12 text-base font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Corrigindo...
              </span>
            ) : (
              `Corrigir ${selectedPartInfo?.label}`
            )}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground font-display">
              Resultado da correção
            </h3>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Nova correção
            </Button>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-card border">
            <div
              className={`text-4xl font-bold font-display ${
                result.score >= 80
                  ? "text-green-400"
                  : result.score >= 60
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {result.score}%
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Qualidade do trecho</p>
              <p className="text-xs text-muted-foreground">
                {result.score >= 80
                  ? "Excelente"
                  : result.score >= 60
                  ? "Bom, mas pode melhorar"
                  : "Precisa de revisão"}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Texto corrigido
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-foreground leading-relaxed whitespace-pre-wrap">
                {result.correctedText}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{result.feedback}</p>
            </CardContent>
          </Card>

          {result.grammarIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  Problemas gramaticais corrigidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.grammarIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-orange-400 mt-1">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.improvements.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  Sugestões de melhoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-accent mt-1">•</span>
                      {imp}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">
                Texto original (para comparação)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/30 text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
                {result.originalText}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
