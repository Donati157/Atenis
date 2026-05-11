"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  enemCompetencies,
  scoreBand,
  bgForScore,
  colorForScore,
} from "@/lib/enem-rubric"
import { CheckCircle2, AlertCircle, Lightbulb, FileText } from "lucide-react"

interface CompetencyScore {
  id: string
  pointsAwarded: number
  level: number
  feedback: string
  justification: string
  suggestions: string[]
}

export interface ENEMAnalysisData {
  totalScore: number
  maxScore: number
  wordCount: number
  detectedTheme: string | null
  competencies: CompetencyScore[]
  strengths: string[]
  improvements: string[]
  revisionExample: string
  fleeingTheme: boolean
  violatesHumanRights: boolean
}

interface ENEMAnalysisResultProps {
  analysis: ENEMAnalysisData
  onReset: () => void
}

export function ENEMAnalysisResult({ analysis, onReset }: ENEMAnalysisResultProps) {
  const band = scoreBand(analysis.totalScore)

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="text-center text-lg">Nota ENEM — redação</CardTitle>
          </CardHeader>
          <CardContent className="relative pb-8">
            <div className="flex flex-col items-center gap-4">
              <div className={`text-7xl font-bold font-display ${band.color}`}>
                {analysis.totalScore}
                <span className="text-3xl text-muted-foreground">/1000</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {band.label} · {band.pct}% da nota máxima
              </div>
              <div className="w-full max-w-md">
                <Progress value={band.pct} className="h-3" />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{analysis.wordCount} palavras</span>
                {analysis.detectedTheme && (
                  <>
                    <span>·</span>
                    <span className="max-w-xs truncate">
                      Tema: {analysis.detectedTheme}
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {(analysis.fleeingTheme || analysis.violatesHumanRights) && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Alerta — Motivo de anulação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {analysis.fleeingTheme && (
              <p>
                <strong>Fuga ao tema</strong> detectada. No ENEM real, isso zera a redação.
              </p>
            )}
            {analysis.violatesHumanRights && (
              <p>
                <strong>Desrespeito aos direitos humanos</strong> na Competência 5. Zera a C5 no ENEM.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Análise por competência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {analysis.competencies.map((c) => {
              const info = enemCompetencies.find((ec) => ec.id === c.id)
              if (!info) return null
              const levelInfo = info.levels.find((l) => l.points === c.pointsAwarded)
              return (
                <AccordionItem
                  key={c.id}
                  value={c.id}
                  className={`border rounded-lg px-4 ${bgForScore(c.pointsAwarded)}`}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-4 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {info.shortName}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                          · {info.id.toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-mono shrink-0 ${colorForScore(c.pointsAwarded)}`}
                      >
                        {c.pointsAwarded}/200
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4 pt-2">
                      {levelInfo && (
                        <div className="rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {levelInfo.label} ({levelInfo.points} pts):
                          </span>{" "}
                          {levelInfo.description}
                        </div>
                      )}
                      <p className="text-sm text-foreground/90">{c.feedback}</p>
                      {c.justification && (
                        <div className="text-xs text-muted-foreground italic border-l-2 border-accent/30 pl-3">
                          {c.justification}
                        </div>
                      )}
                      {c.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Como subir de nível
                          </p>
                          <ul className="space-y-1">
                            {c.suggestions.map((s, i) => (
                              <li
                                key={i}
                                className="text-sm text-foreground/80 flex items-start gap-2"
                              >
                                <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Pontos fortes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-green-400 font-mono">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              Pontos a melhorar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.improvements.map((i, idx) => (
                <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-yellow-400 font-mono">!</span>
                  {i}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {analysis.revisionExample && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              Trecho reescrito (modelo de melhoria)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
              {analysis.revisionExample}
            </div>
          </CardContent>
        </Card>
      )}

      <button
        onClick={onReset}
        className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg hover:bg-muted/50"
      >
        Corrigir outra redação
      </button>
    </div>
  )
}
