"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Sparkles, User, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MessageAttachment {
  url: string
  mediaType: string
  filename?: string
}

interface ChatMessageProps {
  role: "user" | "assistant" | "system"
  content: string
  attachments?: MessageAttachment[]
}

export function ChatMessage({ role, content, attachments }: ChatMessageProps) {
  const isUser = role === "user"
  const hasAttachments = (attachments?.length ?? 0) > 0
  return (
    <div
      className={cn(
        "flex gap-3 max-w-3xl mx-auto animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[85%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        {hasAttachments && (
          <div
            className={cn(
              "flex flex-wrap gap-2",
              isUser ? "justify-end" : "justify-start",
            )}
          >
            {attachments!.map((a, i) => {
              const isImage = a.mediaType?.startsWith("image/")
              if (isImage) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={a.url}
                    alt={a.filename ?? "anexo"}
                    className="h-24 w-24 rounded-lg object-cover border border-border/50"
                  />
                )
              }
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 px-3 py-2 max-w-[16rem]"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground/90 truncate">
                    {a.filename ?? "Arquivo"}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {(content || !hasAttachments) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
            ) : (
              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
