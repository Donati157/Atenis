// test/vnext/endpoint/tutor-route.test.ts
//
// Testa a rota /api/vnext/tutor chamando POST direto (sem servidor).
// Confirma:
//   - retorna 404 quando env não está setado (default);
//   - retorna 200 com output válido quando env=true;
//   - rejeita body inválido com 400.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { POST } from "../../../app/api/vnext/tutor/route"

async function callPost(body: unknown): Promise<{
  status: number
  body: unknown
}> {
  const req = new Request("http://localhost/api/vnext/tutor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const res = await POST(req)
  return { status: res.status, body: await res.json() }
}

const originalEnv = process.env.ATENIS_VNEXT_TUTOR_ENABLED

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.ATENIS_VNEXT_TUTOR_ENABLED
  } else {
    process.env.ATENIS_VNEXT_TUTOR_ENABLED = originalEnv
  }
})

describe("POST /api/vnext/tutor", () => {
  it("retorna 404 quando env=absent (rota dev protegida)", async () => {
    delete process.env.ATENIS_VNEXT_TUTOR_ENABLED
    const { status } = await callPost({ studentId: "s1", topic: "quadratic" })
    expect(status).toBe(404)
  })

  it("retorna 400 pra body malformado quando enabled", async () => {
    process.env.ATENIS_VNEXT_TUTOR_ENABLED = "true"
    const { status } = await callPost({ garbage: true })
    expect(status).toBe(400)
  })

  it("retorna 200 + output válido quando enabled", async () => {
    process.env.ATENIS_VNEXT_TUTOR_ENABLED = "true"
    const { status, body } = await callPost({
      studentId: "s1",
      topic: "quadratic",
      message: "Não entendo função quadrática.",
    })
    expect(status).toBe(200)
    const output = (body as { output: { executedPhase: string } }).output
    // Primeiro tick sem event = diagnose
    expect(output.executedPhase).toBe("diagnose")
  })
})
