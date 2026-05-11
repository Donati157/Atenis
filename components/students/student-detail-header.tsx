import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Shield, TrendingUp, History, Pencil } from "lucide-react"

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º ano",
  "7th_grade": "7º ano",
  "8th_grade": "8º ano",
  "9th_grade": "9º ano",
  "10th_grade": "10º ano",
  "11th_grade": "11º ano",
  "12th_grade": "12º ano",
}

interface Props {
  studentId: string
  fullName: string | null
  email: string | null
  gradeLevel: string | null
  staffRoleLabel: string
  activeTab: "progress" | "history" | "edit"
}

export function StudentDetailHeader({
  studentId,
  fullName,
  email,
  gradeLevel,
  staffRoleLabel,
  activeTab,
}: Props) {
  return (
    <>
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/students">
                <ArrowLeft className="h-4 w-4" />
                Alunos
              </Link>
            </Button>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/50 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/logo.jpeg"
                alt="Atenis"
                width={28}
                height={28}
                className="rounded-full ring-1 ring-border/50"
              />
              <span className="font-semibold font-display">Atenis</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span>{staffRoleLabel}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold font-display">
                {fullName || email || "(sem nome)"}
              </h1>
              <div className="text-muted-foreground mt-1 text-sm flex items-center gap-2 flex-wrap">
                <span>{email}</span>
                {gradeLevel && (
                  <>
                    <span>·</span>
                    <Badge variant="secondary">
                      {GRADE_LABELS[gradeLevel] || gradeLevel}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="inline-flex gap-1 p-1 rounded-lg bg-muted border border-border/40">
            <Button
              asChild
              variant={activeTab === "progress" ? "default" : "ghost"}
              size="sm"
            >
              <Link href={`/dashboard/students/${studentId}/progress`}>
                <TrendingUp className="h-4 w-4" />
                Progresso
              </Link>
            </Button>
            <Button
              asChild
              variant={activeTab === "history" ? "default" : "ghost"}
              size="sm"
            >
              <Link href={`/dashboard/students/${studentId}/history`}>
                <History className="h-4 w-4" />
                Histórico
              </Link>
            </Button>
            <Button
              asChild
              variant={activeTab === "edit" ? "default" : "ghost"}
              size="sm"
            >
              <Link href={`/dashboard/students/${studentId}/edit`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
