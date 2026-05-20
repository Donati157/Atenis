"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { ChatInterface } from "@/components/chat-interface"
import { GCDCorrector } from "@/components/gcd/gcd-corrector"
import { APCorrector } from "@/components/ap/ap-corrector"
import { ENEMCorrector } from "@/components/enem/enem-corrector"
import { createClient } from "@/lib/supabase/client"
import { isSuperAdmin } from "@/lib/super-admin"
import {
  SUBJECTS,
  EXAM_PREPS,
  CORRECTORS,
  SUB_SUBJECTS,
  isUpperSecondary,
  type SubjectId,
  type ExamPrepId,
  type CorrectorId,
  type SubSubjectId,
} from "@/lib/subjects"
import {
  LogOut,
  Home,
  Menu,
  X,
  Plus,
  CheckSquare,
  Users,
  Shield,
  TrendingUp,
  Calendar,
  HelpCircle,
  Briefcase,
  BookOpen,
  Compass,
  MessageSquare,
  Trash2,
  Sparkles,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatDashboardProps {
  user: User
  profile: {
    id: string
    full_name: string | null
    grade_level: string | null
    role?: string | null
  } | null
}

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º ano",
  "7th_grade": "7º ano",
  "8th_grade": "8º ano",
  "9th_grade": "9º ano",
  "10th_grade": "10º ano",
  "11th_grade": "11º ano",
  "12th_grade": "12º ano",
}

const ROLE_LABELS: Record<string, string> = {
  student: "Estudante",
  professor: "Professor",
  admin: "Admin",
}

export function ChatDashboard({ user, profile }: ChatDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [subject, setSubject] = useState<SubjectId | null>(null)
  const [subSubject, setSubSubject] = useState<SubSubjectId | null>(null)
  const [examPrep, setExamPrep] = useState<ExamPrepId | null>(null)
  const [corrector, setCorrector] = useState<CorrectorId | null>(null)
  // chatKey é UUID novo a cada "Nova conversa" ou troca de matéria/prep/
  // corretor. UUID (em vez de int incremental) evita colisão com
  // localStorage de sessões anteriores que poderia ressuscitar mensagens
  // de uma chave reusada.
  const [chatKey, setChatKey] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now()),
  )
  const newChatKey = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  const [threadId, setThreadId] = useState<string | null>(null)
  const [vanillaMode, setVanillaMode] = useState(false)
  const [threads, setThreads] = useState<
    Array<{ id: string; title: string; subject: string | null; exam_prep: string | null; updated_at: string }>
  >([])

  // Carrega lista de threads do usuário pra mostrar na sidebar.
  const refreshThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/threads")
      if (!res.ok) return
      const json = (await res.json()) as { threads: typeof threads }
      setThreads(json.threads ?? [])
    } catch {
      // silencioso
    }
  }, [])

  useEffect(() => {
    refreshThreads()
  }, [refreshThreads])

  const handleThreadCreated = useCallback(
    (id: string) => {
      setThreadId(id)
      refreshThreads()
    },
    [refreshThreads],
  )

  const openThread = useCallback((id: string) => {
    setThreadId(id)
    setChatKey(newChatKey())
    setSidebarOpen(false)
  }, [])

  const deleteThread = useCallback(
    async (id: string) => {
      // Update otimista: remove da lista imediatamente. Se o DELETE falhar,
      // recoloca tudo via refreshThreads. Sem window.confirm pra não ser
      // silenciosamente bloqueado em mobile/iPad.
      const previous = threads
      setThreads((cur) => cur.filter((t) => t.id !== id))
      if (threadId === id) {
        setThreadId(null)
        setChatKey(newChatKey())
      }
      try {
        const res = await fetch(`/api/threads/${id}`, { method: "DELETE" })
        if (!res.ok) {
          console.error(
            "deleteThread: backend retornou",
            res.status,
            await res.text().catch(() => ""),
          )
          setThreads(previous) // rollback
        }
      } catch (err) {
        console.error("deleteThread: fetch falhou", err)
        setThreads(previous) // rollback
      }
    },
    [threadId, threads],
  )
  const router = useRouter()
  const pathname = usePathname()

  const canShowNaturalSub =
    isUpperSecondary(profile?.grade_level) ||
    profile?.role === "admin" ||
    profile?.role === "professor"

  const goToTutorHome = () => {
    setSubject(null)
    setSubSubject(null)
    setExamPrep(null)
    setCorrector(null)
    setThreadId(null)
    setChatKey(newChatKey())
    setSidebarOpen(false)
    if (pathname !== "/dashboard") router.push("/dashboard")
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const selectSubject = (id: SubjectId) => {
    setSubject((cur) => (cur === id ? null : id))
    setSubSubject(null)
    setExamPrep(null)
    setCorrector(null)
    setThreadId(null)
    setChatKey(newChatKey())
    setSidebarOpen(false)
  }

  const selectSubSubject = (id: SubSubjectId) => {
    setSubSubject((cur) => (cur === id ? null : id))
    setThreadId(null)
    setChatKey(newChatKey())
    setSidebarOpen(false)
  }

  const selectExam = (id: ExamPrepId) => {
    setExamPrep((cur) => (cur === id ? null : id))
    setSubject(null)
    setSubSubject(null)
    setCorrector(null)
    setThreadId(null)
    setChatKey(newChatKey())
    setSidebarOpen(false)
  }

  const selectCorrector = (id: CorrectorId) => {
    setCorrector((cur) => (cur === id ? null : id))
    setSubject(null)
    setSubSubject(null)
    setExamPrep(null)
    setThreadId(null)
    setChatKey(newChatKey())
    setSidebarOpen(false)
  }

  const newChat = () => {
    // Limpa o rascunho do contexto atual antes de remontar o chat — assim
    // "Nova conversa" começa com a caixa de texto vazia.
    if (typeof window !== "undefined") {
      try {
        const draftKey = `atenis.chatDraft.${[
          subject ?? "_",
          subSubject ?? "_",
          examPrep ?? "_",
        ].join(".")}`
        window.localStorage.removeItem(draftKey)
      } catch {
        // ignora
      }
    }
    setThreadId(null)
    setChatKey(newChatKey())
    setSidebarOpen(false)
  }

  const displayName = profile?.full_name || user.email || "Estudante"
  const gradeLabel = profile?.grade_level ? GRADE_LABELS[profile.grade_level] : null
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : null
  const isStaff =
    profile?.role === "professor" ||
    profile?.role === "leadership" ||
    profile?.role === "admin"
  const isAdminOrLeader =
    profile?.role === "admin" || profile?.role === "leadership"

  return (
    <div
      className="h-screen flex flex-col bg-background"
      onDragOver={(e) => {
        // Bloqueia o comportamento default do browser (abrir o arquivo em outra
        // aba) em qualquer canto do dashboard. O drop em si só é tratado pelo
        // chat-interface — fora dele o arquivo é descartado.
        if (e.dataTransfer.types.includes("Files")) e.preventDefault()
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault()
      }}
    >
      <header className="border-b border-border/50 h-14 flex items-center px-4 shrink-0 bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <button
              type="button"
              onClick={goToTutorHome}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              aria-label="Ir para a página inicial do tutor"
            >
              <Image
                src="/logo.jpeg"
                alt="Atenis"
                width={32}
                height={32}
                className="rounded-full ring-1 ring-border/50"
              />
              <span className="font-semibold hidden sm:inline font-display">
                Atenis
              </span>
            </button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Toggle Modo Atenis ↔ Modo Normal */}
            <Button
              variant={vanillaMode ? "outline" : "default"}
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => setVanillaMode((v) => !v)}
              title={
                vanillaMode
                  ? "Modo Normal: IA genérica, sem o método Atenis. Clique pra voltar ao Atenis."
                  : "Modo Atenis: tutor completo (5 habilidades de ensino + voz + currículo). Clique pra ver como uma IA genérica responderia."
              }
            >
              {vanillaMode ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {vanillaMode ? "Modo Normal" : "Modo Atenis"}
            </Button>
            <Button
              variant={vanillaMode ? "outline" : "default"}
              size="icon"
              className="md:hidden"
              onClick={() => setVanillaMode((v) => !v)}
              aria-label={
                vanillaMode
                  ? "Mudar pra Modo Atenis"
                  : "Mudar pra Modo Normal"
              }
              title={vanillaMode ? "Modo Normal" : "Modo Atenis"}
            >
              {vanillaMode ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>

            {/* Nova conversa: texto em sm+, só ícone em mobile */}
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={newChat}>
              <Plus className="h-4 w-4" />
              Nova conversa
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={newChat}
              aria-label="Nova conversa"
              title="Nova conversa"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground hidden md:inline max-w-[200px] truncate">
              {displayName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToTutorHome}
              aria-label="Página inicial do tutor"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed md:relative inset-y-0 left-0 top-14 md:top-0 z-50 md:z-0 w-64 bg-card/50 md:bg-transparent border-r border-border/50 transform transition-transform duration-200 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
          <div className="flex flex-col h-full p-4 overflow-y-auto">
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden mb-4 justify-start"
              onClick={newChat}
            >
              <Plus className="h-4 w-4" />
              Nova conversa
            </Button>

            {isStaff && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Gestão
                </h3>
                <div className="space-y-1">
                  <Link
                    href="/dashboard/students"
                    className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
                  >
                    <Users className="h-4 w-4" />
                    <span>Alunos</span>
                  </Link>
                  {isAdminOrLeader && (
                    <Link
                      href="/dashboard/teachers"
                      className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>Professores</span>
                    </Link>
                  )}
                  {(profile?.role === "admin" ||
                    (profile?.role === "leadership" &&
                      user.id === "aee6d329-a599-4506-88e3-90b3b7f19a72")) && (
                    <Link
                      href="/dashboard/leaders"
                      className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
                    >
                      <Compass className="h-4 w-4" />
                      <span>Liderança</span>
                    </Link>
                  )}
                  {profile?.role === "admin" && isSuperAdmin(user.id) && (
                    <Link
                      href="/dashboard/admins"
                      className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admins</span>
                    </Link>
                  )}
                  {isStaff && (
                    <Link
                      href="/dashboard/material"
                      className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Matéria</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Meu tutor
              </h3>
              <div className="space-y-1">
                <Link
                  href="/dashboard/plan"
                  className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Trilha de estudos</span>
                </Link>
                <Link
                  href="/dashboard/insights"
                  className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Insights</span>
                </Link>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />
                Conversas
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {threads.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 px-3 py-2">
                    Suas conversas aparecem aqui.
                  </p>
                ) : (
                  threads.map((t) => {
                    const isActive = threadId === t.id
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "group flex items-center gap-1 rounded-lg transition-colors",
                          isActive
                            ? "bg-accent/15 text-accent"
                            : "hover:bg-secondary/50 text-foreground/80",
                        )}
                      >
                        <button
                          onClick={() => openThread(t.id)}
                          className="flex-1 text-sm px-3 py-2 text-left truncate min-w-0"
                          title={t.title}
                        >
                          {t.title}
                        </button>
                        <button
                          onClick={() => deleteThread(t.id)}
                          className="px-2 py-1 text-muted-foreground/60 hover:text-destructive transition-colors"
                          aria-label="Apagar conversa"
                          title="Apagar conversa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>


            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Matérias
              </h3>
              <div className="space-y-1">
                {SUBJECTS.map((s) => {
                  const isSelected = subject === s.id
                  const hasSubs = s.id === "natural_science" && canShowNaturalSub
                  return (
                    <div key={s.id}>
                      <button
                        onClick={() => selectSubject(s.id)}
                        className={cn(
                          "w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2",
                          isSelected
                            ? "bg-accent/15 text-accent"
                            : "hover:bg-secondary/50 text-foreground/80",
                        )}
                      >
                        <span>{s.emoji}</span>
                        <span>{s.label}</span>
                      </button>
                      {hasSubs && isSelected && (
                        <div className="mt-1 ml-3 pl-3 border-l-2 border-accent/30 space-y-0.5">
                          {SUB_SUBJECTS.natural_science.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => selectSubSubject(sub.id)}
                              className={cn(
                                "w-full text-xs px-2.5 py-1.5 rounded-md transition-colors text-left flex items-center gap-2",
                                subSubject === sub.id
                                  ? "bg-accent/20 text-accent font-medium"
                                  : "hover:bg-secondary/40 text-foreground/70",
                              )}
                            >
                              <span>{sub.emoji}</span>
                              <span>{sub.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Preparação
              </h3>
              <div className="space-y-1">
                {EXAM_PREPS.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => selectExam(e.id)}
                    className={cn(
                      "w-full text-sm px-3 py-2 rounded-lg transition-colors text-left",
                      examPrep === e.id
                        ? "bg-accent/15 text-accent"
                        : "hover:bg-secondary/50 text-foreground/80",
                    )}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
                <CheckSquare className="h-3 w-3" />
                Correção
              </h3>
              <div className="space-y-1">
                {CORRECTORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCorrector(c.id)}
                    className={cn(
                      "w-full text-sm px-3 py-2 rounded-lg transition-colors text-left",
                      corrector === c.id
                        ? "bg-accent/15 text-accent"
                        : "hover:bg-secondary/50 text-foreground/80",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto border-t border-border/50 pt-4 space-y-3">
              <Link
                href="/ajuda"
                className="w-full text-sm px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2 hover:bg-secondary/50 text-foreground/80"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Ajuda &amp; FAQ</span>
              </Link>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {roleLabel && (
                  <p className="font-medium text-foreground/80">
                    {roleLabel}
                    {gradeLabel ? ` · ${gradeLabel}` : ""}
                  </p>
                )}
                <p className="truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          {corrector === "gcd" ? (
            <GCDCorrector />
          ) : corrector === "ap_mock" ? (
            <APCorrector />
          ) : corrector === "enem_redacao" ? (
            <ENEMCorrector />
          ) : (
            <ChatInterface
              key={chatKey}
              subject={subject}
              subSubject={subSubject}
              examPrep={examPrep}
              corrector={corrector}
              chatKey={chatKey}
              threadId={threadId}
              vanillaMode={vanillaMode}
              onThreadCreated={handleThreadCreated}
              userName={profile?.full_name || undefined}
              userEmail={user.email}
              userRole={profile?.role}
            />
          )}
        </main>
      </div>
    </div>
  )
}
