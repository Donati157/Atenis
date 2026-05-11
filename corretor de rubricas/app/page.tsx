"use client"

import { useState } from "react"
import { AIEye } from "@/components/ai-eye"
import { EssayInput } from "@/components/essay-input"
import { AnalysisResult } from "@/components/analysis-result"
import { RubricDisplay } from "@/components/rubric-display"
import { PartialCorrection } from "@/components/partial-correction"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, BookOpen, Sparkles, Pencil } from "lucide-react"

interface AnalysisData {
  overallScore: number
  wordCount: number
  criteria: {
    id: string
    level: "exemplifies" | "meets" | "approaches" | "developing"
    score: number
    feedback: string
    suggestions: string[]
  }[]
  strengths: string[]
  improvements: string[]
  structureSuggestion: {
    introduction: string
    body: string[]
    conclusion: string
  }
  detectedGcdElement: string | null
}

export default function HomePage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (essay: string, gcdElement: string | null) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, gcdElement }),
      })

      if (!response.ok) {
        throw new Error("Falha ao analisar o ensaio")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro inesperado"
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setAnalysis(null)
    setError(null)
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AIEye isAnalyzing={isAnalyzing} size={40} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  GCD Essay Reviewer
                </h1>
                <p className="text-xs text-muted-foreground">
                  Powered by AI
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Global Citizen Diploma</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        {!analysis && (
          <div className="text-center mb-8 space-y-4">
            <div className="flex justify-center mb-6">
              <AIEye isAnalyzing={isAnalyzing} size={120} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
              Analise seu ensaio com IA
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-balance">
              Receba feedback detalhado baseado nos criterios oficiais do Global
              Citizen Diploma. Melhore sua reflexao, estrutura e linguagem.
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="analyze" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Analisar</span>
              <span className="sm:hidden">Analisar</span>
            </TabsTrigger>
            <TabsTrigger value="correct" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Corrigir Partes</span>
              <span className="sm:hidden">Corrigir</span>
            </TabsTrigger>
            <TabsTrigger value="rubric" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Rubrica</span>
              <span className="sm:hidden">Rubrica</span>
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
              <h3 className="text-xl font-semibold text-foreground">
                Corrigir Partes Especificas
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
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Ferramenta de apoio educacional para o Global Citizen Diploma.
          </p>
          <p className="mt-1 text-xs">
            Desenvolvido para ajudar estudantes a melhorar seus ensaios.
          </p>
        </div>
      </footer>
    </main>
  )
}
