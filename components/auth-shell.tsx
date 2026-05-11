import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.jpeg"
            alt="Atenis"
            width={96}
            height={96}
            priority
            className="rounded-full shadow-xl ring-1 ring-border/50"
          />
          <h1 className="text-2xl font-bold font-display">Atenis</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
