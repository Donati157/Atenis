"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { gcdElements } from "@/lib/gcd-rubric"
import { useDraft } from "@/lib/use-draft"
import {
  AttachmentPicker,
  attachmentToDataUrl,
  type Attachment,
} from "@/components/attachment-picker"

interface EssayInputProps {
  onAnalyze: (essay: string, gcdElement: string | null, images: string[]) => void
  isLoading: boolean
}

export function EssayInput({ onAnalyze, isLoading }: EssayInputProps) {
  const [essay, setEssay, clearEssay] = useDraft("atenis.gcd.essay")
  const [gcdElement, setGcdElement, clearGcdElement] = useDraft("atenis.gcd.element")
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0
  const hasImages = attachments.some((a) => a.kind === "image")
  const isValidLength = wordCount >= 100 || hasImages

  const getWordCountColor = () => {
    if (wordCount < 1200) return "text-yellow-400"
    if (wordCount > 1500) return "text-red-400"
    return "text-green-400"
  }

  const handleSubmit = async () => {
    if ((!essay.trim() && !hasImages) || isLoading) return
    const images = await Promise.all(
      attachments.filter((a) => a.kind === "image").map(attachmentToDataUrl),
    )
    onAnalyze(essay, gcdElement || null, images)
    clearEssay()
    clearGcdElement()
    setAttachments([])
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Elemento GCD (opcional)</label>
        <Select value={gcdElement} onValueChange={setGcdElement}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o elemento GCD..." />
          </SelectTrigger>
          <SelectContent>
            {gcdElements.map((element) => (
              <SelectItem key={element} value={element}>
                {element}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Se não especificado, a IA tentará detectar automaticamente.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Seu ensaio</label>
          <span className={`text-sm font-mono ${getWordCountColor()}`}>
            {wordCount} / 1200–1500 palavras
          </span>
        </div>
        <Textarea
          placeholder="Cole ou digite seu ensaio aqui... (ou anexe uma foto/scan)"
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
            📸 A IA vai ler o texto manuscrito/impresso das imagens e avaliar pela rubrica GCD.
          </p>
        )}
        {!hasImages && wordCount < 1200 && wordCount > 0 && (
          <p className="text-xs text-yellow-400">
            Seu ensaio tem menos de 1200 palavras. O mínimo recomendado é 1200.
          </p>
        )}
        {!hasImages && wordCount > 1500 && (
          <p className="text-xs text-red-400">Seu ensaio excede o limite de 1500 palavras.</p>
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
            Analisando...
          </span>
        ) : (
          "Analisar ensaio"
        )}
      </Button>

      {!isValidLength && essay.length > 0 && !hasImages && (
        <p className="text-sm text-center text-muted-foreground">
          Adicione pelo menos 100 palavras ou anexe uma imagem.
        </p>
      )}
    </div>
  )
}
