import Link from "next/link"
import { AuthShell } from "@/components/auth-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl text-center">Conta criada!</CardTitle>
          <CardDescription className="text-center">
            Verifique seu e-mail para confirmar o cadastro e depois faça login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir para login</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
