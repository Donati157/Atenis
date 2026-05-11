import { Suspense } from "react"
import { AuthShell } from "@/components/auth-shell"
import { CompleteSignupClient } from "@/components/complete-signup-client"

export default function CompleteSignupPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <CompleteSignupClient />
      </Suspense>
    </AuthShell>
  )
}
