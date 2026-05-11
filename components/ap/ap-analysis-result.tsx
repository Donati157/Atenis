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
  getRubricById,
  getScoreColor,
  getScoreBgColor,
  scorePercent,
} from "@/lib/ap-rubric"
import { CheckCircle2, AlertCircle, Lightbulb, FileText } from "lucide-react"

interface CriterionScore {
  id: string
  pointsAwarded: number
  feedback: string
  justification: string
  suggestions: string[]
}

export interface APAnalysisData {
  rubricId: string
  totalScore: number
  maxScore: number
  wordCount: number
  criteria: CriterionScore[]
  strengths: string[]
  improvements: string[]
  revisionExample: string
}

interface APAnalysisResultProps {
  analysis: APAnalysisData
  onReset: () => void
}

export function APAnalysisResult({ analysis, onReset }: APAnalysisResultProps) {
  const rubric = getRubricById(analysis.rubricId)
  if (!rubric) {
    return (
      <div className="text-sm text-destructive">
        Rubrica não encontrada ({analysis.rubricId}).
      </div>
    )
  }

  const overallColor = getScoreColor(analysis.totalScore, analysis.maxScore)
  const overallPct = scorePercent(analysis.totalScore, analysis.maxScore)

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="text-center text-lg">{rubric.namePt}</CardTitle>
          </CardHeader>
          <CardContent className="relative pb-8">
            <div className="flex flex-col items-center gap-4">
              <div className={`text-7xl font-bold font-display ${overallColor}`}>
                {analysis.totalScore}
                <span className="text-3xl text-muted-foreground">/{analysis.maxScore}</span>
              </div>
              <div className="text-sm text-muted-foreground">{overallPct}% dos pontos</div>
              <div className="w-full max-w-xs">
                <Progress value={overallPct} className="h-3" />
              </div>
              <div className="text-sm text-muted-foreground">
                {analysis.wordCount} palavras
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Análise por critério
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {analysis.criteria.map((c) => {
              const info = rubric.criteria.find((rc) => rc.id === c.id)
              if (!info) return null
              const descriptor = info.descriptors.find((d) => d.points === c.pointsAwarded)
              const bg = getScoreBgColor(c.pointsAwarded, info.maxPoints)
              const textColor = getScoreColor(c.pointsAwarded, info.maxPoints)
              return (
                <AccordionItem
                  key={c.id}
                  value={c.id}
                  className={`border rounded-lg px-4 ${bg}`}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {info.namePt}
                        </span>
                      </div>
                      <span className={`text-sm font-mono shrink-0 ${textColor}`}>
                        {c.pointsAwarded} / {info.maxPoints}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4 pt-2">
                      {descriptor && (
                        <div className="rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            Nível ({c.pointsAwarded} pt{c.pointsAwarded === 1 ? "" : "s"}):
                          </span>{" "}
                          {descriptor.descriptionPt}
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
              Trecho revisado (exemplo)
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
        Corrigir outra resposta
      </button>
    </div>
  )
}
