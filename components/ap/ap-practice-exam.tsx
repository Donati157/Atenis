"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  apWorldMcq2020,
  estimateAPScoreFromMcqOnly,
  type APMCQQuestion,
} from "@/lib/ap-world-mcq-2020"
import { createClient } from "@/lib/supabase/client"
import { logLearningEvent } from "@/lib/learning-events"
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Flag,
  RotateCcw,
  Play,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "intro" | "taking" | "review"
type LetterAnswer = "A" | "B" | "C" | "D"

interface Answers {
  [questionIdx: number]: LetterAnswer | undefined
}

const QUESTIONS_PER_SECTION = apWorldMcq2020.length // 55
const EXAM_SECONDS = 55 * 60 // 55 min (prova real: 55 MCQ em 55 min)

export function APPracticeExam() {
  const [mode, setMode] = useState<Mode>("intro")
  const [answers, setAnswers] = useState<Answers>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  // Timer
  useEffect(() => {
    if (mode !== "taking") return
    if (secondsLeft <= 0) {
      setMode("review")
      return
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [mode, secondsLeft])

  const numAnswered = Object.values(answers).filter(Boolean).length
  const current: APMCQQuestion | undefined = apWorldMcq2020[currentIdx]

  const results = useMemo(() => {
    if (mode !== "review") return null
    let correct = 0
    const perQuestion = apWorldMcq2020.map((q, i) => {
      const user = answers[i]
      const isCorrect = user === q.answer
      if (isCorrect) correct += 1
      return { q, user, isCorrect }
    })
    const est = estimateAPScoreFromMcqOnly(correct)
    return { correct, perQuestion, ...est }
  }, [mode, answers])

  const start = () => {
    setMode("taking")
    setAnswers({})
    setCurrentIdx(0)
    setFlagged(new Set())
    setSecondsLeft(EXAM_SECONDS)
    setStartedAt(Date.now())
  }

  const submit = () => {
    setMode("review")

    // Analytics — fire and forget
    void (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user) return
        let correct = 0
        apWorldMcq2020.forEach((q, i) => {
          if (answers[i] === q.answer) correct += 1
        })
        const est = estimateAPScoreFromMcqOnly(correct)
        const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
        await logLearningEvent(supabase, data.user.id, {
          kind: "simulate_attempt",
          subject: "ap_world_history",
          topic: "2020_practice_exam_2_mcq",
          score: est.estimatedComposite,
          correct: correct >= 35, // 35/55 ≈ 3 (aprovado)
          metadata: {
            examId: "ap_world_2020_practice_2",
            totalQuestions: apWorldMcq2020.length,
            answered: Object.values(answers).filter(Boolean).length,
            correct,
            wrong: apWorldMcq2020.length - correct - (apWorldMcq2020.length - Object.values(answers).filter(Boolean).length),
            estimatedComposite: est.estimatedComposite,
            apScore: est.apScore,
            elapsedSeconds: elapsed,
          },
        })
      } catch {}
    })()
  }

  const restart = () => {
    setMode("intro")
    setAnswers({})
    setCurrentIdx(0)
    setFlagged(new Set())
  }

  const toggleFlag = (idx: number) => {
    setFlagged((prev) => {
      const n = new Set(prev)
      if (n.has(idx)) n.delete(idx)
      else n.add(idx)
      return n
    })
  }

  const selectAnswer = (letter: LetterAnswer) => {
    if (!current) return
    setAnswers((prev) => ({ ...prev, [currentIdx]: letter }))
  }

  if (mode === "intro") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AP World History: Modern — 2020 Practice Exam 2
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-foreground/90">
              Simulado oficial do College Board com <strong>55 questões</strong> de múltipla escolha
              da seção I do AP World History: Modern. No fim, você recebe sua nota estimada na
              escala AP (1-5) com a rubrica oficial de pontuação.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <Metric icon={<Clock className="h-4 w-4" />} label="Tempo" value="55 min" />
              <Metric icon={<Flag className="h-4 w-4" />} label="Questões" value="55" />
              <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Nota máx." value="5" />
              <Metric icon={<Sparkles className="h-4 w-4" />} label="Origem" value="CB oficial" />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">Como funciona:</strong> responda as 55 questões
                em ordem ou navegue como quiser. Marque com bandeirinha pra revisar depois.
              </p>
              <p>
                <strong className="text-foreground">Nota estimada:</strong> só baseada nas MCQs (a
                prova real também inclui FRQs — se quiser corrigir uma redação de História, use a
                aba <em>Analisar</em> com a rubrica DBQ/LEQ).
              </p>
              <p>
                <strong className="text-foreground">Timer:</strong> 55 min (como na prova real). Se
                zerar, a prova é submetida automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
        <Button onClick={start} className="w-full h-12 text-base">
          <Play className="h-4 w-4" />
          Começar simulado
        </Button>
      </div>
    )
  }

  if (mode === "taking" && current) {
    const elapsedPct = ((EXAM_SECONDS - secondsLeft) / EXAM_SECONDS) * 100
    return (
      <div className="space-y-4">
        <Card className="sticky top-14 z-30">
          <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                Questão {currentIdx + 1} / {QUESTIONS_PER_SECTION}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {numAnswered} respondidas · {flagged.size} marcadas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 text-sm font-mono",
                  secondsLeft < 300 ? "text-red-400" : "text-foreground",
                )}
              >
                <Clock className="h-4 w-4" />
                {formatTime(secondsLeft)}
              </div>
              <Button onClick={submit} size="sm" variant="outline">
                Entregar
              </Button>
            </div>
          </CardContent>
          <div className="h-1 bg-muted">
            <div
              className="h-1 bg-accent transition-all"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-xs text-muted-foreground font-mono">
              Questão {current.n} · AP World History Practice Exam 2020
            </div>
            <p className="text-base text-foreground leading-relaxed">{current.question}</p>
            <div className="space-y-2 pt-2">
              {(["A", "B", "C", "D"] as const).map((letter) => {
                const selected = answers[currentIdx] === letter
                return (
                  <button
                    key={letter}
                    onClick={() => selectAnswer(letter)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border text-sm transition-all flex items-start gap-3",
                      selected
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border/60 bg-card/40 hover:border-accent/40 hover:bg-secondary/30",
                    )}
                  >
                    <span
                      className={cn(
                        "h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold",
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {letter}
                    </span>
                    <span className="text-foreground/90">{current.options[letter]}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant={flagged.has(currentIdx) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFlag(currentIdx)}
              >
                <Flag className="h-4 w-4" />
                {flagged.has(currentIdx) ? "Marcada" : "Marcar p/ revisar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          {currentIdx === QUESTIONS_PER_SECTION - 1 ? (
            <Button onClick={submit}>
              Entregar prova
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => Math.min(QUESTIONS_PER_SECTION - 1, i + 1))}>
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Navegação rápida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 sm:grid-cols-11 gap-1.5">
              {apWorldMcq2020.map((q, idx) => {
                const answered = !!answers[idx]
                const isCur = idx === currentIdx
                const isFlagged = flagged.has(idx)
                return (
                  <button
                    key={q.n}
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "relative h-8 w-full rounded text-xs font-mono transition-colors",
                      isCur && "ring-2 ring-accent ring-offset-1 ring-offset-background",
                      answered && !isCur && "bg-accent/40 text-foreground",
                      !answered && !isCur && "bg-muted text-muted-foreground hover:bg-muted/80",
                      isCur && answered && "bg-accent text-accent-foreground",
                      isCur && !answered && "bg-background border border-accent",
                    )}
                  >
                    {q.n}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // review mode
  if (mode === "review" && results) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent" />
            <CardHeader className="relative">
              <CardTitle className="text-center text-lg">Seu resultado</CardTitle>
            </CardHeader>
            <CardContent className="relative pb-8">
              <div className="flex flex-col items-center gap-4">
                <div className={cn("text-7xl font-bold font-display", scoreColor(results.apScore))}>
                  {results.apScore}
                  <span className="text-3xl text-muted-foreground">/5</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {results.label} · {results.correct}/55 corretas · Composite estimado{" "}
                  {results.estimatedComposite}/140
                </div>
                <div className="w-full max-w-md">
                  <Progress value={(results.correct / 55) * 100} className="h-3" />
                </div>
                <p className="text-xs text-muted-foreground max-w-md text-center">
                  {results.note}
                </p>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revisão questão por questão</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {results.perQuestion.map((r, idx) => (
                <details key={r.q.n} className="group">
                  <summary className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/20">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      #{r.q.n}
                    </span>
                    <span className="flex-1 text-sm text-foreground truncate">
                      {r.q.question.substring(0, 100)}
                      {r.q.question.length > 100 ? "..." : ""}
                    </span>
                    {r.user ? (
                      r.isCorrect ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {r.user}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 shrink-0">
                          <XCircle className="h-3 w-3 mr-1" />
                          Sua: {r.user} · correta: {r.q.answer}
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Em branco · correta: {r.q.answer}
                      </Badge>
                    )}
                  </summary>
                  <div className="px-4 pb-4 space-y-2 text-sm">
                    <p className="text-foreground/90">{r.q.question}</p>
                    <div className="space-y-1">
                      {(["A", "B", "C", "D"] as const).map((letter) => {
                        const isUser = r.user === letter
                        const isRight = r.q.answer === letter
                        return (
                          <div
                            key={letter}
                            className={cn(
                              "px-3 py-2 rounded text-xs border flex items-start gap-2",
                              isRight && "bg-green-500/10 border-green-500/30",
                              isUser && !isRight && "bg-red-500/10 border-red-500/30",
                              !isUser && !isRight && "bg-card/50 border-border/40 text-muted-foreground",
                            )}
                          >
                            <span className="font-bold shrink-0">{letter}</span>
                            <span>{r.q.options[letter]}</span>
                          </div>
                        )
                      })}
                    </div>
                    {r.q.explanation && (
                      <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded border border-border/40">
                        <strong className="text-foreground">Por quê {r.q.answer}:</strong>{" "}
                        {r.q.explanation}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={restart} variant="outline" className="w-full">
          <RotateCcw className="h-4 w-4" />
          Refazer simulado
        </Button>
      </div>
    )
  }

  return null
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="p-3 rounded-lg bg-card/40 border border-border/50">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <div className="font-mono font-bold text-lg mt-1">{value}</div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function scoreColor(apScore: 1 | 2 | 3 | 4 | 5): string {
  if (apScore >= 4) return "text-green-400"
  if (apScore === 3) return "text-blue-400"
  if (apScore === 2) return "text-yellow-400"
  return "text-red-400"
}
