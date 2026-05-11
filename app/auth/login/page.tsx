import { Suspense } from "react"
import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
