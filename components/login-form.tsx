"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [existingEmail, setExistingEmail] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/dashboard"
  const justSignedUp = searchParams.get("signup") === "ok"
  const sessionReset = searchParams.get("reset") === "1"

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setExistingEmail(data.user.email)
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : error.message)
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Entrar</CardTitle>
        <CardDescription>Acesse seu assistente de estudos</CardDescription>
      </CardHeader>
      <CardContent>
        {justSignedUp && (
          <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-foreground/90">
              Sua conta foi criada. Faça login pra continuar.
            </p>
          </div>
        )}

        {sessionReset && !justSignedUp && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="text-foreground/90">
              Tua sessão expirou ou estava com problema — a gente já zerou
              os cookies do site nesse dispositivo. Entra de novo abaixo.
            </p>
          </div>
        )}

        {existingEmail && (
          <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
            <p className="text-foreground/90 mb-2">
              Você já está conectado como <span className="font-medium">{existingEmail}</span>.
            </p>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => {
                router.push(next)
                router.refresh()
              }}
            >
              Continuar para o app
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Ou entre abaixo com outra conta.
            </p>
          </div>
        )}

        {/* Login com Google (mesma conta usada no signup) */}
        <button
          type="button"
          onClick={async () => {
            setError(null)
            setLoading(true)
            const supabase = createClient()
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}${next}`,
                queryParams: { prompt: "select_account" },
              },
            })
            if (oauthError) {
              setError(oauthError.message)
              setLoading(false)
            }
          }}
          disabled={loading}
          aria-label="Entrar com sua conta Google"
          className="w-full h-12 rounded-md bg-white hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-zinc-900 inline-flex items-center justify-center gap-3 px-4 font-medium shadow-sm border border-zinc-200 mb-4"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          <span>Entrar com Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">
              ou entre com e-mail
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            <Link
              href="/auth/forgot-password"
              className="text-accent underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Não tem uma conta?{" "}
            <Link href="/auth/sign-up" className="text-accent underline-offset-4 hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
