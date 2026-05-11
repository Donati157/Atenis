import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyRound, ArrowLeft, GraduationCap, ShieldCheck } from "lucide-react"

export function ForgotPasswordForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-accent" />
          Esqueci minha senha
        </CardTitle>
        <CardDescription>
          Pra redefinir sua senha, peça ajuda a alguém da equipe da Atenis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <GraduationCap className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Avise um professor</p>
              <p className="text-muted-foreground">
                Qualquer professor que use a Atenis pode acionar a equipe pra resetar
                sua senha.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Ou fale com um admin</p>
              <p className="text-muted-foreground">
                Walter Neto (Suporte) ou um admin do site podem definir uma senha
                nova pra você direto pelo painel de gestão.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Por segurança, não enviamos link de reset por e-mail — a senha precisa
          ser redefinida por alguém autorizado.
        </p>

        <Button asChild className="w-full">
          <Link href="/auth/login">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
