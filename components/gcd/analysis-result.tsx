"use client"

import {
  rubricCriteria,
  getLevelLabel,
  getLevelColor,
  getLevelBgColor,
} from "@/lib/gcd-rubric"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CheckCircle2, AlertCircle, Lightbulb, FileText } from "lucide-react"

interface CriteriaAnalysis {
  id: string
  level: "exemplifies" | "meets" | "approaches" | "developing"
  score: number
  feedback: string
  suggestions: string[]
}

interface StructureSuggestion {
  introduction: string
  body: string[]
  conclusion: string
}

export interface AnalysisData {
  overallScore: number
  wordCount: number
  criteria: CriteriaAnalysis[]
  strengths: string[]
  improvements: string[]
  structureSuggestion: StructureSuggestion
  detectedGcdElement: string | null
}

interface AnalysisResultProps {
  analysis: AnalysisData
  onReset: () => void
}

export function AnalysisResult({ analysis, onReset }: AnalysisResultProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-blue-400"
    if (score >= 40) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="text-center text-lg">Pontuação geral</CardTitle>
          </CardHeader>
          <CardContent className="relative pb-8">
            <div className="flex flex-col items-center gap-4">
              <div className={`text-7xl font-bold font-display ${getScoreColor(analysis.overallScore)}`}>
                {Math.round(analysis.overallScore)}
              </div>
              <div className="text-sm text-muted-foreground">de 100 pontos</div>
              <div className="w-full max-w-xs">
                <Progress value={analysis.overallScore} className="h-3" />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{analysis.wordCount} palavras</span>
                {analysis.detectedGcdElement && (
                  <>
                    <span>|</span>
                    <span>GCD: {analysis.detectedGcdElement}</span>
                  </>
                )}
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
            {analysis.criteria.map((criterion) => {
              const criteriaInfo = rubricCriteria.find((c) => c.id === criterion.id)
              if (!criteriaInfo) return null
              return (
                <AccordionItem
                  key={criterion.id}
                  value={criterion.id}
                  className={`border rounded-lg px-4 ${getLevelBgColor(criterion.level)}`}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">{criteriaInfo.namePt}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getLevelColor(criterion.level)} bg-background/50`}
                        >
                          {getLevelLabel(criterion.level)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {criterion.score}/{criteriaInfo.weight}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4 pt-2">
                      <p className="text-sm text-foreground/90">{criterion.feedback}</p>
                      {criterion.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Sugestões de melhoria
                          </p>
                          <ul className="space-y-1">
                            {criterion.suggestions.map((s, i) => (
                              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            Sugestão de estrutura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-accent">Introdução</h4>
            <p className="text-sm text-foreground/80 pl-4 border-l-2 border-accent/30">
              {analysis.structureSuggestion.introduction}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-accent">Desenvolvimento</h4>
            <div className="space-y-2">
              {analysis.structureSuggestion.body.map((p, i) => (
                <p
                  key={i}
                  className="text-sm text-foreground/80 pl-4 border-l-2 border-accent/30"
                >
                  <span className="font-medium text-muted-foreground">Parágrafo {i + 1}: </span>
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-accent">Conclusão</h4>
            <p className="text-sm text-foreground/80 pl-4 border-l-2 border-accent/30">
              {analysis.structureSuggestion.conclusion}
            </p>
          </div>
        </CardContent>
      </Card>

      <button
        onClick={onReset}
        className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg hover:bg-muted/50"
      >
        Analisar outro ensaio
      </button>
    </div>
  )
}
