"use client"

import { useRef, useEffect, useState, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useDraft } from "@/lib/use-draft"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Send, Sparkles, Loader2, CheckSquare, Upload } from "lucide-react"
import { ChatMessage } from "@/components/chat-message"
import {
  AttachmentPicker,
  attachmentToDataUrl,
  filesToAttachments,
  type Attachment,
} from "@/components/attachment-picker"
import { createClient } from "@/lib/supabase/client"
import { logLearningEvent } from "@/lib/learning-events"
import { getDisplayName } from "@/lib/display-name"
import { TutorHome } from "@/components/tutor-home"
import {
  SUBJECTS,
  EXAM_PREPS,
  CORRECTORS,
  SUB_SUBJECTS,
  type SubjectId,
  type ExamPrepId,
  type CorrectorId,
  type SubSubjectId,
} from "@/lib/subjects"

// Junta todos os text parts de uma mensagem do modelo, deduplicando.
// O Gemini, ao usar tool calls (ex: google_search), pode emitir múltiplos
// text parts e ocasionalmente re-emitir o prefixo (resultado: "Ok, vocêOk, você").
// Esta função:
//   1. Pula text parts consecutivos idênticos.
//   2. Quando um part é prefixo do próximo (re-emissão pós tool call),
//      mantém só a versão mais completa.
function joinTextParts(
  parts: ReadonlyArray<{ type: string } & Record<string, unknown>>,
): string {
  const texts = parts
    .filter((p): p is { type: "text"; text: string } =>
      p.type === "text" && typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
  const out: string[] = []
  for (const t of texts) {
    if (!t) continue
    const prev = out[out.length - 1]
    if (prev === undefined) {
      out.push(t)
      continue
    }
    if (prev === t) continue // duplicata exata
    if (t.startsWith(prev)) {
      // versão mais completa do anterior — substitui
      out[out.length - 1] = t
      continue
    }
    if (prev.startsWith(t)) continue // novo é prefixo do anterior — descarta
    out.push(t)
  }
  return out.join("")
}

const CORRECTOR_SUGGESTIONS: Record<CorrectorId, string[]> = {
  enem_redacao: [
    "Abra o corretor ENEM no sidebar (matéria → Correção → Redação ENEM) para correção completa pelas 5 competências.",
    "Me explique rapidamente cada competência do ENEM",
    "Quais as principais causas de redação zerada no ENEM?",
    "Me dê um repertório sociocultural sobre sustentabilidade",
  ],
  ap_mock: [
    "Avalie esta resposta de AP Lang FRQ-2 (Rhetorical Analysis):\n\n[cole seu texto aqui]",
    "Corrija este AP World History DBQ:\n\n[cole sua resposta]",
    "Dê a nota e feedback desta AP Calculus FRQ:\n\n[cole sua resolução]",
    "Avalie esta AP Biology FRQ:\n\n[cole sua resposta]",
  ],
  gcd: [
    "Corrija esta minha resposta da prova GCD:\n\n[cole aqui]",
    "Avalie esta redação no estilo GCD:\n\n[cole aqui]",
    "Dê feedback detalhado nesta resposta:\n\n[cole aqui]",
    "Revise esta dissertação GCD:\n\n[cole aqui]",
  ],
}

const SUGGESTIONS: Record<SubjectId | "default", string[]> = {
  default: [
    "Me explique o que é uma função quadrática",
    "Quais são as principais causas da Primeira Guerra Mundial?",
    "Como conjugar verbos no presente em inglês?",
    "Me ajude a escrever uma redação sobre sustentabilidade",
  ],
  portugues: [
    "Qual a diferença entre 'a' e 'há'?",
    "Me ajude a estruturar uma redação dissertativa-argumentativa",
    "Explique figuras de linguagem com exemplos",
    "Como analisar sintaticamente uma oração?",
  ],
  ingles: [
    "Explique a diferença entre simple past e present perfect",
    "Me dê 10 phrasal verbs comuns",
    "Como começar um essay em inglês?",
    "Corrija este texto em inglês para mim",
  ],
  matematica: [
    "Resolva passo a passo: 2x² - 8x + 6 = 0",
    "Explique o teorema de Pitágoras",
    "Como derivar funções trigonométricas?",
    "Me dê 5 questões de progressão aritmética",
  ],
  natural_science: [
    "Explique a tabela periódica de forma simples",
    "Como funciona a fotossíntese?",
    "O que são as leis de Newton?",
    "Qual a diferença entre mitose e meiose?",
  ],
  social_science: [
    "Resumo: Era Vargas",
    "Causas da Revolução Francesa",
    "Explique as placas tectônicas",
    "O que é globalização?",
  ],
  ap_electives: [
    "Quais são os AP electives mais aceitos por universidades?",
    "Me explique o formato da prova de AP Psychology",
    "Diferença entre AP Computer Science A e Principles",
    "Como me preparo pra um AP elective em 6 meses?",
  ],
  mentorship: [
    "Como organizar minha rotina de estudos?",
    "Estou indeciso entre cursos — como decidir?",
    "Dicas de gestão de tempo pra época de provas",
    "Como lidar com ansiedade antes da prova?",
  ],
  x_block_electives: [
    "O que é o Bloco X?",
    "Me sugere tópicos pra projeto de eletiva",
    "Como aproveitar melhor o Bloco X?",
    "Quero discutir minha eletiva — me dá feedback",
  ],
}

const SUB_SUBJECT_SUGGESTIONS: Record<SubSubjectId, string[]> = {
  fisica: [
    "Explique cinemática: MRU e MRUV com exemplos",
    "Resolva: um bloco de 5kg desce uma rampa de 30° sem atrito. Qual a aceleração?",
    "Diferença entre energia cinética e potencial, com fórmulas",
    "Me dê 3 questões de eletricidade nível ENEM",
  ],
  quimica: [
    "Explique a distribuição eletrônica de Linus Pauling",
    "Balanceie: C₃H₈ + O₂ → CO₂ + H₂O",
    "Diferença entre ligação iônica, covalente e metálica",
    "Me dê 3 questões de estequiometria nível vestibular",
  ],
  biologia: [
    "Explique o ciclo de Krebs passo a passo",
    "Diferença entre mitose e meiose com exemplos",
    "Genética: resolva um cruzamento AaBb × AaBb",
    "Me dê 3 questões de ecologia nível ENEM",
  ],
}

const EXAM_PREP_SUGGESTIONS: Record<ExamPrepId, string[]> = {
  enem: [
    "Me dê 3 questões interdisciplinares estilo ENEM",
    "Quais temas de redação mais caíram no ENEM nos últimos 5 anos?",
    "Estratégia pra fazer as 180 questões em 5h30",
    "Explique como funciona a TRI (nota do ENEM)",
  ],
  vestibular: [
    "Me dê 3 questões estilo Fuvest 1ª fase",
    "Diferença entre Fuvest, Unicamp e UERJ",
    "Como estruturar uma dissertação Unicamp",
    "Questões discursivas: dicas pra se sair bem",
  ],
  ap: [
    "Explique a diferença entre FRQ, DBQ e LEQ",
    "Dê 3 práticas de AP Calculus AB multiple choice",
    "Como estruturar uma thesis pra AP History DBQ?",
    "Quais APs são mais aceitos por universidades brasileiras?",
  ],
}

// Sugestões iniciais por matéria/sub-matéria. Cada lista mostra as 4
// habilidades de ensino (Explicar, Revisar, Exercícios, Simulado) com prompts
// específicos — assim o aluno descobre por contato o que a IA sabe fazer,
// sem precisar escolher modo no sidebar (a IA detecta pela frase).
type ContentKey = SubjectId | SubSubjectId
const SUBJECT_SUGGESTIONS: Partial<Record<ContentKey, string[]>> = {
  portugues: [
    "Me explique do zero o que é figura de linguagem",
    "Resumo relâmpago: classes gramaticais",
    "Me dê 1 questão de interpretação de texto nível médio",
    "Tenho prova de gramática quinta — me prepara pra tirar 100",
  ],
  ingles: [
    "Me explique a diferença entre present perfect e simple past",
    "Resumo relâmpago: tempos verbais em inglês",
    "Me dê um reading comprehension nível médio",
    "Tenho prova de inglês amanhã — me ajuda a tirar 100",
  ],
  matematica: [
    "Me explique do zero como resolver equação do 2º grau (Bhaskara)",
    "Resumo relâmpago: trigonometria básica",
    "Me dê 1 questão de função quadrática nível médio",
    "Perdi aulas de matemática e tenho prova — me prepara",
  ],
  natural_science: [
    "Me explique do zero como funciona a fotossíntese",
    "Resumo relâmpago: cinemática (MRU/MRUV)",
    "Me dê 1 questão de física nível médio",
    "Tenho prova de ciências sexta — me prepara pra tirar 100",
  ],
  social_science: [
    "Me explique a Era Vargas (1930-1945) com fases",
    "Resumo relâmpago: Brasil República",
    "Me dê 1 questão de interpretação de texto histórico",
    "Tenho prova de história quinta — me prepara",
  ],
  fisica: [
    "Me explique MRU e MRUV (cinemática) com exemplo",
    "Resumo relâmpago: leis da termodinâmica",
    "Me dê 1 questão de cinemática nível médio",
    "Tenho prova de física amanhã — me prepara pra tirar 100",
  ],
  quimica: [
    "Me explique a distribuição eletrônica de Linus Pauling",
    "Resumo relâmpago: química orgânica (funções)",
    "Me dê 1 questão de estequiometria nível médio",
    "Perdi aulas de química — me ajuda a chegar pronto na prova",
  ],
  biologia: [
    "Me explique do zero o ciclo de Krebs",
    "Resumo relâmpago: sistema circulatório humano",
    "Me dê 1 questão de genética nível médio",
    "Tenho prova de biologia sexta — me prepara",
  ],
}

interface ChatInterfaceProps {
  subject: SubjectId | null
  subSubject: SubSubjectId | null
  examPrep: ExamPrepId | null
  corrector: CorrectorId | null
  chatKey: number
  threadId: string | null
  vanillaMode: boolean
  onThreadCreated?: (id: string) => void
  userName?: string
  userEmail?: string | null
  userRole?: string | null
}

export function ChatInterface({
  subject,
  subSubject,
  examPrep,
  corrector,
  chatKey,
  threadId,
  vanillaMode,
  onThreadCreated,
  userName,
  userEmail,
  userRole,
}: ChatInterfaceProps) {
  // Cada chatKey corresponde a uma "sessão" de chat. Se o pai não passou
  // threadId, geramos um UUID na hora pra que o backend possa upsertar o
  // thread no banco com esse mesmo id. Avisamos o pai via callback pra
  // sidebar/URL refletirem.
  const localThreadIdRef = useRef<string | null>(null)
  if (localThreadIdRef.current === null) {
    localThreadIdRef.current =
      threadId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : null)
  }
  const effectiveThreadId = threadId ?? localThreadIdRef.current
  // Rascunho ancorado no CONTEXTO (matéria/sub-matéria/preparação/modo),
  // não no chatKey. Assim, voltar pra Matemática depois de passar pelo
  // Português recupera o que foi digitado em Matemática. Cada combinação
  // tem seu próprio rascunho.
  const draftKey = `atenis.chatDraft.${[
    subject ?? "_",
    subSubject ?? "_",
    examPrep ?? "_",
  ].join(".")}`
  const [input, setInput, clearDraft] = useDraft(draftKey)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [dragActive, setDragActive] = useState(false)
  const dragCounterRef = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          subject,
          subSubject,
          examPrep,
          corrector,
          threadId: effectiveThreadId,
          vanillaMode,
        },
      }),
    [
      subject,
      subSubject,
      examPrep,
      corrector,
      effectiveThreadId,
      vanillaMode,
    ],
  )

  const { messages, setMessages, sendMessage, status } = useChat({
    id: String(chatKey),
    transport,
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Persistência simples: salva mensagens no localStorage por chatKey.
  // Refresh recupera a conversa atual; "Nova conversa" (chatKey++) começa
  // do zero. Histórico antigo de outras chatKeys fica no localStorage até
  // ser sobrescrito (rebuild simples — limpamos slot zero ao iniciar nova).
  const historyKey = `atenis.chatHistory.${chatKey}`
  const restoredRef = useRef(false)

  // Carrega mensagens do servidor quando o pai passou um threadId existente
  // (ex: usuário clicou num item da sidebar de histórico). Isso sobrescreve
  // o localStorage do chatKey atual.
  useEffect(() => {
    if (!threadId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/threads/${threadId}`)
        if (!res.ok) return
        const json = (await res.json()) as {
          messages: Array<{
            id: string
            role: "user" | "assistant" | "system"
            parts: unknown
          }>
        }
        if (cancelled || !Array.isArray(json.messages)) return
        const restored = json.messages.map((m) => ({
          id: m.id,
          role: m.role,
          parts: Array.isArray(m.parts) ? m.parts : [],
        })) as unknown as typeof messages
        setMessages(restored)
      } catch {
        // silencioso
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  // Notifica o pai quando uma conversa "nova" (threadId local gerado) ganha
  // a primeira mensagem do user — só aí faz sentido aparecer na sidebar.
  const notifiedThreadRef = useRef(false)
  useEffect(() => {
    if (notifiedThreadRef.current) return
    if (threadId) return // pai já sabe, não veio do local
    if (!effectiveThreadId) return
    const hasUserMsg = messages.some((m) => m.role === "user")
    if (!hasUserMsg) return
    notifiedThreadRef.current = true
    onThreadCreated?.(effectiveThreadId)
  }, [messages, threadId, effectiveThreadId, onThreadCreated])

  useEffect(() => {
    // Restaura uma vez por chatKey (só se não tem threadId remoto)
    if (threadId) return
    restoredRef.current = false
    try {
      const raw = window.localStorage.getItem(historyKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        }
      }
    } catch {
      // ignore
    }
    restoredRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyKey, threadId])

  useEffect(() => {
    // Só persiste depois da restauração inicial pra não sobrescrever com [].
    if (!restoredRef.current) return
    try {
      if (messages.length === 0) {
        window.localStorage.removeItem(historyKey)
      } else {
        window.localStorage.setItem(historyKey, JSON.stringify(messages))
      }
    } catch {
      // localStorage cheio (PDFs em base64 são grandes) ou bloqueado — ignora
    }
  }, [messages, historyKey])

  // Drag-and-drop: aceita arquivo solto em qualquer lugar do chat. Sem isso,
  // o browser abre o PDF/imagem em outra aba.
  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    setDragActive(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setDragActive(false)
    if (isLoading) return
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    setAttachments((cur) => [...cur, ...filesToAttachments(files)])
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!input.trim() && attachments.length === 0) || isLoading) return

    const fileParts =
      attachments.length > 0
        ? await Promise.all(
            attachments.map(async (a) => ({
              type: "file" as const,
              mediaType: a.file.type || "application/octet-stream",
              url: await attachmentToDataUrl(a),
              filename: a.file.name,
            })),
          )
        : undefined

    sendMessage({
      text: input || "(arquivo anexado)",
      files: fileParts,
    })

    // Fire-and-forget analytics log
    void (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user) return
        await logLearningEvent(supabase, data.user.id, {
          kind: "chat_message",
          subject: subject ?? examPrep ?? corrector ?? null,
          metadata: {
            hasAttachments: (fileParts?.length ?? 0) > 0,
          },
        })
      } catch {
        // noop
      }
    })()

    clearDraft()
    setAttachments([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const subjectLabel = subject ? SUBJECTS.find((s) => s.id === subject)?.label : null
  const subSubjectLabel = subSubject
    ? SUB_SUBJECTS.natural_science.find((s) => s.id === subSubject)?.label
    : null
  const combinedSubjectLabel = subSubjectLabel
    ? `${subjectLabel} · ${subSubjectLabel}`
    : subjectLabel
  const examLabel = examPrep ? EXAM_PREPS.find((e) => e.id === examPrep)?.label : null
  const correctorLabel = corrector
    ? CORRECTORS.find((c) => c.id === corrector)?.label
    : null

  // Prioridade:
  //   corretor > sub-matéria > matéria > exam prep > default.
  // As 4 habilidades de ensino (Explicar/Revisar/Exercícios/Simulado) ficam
  // demonstradas nas sugestões de cada matéria — uma de cada por padrão.
  const contentKey: ContentKey | null = subSubject ?? subject
  const subjectSet = contentKey ? SUBJECT_SUGGESTIONS[contentKey] : undefined
  const suggestions = corrector
    ? CORRECTOR_SUGGESTIONS[corrector]
    : subjectSet
    ? subjectSet
    : subSubject
    ? SUB_SUBJECT_SUGGESTIONS[subSubject]
    : subject
    ? SUGGESTIONS[subject]
    : examPrep
    ? EXAM_PREP_SUGGESTIONS[examPrep]
    : SUGGESTIONS.default

  const mainBadge = correctorLabel
    ? { icon: "corrector" as const, text: `Correção: ${correctorLabel}` }
    : examLabel
    ? { icon: "default" as const, text: `Preparação: ${examLabel}` }
    : combinedSubjectLabel
    ? { icon: "default" as const, text: `Matéria: ${combinedSubjectLabel}` }
    : null

  const placeholder = corrector
    ? "Cole a resposta do aluno aqui para correção..."
    : "Digite sua pergunta..."

  const greetingName = getDisplayName({
    fullName: userName,
    email: userEmail,
    role: userRole,
  })
  const emptyStateTitle = corrector
    ? `Modo Correção — ${correctorLabel}`
    : `Olá, ${greetingName}! Como posso ajudar?`

  const emptyStateDescription = corrector
    ? "Cole a resposta do aluno abaixo e eu retorno nota, breakdown por critério e feedback formativo."
    : combinedSubjectLabel
    ? `Vamos estudar ${combinedSubjectLabel}. Faça uma pergunta ou escolha uma sugestão abaixo.`
    : "Pergunte sobre qualquer matéria: Português, Inglês, Matemática, Natural Science ou Social Science."

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="absolute inset-0 z-50 bg-accent/10 backdrop-blur-sm border-4 border-dashed border-accent/60 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-card/90 border border-accent/50 rounded-xl px-6 py-4 shadow-lg flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-accent" />
            <p className="text-sm font-medium">Solte aqui pra anexar</p>
            <p className="text-xs text-muted-foreground">PDF, imagem, docx, txt</p>
          </div>
        </div>
      )}
      {(mainBadge || vanillaMode) && (
        <div className="flex justify-center gap-2 flex-wrap border-b border-border/50 bg-card/30 py-2 px-4">
          {mainBadge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              {mainBadge.icon === "corrector" ? (
                <CheckSquare className="h-3 w-3 text-accent" />
              ) : (
                <Sparkles className="h-3 w-3 text-accent" />
              )}
              {mainBadge.text}
            </span>
          )}
          {vanillaMode && (
            <span className="inline-flex items-center gap-2 rounded-full border border-muted-foreground/50 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
              🌐 Modo Normal (IA genérica)
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 &&
          !subject &&
          !examPrep &&
          !corrector && (
            <TutorHome
              userName={userName}
              userEmail={userEmail}
              userRole={userRole}
            />
          )}

        {messages.length === 0 && (subject || examPrep || corrector) && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 sm:py-12">
            <div className="mb-3 sm:mb-4 inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
              {corrector ? (
                <CheckSquare className="h-6 w-6 sm:h-7 sm:w-7" />
              ) : (
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 font-display text-balance">
              {emptyStateTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md text-balance">
              {emptyStateDescription}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 sm:mt-8 max-w-2xl w-full">
              {suggestions.map((s) => (
                <Card
                  key={s}
                  className="p-3 sm:p-4 cursor-pointer hover:border-accent/50 hover:bg-secondary/50 transition-all text-left"
                  onClick={() => {
                    setInput(s)
                    textareaRef.current?.focus()
                  }}
                >
                  <p className="text-sm text-muted-foreground">{s}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = joinTextParts(message.parts)
          const fileParts = message.parts
            .filter((p): p is Extract<typeof p, { type: "file" }> => p.type === "file")
            .map((p) => ({
              url: p.url,
              mediaType: p.mediaType,
              filename: p.filename,
            }))
          if (message.role !== "user" && message.role !== "assistant") return null
          return (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={text}
              attachments={fileParts.length > 0 ? fileParts : undefined}
            />
          )
        })}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 max-w-3xl mx-auto animate-fade-in">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border/50 bg-background/80 backdrop-blur p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2">
          <AttachmentPicker
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            disabled={isLoading}
          />
          <div className="relative flex items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[52px] max-h-[200px] resize-none pr-12 text-base"
              disabled={isLoading}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              aria-label="Enviar mensagem"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Atenis AI — pode cometer erros. Verifique informações importantes.
          </p>
        </form>
      </div>
    </div>
  )
}
