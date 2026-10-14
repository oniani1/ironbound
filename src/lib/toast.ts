import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  text: string
}

let toasts: Toast[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Shows a short status line under the header, then clears it. */
export function toast(text: string, ms = 4200) {
  const t = { id: ++seq, text }
  toasts = [...toasts, t].slice(-3)
  emit()
  window.setTimeout(() => dismissToast(t.id), ms)
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useToasts() {
  return useSyncExternalStore(subscribe, () => toasts, () => toasts)
}
