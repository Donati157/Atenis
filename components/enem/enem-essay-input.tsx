"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useDraft } from "@/lib/use-draft"
import {
  AttachmentPicker,
  attachmentToDataUrl,
  type Attachment,
} from "@/components/attachment-picker"

interface ENEMEssayInputProps {
  onAnalyze: (
    essay: string,
    theme: string | null,
    images: string[],
  ) => void
  isLoading: boolean
}

export function ENEMEssayInput({ onAnalyze, isLoading }: ENEMEssayInputProps) {
  const [theme, setTheme, clearTheme] = useDraft("atenis.enem.theme")
  const [essay, setEssay, clearEssay] = useDraft("atenis.enem.essay")
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0
  const hasImages = attachments.some((a) => a.kind === "image")
  const isValidLength = wordCount >= 50 || hasImages

  const wordColor = () => {
    if (wordCount < 200) return "text-yellow-400"
    if (wordCount > 450) return "text-red-400"
    return "text-green-400"
  }

  const handleSubmit = async () => {
    if ((!essay.trim() && !hasImages) || isLoading) return
    const images = await Promise.all(
      attachments.filter((a) => a.kind === "image").map(attachmentToDataUrl),
    )
    onAnalyze(essay, theme.trim() || null, images)
    clearTheme()
    clearEssay()
    setAttachments([])
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Tema da redação (opcional)
        </label>
        <Input
          placeholder="Ex: 'Caminhos para combater o racismo na sociedade brasileira'"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Se especificar, a IA avalia se a redação efetivamente responde à proposta (Competência 2).
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Sua redação</label>
          <span className={`text-sm font-mono ${wordColor()}`}>
            {wordCount} / 200–450 palavras
          </span>
        </div>
        <Textarea
          placeholder="Cole ou digite sua redação dissertativo-argumentativa aqui... (ou anexe uma foto da folha)"
          className="min-h-[400px] resize-none text-base leading-relaxed"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          disabled={isLoading}
        />
        <AttachmentPicker
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          disabled={isLoading}
          accept="image/*,.pdf"
        />
        {hasImages && (
          <p className="text-xs text-muted-foreground">
            📸 A IA vai ler o texto manuscrito/impresso e corrigir pelas 5 competências do ENEM.
          </p>
        )}
        {!hasImages && wordCount > 0 && wordCount < 200 && (
          <p className="text-xs text-yellow-400">
            Redações com menos de 7 linhas são anuladas no ENEM. O ideal é 25-30 linhas (≈ 300 palavras).
          </p>
        )}
        {!hasImages && wordCount > 450 && (
          <p className="text-xs text-red-400">
            A folha oficial do ENEM tem 30 linhas; acima disso não conta.
          </p>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValidLength || isLoading}
        className="w-full h-12 text-base font-medium"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            Corrigindo pelas 5 competências...
          </span>
        ) : (
          "Corrigir redação ENEM (0-1000 pts)"
        )}
      </Button>

      {!isValidLength && essay.length > 0 && !hasImages && (
        <p className="text-sm text-center text-muted-foreground">
          Adicione pelo menos 50 palavras ou anexe uma imagem.
        </p>
      )}
    </div>
  )
}
