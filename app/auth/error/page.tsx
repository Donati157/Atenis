import Link from "next/link"
import { AuthShell } from "@/components/auth-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  return (
    <AuthShell>
      <ErrorCard searchParams={searchParams} />
    </AuthShell>
  )
}

async function ErrorCard({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  return (
    <Card>
      <CardHeader>
        <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl text-center">Algo deu errado</CardTitle>
        <CardDescription className="text-center">
          {message || "Ocorreu um erro inesperado. Tente novamente."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/auth/login">Voltar ao login</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
