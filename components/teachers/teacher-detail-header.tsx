import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Shield, Pencil, BookOpen } from "lucide-react"

const GRADE_LABELS: Record<string, string> = {
  "6th_grade": "6º",
  "7th_grade": "7º",
  "8th_grade": "8º",
  "9th_grade": "9º",
  "10th_grade": "10º",
  "11th_grade": "11º",
  "12th_grade": "12º",
}

interface Props {
  professorId: string
  fullName: string | null
  email: string | null
  teachingGrades: string[] | null
  activeTab: "edit" | "content"
}

export function TeacherDetailHeader({
  professorId,
  fullName,
  email,
  teachingGrades,
  activeTab,
}: Props) {
  return (
    <>
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/teachers">
                <ArrowLeft className="h-4 w-4" />
                Professores
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
            <span>Admin</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-6 sm:pt-8 pb-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display">
              {fullName || email || "(sem nome)"}
            </h1>
            <div className="text-muted-foreground mt-1 text-sm flex items-center gap-2 flex-wrap">
              <span>{email}</span>
              {teachingGrades && teachingGrades.length > 0 && (
                <>
                  <span>·</span>
                  <span className="flex flex-wrap gap-1">
                    {teachingGrades.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs">
                        {GRADE_LABELS[g] ?? g}
                      </Badge>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="inline-flex gap-1 p-1 rounded-lg bg-muted border border-border/40">
            <Button
              asChild
              variant={activeTab === "content" ? "default" : "ghost"}
              size="sm"
            >
              <Link href={`/dashboard/teachers/${professorId}/content`}>
                <BookOpen className="h-4 w-4" />
                Conteúdo
              </Link>
            </Button>
            <Button
              asChild
              variant={activeTab === "edit" ? "default" : "ghost"}
              size="sm"
            >
              <Link href={`/dashboard/teachers/${professorId}/edit`}>
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
