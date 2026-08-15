"use client"

// components/study-session.tsx
//
// Interface principal da SESSÃO GUIADA — conecta a UI ao Runtime
// pedagógico vNext (via /api/vnext/session) e traduz a StructuredResponse
// pra linguagem humana. Preserva paleta e primitivos shadcn existentes.
//
// Filosofia:
//   - Uma ação por vez.
//   - Contexto sempre visível (matéria/tópico/fase discreta).
//   - Complexidade técnica (claims/evidences/analyses/schemas) NUNCA
//     aparece ao aluno. Vira: "Diagnóstico", "Sugestão", "Fonte", etc.
//   - Loading/error/empty tratados explicitamente.

import { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Compass,
  BookOpen,
  Target,
  CheckCircle2,
  MessageCircle,
  AlertTriangle,
} from "lucide-react"

// -----------------------------------------------------------------------
// Tipos do Runtime — usa a mesma StructuredResponse do backend, mas
// declarados aqui como shapes mínimos pra evitar reimport pesado no
// bundle do cliente.
// -----------------------------------------------------------------------

interface RuntimeReply {
  claims: Array<{
    id: string
    text: string
    type: "fact" | "definition" | "interpretation" | "opinion" | "hypothesis"
    assertionLevel: "asserted" | "hedged" | "tentative"
    evidenceIds: string[]
  }>
  evidences: Array<{
    id: string
    text: string
    sourceId: string
    supportStrength: "strong" | "moderate" | "weak"
    role: "primary" | "corroborating" | "opposing"
  }>
  sources: Array<{
    id: string
    title: string
    type: string
    authorityTier: string
    url?: string
  }>
  analyses: Array<{
    id: string
    text: string
    claimId: string
  }>
  primaryTakeaway: string
  nextStep: string
}

interface RuntimeOutput {
  studentId: string
  topic: string
  executedPhase: "diagnose" | "teach" | "practice" | "verify" | "evaluate" | "adapt" | "ready" | "abort"
  awaitingStudentInput: boolean
  reply: RuntimeReply | null
  aborted?: { reason: string; detail?: string }
  state: Record<string, unknown>
  selectedQuestion?: {
    id: string
    question: string
    questionType: string
    difficulty: string
  } | null
}

interface Turn {
  role: "student" | "atenis"
  text: string
  reply?: RuntimeReply
  phase?: string
  question?: RuntimeOutput["selectedQuestion"]
  timestamp: number
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export interface StudySessionProps {
  studentName: string
  subject?: string
  grade?: string
  schoolStage?: string
  topic?: string
}

export function StudySession({
  studentName,
  subject = "matematica",
  grade = "EM01",
  schoolStage = "high",
  topic = "funcao-quadratica",
}: StudySessionProps) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priorState, setPriorState] = useState<Record<string, unknown> | null>(null)
  const [phase, setPhase] = useState<string>("diagnose")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    setLoading(true)

    const studentTurn: Turn = { role: "student", text, timestamp: Date.now() }
    setTurns((prev) => [...prev, studentTurn])
    setInput("")

    try {
      const res = await fetch("/api/vnext/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          message: text,
          context: { subject, grade, schoolStage },
          priorState,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }))
        throw new Error(humanizeApiError(res.status, err))
      }

      const { output } = (await res.json()) as { output: RuntimeOutput }

      if (output.aborted) {
        throw new Error(humanizeAbort(output.aborted))
      }

      const reply = output.reply
      if (!reply) {
        throw new Error("Não consegui montar uma resposta agora. Tenta reescrever a pergunta.")
      }

      const atenisTurn: Turn = {
        role: "atenis",
        text: reply.primaryTakeaway,
        reply,
        phase: output.executedPhase,
        question: output.selectedQuestion,
        timestamp: Date.now(),
      }
      setTurns((prev) => [...prev, atenisTurn])
      setPhase(output.executedPhase)
      setPriorState(output.state)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      // devolve o texto pro input pra que o aluno possa reeditar
      setInput(text)
      setTurns((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, priorState, topic, subject, grade, schoolStage])

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        send()
      }
    },
    [send],
  )

  const lastAtenis = useMemo(
    () => [...turns].reverse().find((t) => t.role === "atenis"),
    [turns],
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <SessionHeader
        studentName={studentName}
        phase={phase}
        subject={subject}
        topic={topic}
      />

      {turns.length === 0 && !loading && (
        <EmptyState onQuickStart={(msg) => setInput(msg)} />
      )}

      <div className="mt-6 space-y-4">
        {turns.map((turn, i) => (
          <TurnCard key={i} turn={turn} />
        ))}
        {loading && <LoadingBubble />}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {lastAtenis?.reply?.nextStep && !loading && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <ArrowRight className="h-3.5 w-3.5" />
            Próximo passo
          </div>
          <p className="mt-2 text-sm text-foreground">{lastAtenis.reply.nextStep}</p>
        </div>
      )}

      <div className="mt-6 sticky bottom-4">
        <Card className="border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              turns.length === 0
                ? "Escreva o que você sabe ou pergunte sua dúvida…"
                : "Sua resposta ou próxima pergunta…"
            }
            className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0"
            disabled={loading}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Enter envia · Shift+Enter quebra linha
            </p>
            <Button onClick={send} disabled={loading || !input.trim()}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Pensando…
                </>
              ) : (
                <>
                  Enviar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------
// Sub-componentes
// -----------------------------------------------------------------------

function SessionHeader({
  studentName,
  phase,
  subject,
  topic,
}: {
  studentName: string
  phase: string
  subject: string
  topic: string
}) {
  const phaseLabel = phaseToLabel(phase)
  const PhaseIcon = phaseToIcon(phase)
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Sessão de estudo
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          Olá, {studentName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estudando{" "}
          <span className="text-foreground">{humanTopic(topic)}</span> em{" "}
          <span className="text-foreground">{humanSubject(subject)}</span>
        </p>
      </div>
      <Badge
        variant="outline"
        className="inline-flex w-fit items-center gap-1.5 self-start border-primary/30 bg-primary/10 text-primary"
      >
        <PhaseIcon className="h-3.5 w-3.5" />
        {phaseLabel}
      </Badge>
    </div>
  )
}

function TurnCard({ turn }: { turn: Turn }) {
  if (turn.role === "student") {
    return (
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary/15 px-4 py-2.5 text-sm text-foreground">
        {turn.text}
      </div>
    )
  }
  return (
    <Card className="border-border/60 bg-card/60 p-5">
      {turn.question && (
        <QuestionBlock question={turn.question} />
      )}
      <div className="mt-3 text-sm leading-relaxed text-foreground">
        {turn.text}
      </div>
      {turn.reply && <ReplyExtras reply={turn.reply} />}
    </Card>
  )
}

function QuestionBlock({
  question,
}: {
  question: NonNullable<Turn["question"]>
}) {
  return (
    <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent">
        <BookOpen className="h-3.5 w-3.5" />
        Questão proposta
      </div>
      <p className="text-sm text-foreground">{question.question}</p>
    </div>
  )
}

function ReplyExtras({ reply }: { reply: RuntimeReply }) {
  const insights = reply.claims.filter((c) => c.type === "interpretation" || c.type === "hypothesis")
  const sourcesWithUrl = reply.sources.filter((s) => s.url && !s.url.startsWith("/"))
  const analyses = reply.analyses

  if (insights.length === 0 && sourcesWithUrl.length === 0 && analyses.length === 0) {
    return null
  }
  return (
    <div className="mt-4 space-y-3 border-t border-border/40 pt-3">
      {insights.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Diagnóstico
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {insights.slice(0, 3).map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/60" />
                <span>
                  {c.text}
                  {c.assertionLevel !== "asserted" && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      (hipótese)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {analyses.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Interpretação
          </p>
          <p className="text-xs text-muted-foreground">
            {analyses[0].text}
          </p>
        </div>
      )}
      {sourcesWithUrl.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fontes
          </p>
          <ul className="space-y-1 text-xs">
            {sourcesWithUrl.slice(0, 3).map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function LoadingBubble() {
  return (
    <Card className="border-border/60 bg-card/60 p-5">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" />
        Atenis está pensando…
      </div>
    </Card>
  )
}

function EmptyState({ onQuickStart }: { onQuickStart: (msg: string) => void }) {
  const suggestions = [
    "Não sei o que é função quadrática — começa do zero comigo",
    "Já vi, mas travei em Bhaskara",
    "Quero praticar identificando coeficientes",
  ]
  return (
    <Card className="mt-6 border-border/60 bg-card/40 p-6">
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Como você prefere começar?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Escreve livre ou escolhe um dos atalhos abaixo.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onQuickStart(s)}
            className="rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-left text-xs text-foreground hover:border-primary/40 hover:bg-primary/5"
          >
            {s}
          </button>
        ))}
      </div>
    </Card>
  )
}

// -----------------------------------------------------------------------
// Traduções internas → UI humana
// -----------------------------------------------------------------------

function phaseToLabel(phase: string): string {
  switch (phase) {
    case "diagnose":
      return "Diagnóstico"
    case "teach":
      return "Explicação"
    case "practice":
      return "Prática"
    case "verify":
      return "Verificação"
    case "adapt":
      return "Adaptando"
    case "ready":
      return "Pronto"
    case "abort":
      return "Recomeçar"
    default:
      return "Sessão"
  }
}

function phaseToIcon(phase: string) {
  switch (phase) {
    case "diagnose":
      return Compass
    case "teach":
      return BookOpen
    case "practice":
      return Target
    case "verify":
      return CheckCircle2
    default:
      return MessageCircle
  }
}

function humanTopic(slug: string): string {
  const map: Record<string, string> = {
    "funcao-quadratica": "função quadrática",
  }
  return map[slug] ?? slug.replace(/-/g, " ")
}

function humanSubject(slug: string): string {
  const map: Record<string, string> = {
    matematica: "Matemática",
    portugues: "Português",
    natural_science: "Ciências",
    social_science: "Humanas",
    ingles: "Inglês",
  }
  return map[slug] ?? slug
}

function humanizeApiError(status: number, err: { error?: string; message?: string }): string {
  if (status === 401) return "Sua sessão expirou. Faça login novamente."
  if (status === 503 && err.error === "openai-key-missing") {
    return "Serviço temporariamente indisponível. Tenta em alguns instantes."
  }
  if (status === 400) return "Não entendi sua mensagem. Tenta reformular."
  return "Algo deu errado no servidor. Tenta de novo em instantes."
}

function humanizeAbort(aborted: { reason: string; detail?: string }): string {
  switch (aborted.reason) {
    case "provider-error":
      return "Não consegui gerar uma resposta agora. Tenta reformular a pergunta."
    case "question-unavailable":
      return "Ainda não tenho questão pra esse tópico. Tenta outro assunto."
    case "educational-context-required":
      return "Preciso saber sua série e matéria antes de continuar."
    case "critic-reject":
    case "refine-exhausted":
      return "A resposta veio incompleta. Tenta reformular ou ser mais específico."
    default:
      return "Sessão interrompida. Tenta enviar novamente."
  }
}
