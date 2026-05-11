"use client"

import { useState } from "react"
import { AIEye } from "@/components/gcd/ai-eye"
import { EssayInput } from "@/components/gcd/essay-input"
import { AnalysisResult, type AnalysisData } from "@/components/gcd/analysis-result"
import { RubricDisplay } from "@/components/gcd/rubric-display"
import { PartialCorrection } from "@/components/gcd/partial-correction"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, BookOpen, Sparkles, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { logLearningEvent } from "@/lib/learning-events"

export function GCDCorrector() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (
    essay: string,
    gcdElement: string | null,
    images: string[],
  ) => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const response = await fetch("/api/gcd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, gcdElement, images }),
      })
      if (!response.ok) throw new Error("Falha ao analisar o ensaio")
      const data = await response.json()
      setAnalysis(data.analysis)

      void (async () => {
        try {
          const supabase = createClient()
          const { data: userData } = await supabase.auth.getUser()
          if (!userData.user) return
          await logLearningEvent(supabase, userData.user.id, {
            kind: "correction_essay",
            subject: "gcd",
            topic: gcdElement || data.analysis.detectedGcdElement || "gcd-essay",
            score: data.analysis.overallScore,
            metadata: { rubric: "gcd", max: 100 },
          })
        } catch {}
      })()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setAnalysis(null)
    setError(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AIEye isAnalyzing={isAnalyzing} size={40} />
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight font-display">
                GCD Essay Reviewer
              </h1>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Global Citizen Diploma</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!analysis && (
          <div className="text-center mb-8 space-y-4">
            <div className="flex justify-center mb-6">
              <AIEye isAnalyzing={isAnalyzing} size={120} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance font-display">
              Analise seu ensaio com IA
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-balance">
              Receba feedback detalhado baseado nos critérios oficiais do Global Citizen Diploma.
              Melhore sua reflexão, estrutura, linguagem e evidências.
            </p>
          </div>
        )}

        <Tabs defaultValue="analyze" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Analisar
            </TabsTrigger>
            <TabsTrigger value="correct" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Corrigir partes
            </TabsTrigger>
            <TabsTrigger value="rubric" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Rubrica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {analysis ? (
              <AnalysisResult analysis={analysis} onReset={handleReset} />
            ) : (
              <EssayInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
            )}
          </TabsContent>

          <TabsContent value="correct" className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-foreground font-display">
                Corrigir partes específicas
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione uma parte do ensaio para corrigir e receber feedback detalhado.
              </p>
            </div>
            <PartialCorrection />
          </TabsContent>

          <TabsContent value="rubric">
            <RubricDisplay />
          </TabsContent>
        </Tabs>

        <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>Ferramenta de apoio educacional para o Global Citizen Diploma.</p>
        </div>
      </div>
    </div>
  )
}
