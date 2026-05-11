"use client"

import { useCallback, useEffect, useState } from "react"

function readKey(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback
  try {
    const v = window.localStorage.getItem(key)
    return v ?? fallback
  } catch {
    return fallback
  }
}

function writeKey(key: string, value: string) {
  if (typeof window === "undefined") return
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    // ignore (Safari private mode, quota, etc.)
  }
}

/**
 * Persistent text state backed by localStorage.
 *
 * - Reads synchronously on first render (no flash of empty value).
 * - Re-reads if `key` changes during the component's lifetime.
 * - Writes IMMEDIATELY on every change — no debounce — so navigating away
 *   never loses what was typed.
 *
 * Returns `[value, setValue, clear]`. Call `clear()` after submit.
 */
export function useDraft(
  key: string,
  initial = "",
): [string, (v: string) => void, () => void] {
  const [value, setValueState] = useState(() => readKey(key, initial))

  // Re-load when the key changes (e.g., chatKey changes between conversations).
  useEffect(() => {
    setValueState(readKey(key, initial))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const setValue = useCallback(
    (v: string) => {
      setValueState(v)
      writeKey(key, v)
    },
    [key],
  )

  const clear = useCallback(() => {
    setValueState("")
    writeKey(key, "")
  }, [key])

  return [value, setValue, clear]
}
