"use client"

import { useRef, useEffect } from "react"
import { Paperclip, Camera, ScanLine, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Attachment {
  id: string
  file: File
  previewUrl: string
  kind: "image" | "file"
}

interface AttachmentPickerProps {
  attachments: Attachment[]
  onAttachmentsChange: (next: Attachment[]) => void
  disabled?: boolean
  accept?: string
  className?: string
}

const DEFAULT_ACCEPT = "image/*,.pdf,.txt,.md,.docx,.rtf"

export function AttachmentPicker({
  attachments,
  onAttachmentsChange,
  disabled,
  accept = DEFAULT_ACCEPT,
  className,
}: AttachmentPickerProps) {
  const attachInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const scanInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      for (const a of attachments) URL.revokeObjectURL(a.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const additions: Attachment[] = []
    for (const file of Array.from(files)) {
      additions.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind: file.type.startsWith("image/") ? "image" : "file",
      })
    }
    onAttachmentsChange([...attachments, ...additions])
  }

  const removeAttachment = (id: string) => {
    const target = attachments.find((a) => a.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onAttachmentsChange(attachments.filter((a) => a.id !== id))
  }

  return (
    <div className={cn("space-y-2", className)}>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div key={a.id} className="relative group">
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.previewUrl}
                  alt={a.file.name}
                  className="h-16 w-16 rounded-lg object-cover border border-border/50"
                />
              ) : (
                <div className="h-16 w-20 rounded-lg border border-border/50 bg-card/60 flex flex-col items-center justify-center p-1">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-[9px] text-muted-foreground leading-tight mt-0.5 truncate w-full text-center">
                    {a.file.name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                aria-label="Remover anexo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => attachInput.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border/60 bg-card/50 hover:bg-secondary/50 hover:border-accent/50 text-foreground/80 transition-colors disabled:opacity-50"
          title="Anexar arquivo (imagem, PDF, docx)"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Anexar
        </button>
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border/60 bg-card/50 hover:bg-secondary/50 hover:border-accent/50 text-foreground/80 transition-colors disabled:opacity-50"
          title="Tirar foto pela câmera"
        >
          <Camera className="h-3.5 w-3.5" />
          Câmera
        </button>
        <button
          type="button"
          onClick={() => scanInput.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border/60 bg-card/50 hover:bg-secondary/50 hover:border-accent/50 text-foreground/80 transition-colors disabled:opacity-50"
          title="Escanear documento (tira foto de alta qualidade que a IA faz OCR)"
        >
          <ScanLine className="h-3.5 w-3.5" />
          Escanear
        </button>
      </div>

      <input
        ref={attachInput}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <input
        ref={scanInput}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}

/** Converts File to a base64 data URL. Use for sending to server APIs. */
export async function attachmentToDataUrl(a: Attachment): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(a.file)
  })
}

/** Converts a FileList/File[] into Attachment objects (with preview URLs). */
export function filesToAttachments(files: ArrayLike<File>): Attachment[] {
  const out: Attachment[] = []
  for (const file of Array.from(files)) {
    out.push({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      kind: file.type.startsWith("image/") ? "image" : "file",
    })
  }
  return out
}
