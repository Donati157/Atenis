// test/vnext/learning/store.test.ts

import { describe, it, expect } from "vitest"
import { InMemoryLearningStore } from "../../../lib/vnext/learning/store"
import { newTopicState } from "../../../lib/vnext/learning/types"

function stateFor(studentId: string, topic: string) {
  return newTopicState({
    studentId,
    topic,
    createdAt: "2026-08-11T14:00:00.000Z",
  })
}

describe("InMemoryLearningStore", () => {
  it("load antes de save retorna null", async () => {
    const store = new InMemoryLearningStore()
    expect(await store.load("s1", "quadratic")).toBeNull()
  })

  it("save + load round-trip", async () => {
    const store = new InMemoryLearningStore()
    const s = stateFor("s1", "quadratic")
    await store.save(s)
    expect(await store.load("s1", "quadratic")).toEqual(s)
  })

  it("isola por (studentId, topic)", async () => {
    const store = new InMemoryLearningStore()
    const a = stateFor("s1", "quadratic")
    const b = stateFor("s1", "cinematica")
    const c = stateFor("s2", "quadratic")
    await store.save(a)
    await store.save(b)
    await store.save(c)
    expect(await store.load("s1", "quadratic")).toEqual(a)
    expect(await store.load("s1", "cinematica")).toEqual(b)
    expect(await store.load("s2", "quadratic")).toEqual(c)
  })

  it("delete remove só o alvo", async () => {
    const store = new InMemoryLearningStore()
    await store.save(stateFor("s1", "a"))
    await store.save(stateFor("s1", "b"))
    await store.delete("s1", "a")
    expect(await store.load("s1", "a")).toBeNull()
    expect(await store.load("s1", "b")).not.toBeNull()
  })

  it("listByStudent devolve todos os topics daquele aluno", async () => {
    const store = new InMemoryLearningStore()
    await store.save(stateFor("s1", "a"))
    await store.save(stateFor("s1", "b"))
    await store.save(stateFor("s2", "c"))
    const list = await store.listByStudent!("s1")
    expect(list.map((x) => x.topic).sort()).toEqual(["a", "b"])
  })
})
