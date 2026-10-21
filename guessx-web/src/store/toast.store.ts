import { create } from "zustand"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  message: string
  type: ToastType
  exiting?: boolean
  progress?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
  updateProgress: (id: string, progress: number) => void
}

let count = 0

const DURATION = 8000

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = "info") => {
    const id = `toast-${++count}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type, progress: 100 }] }))
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, progress: remaining } : t)),
      }))
    }, 16)
    setTimeout(() => {
      clearInterval(interval)
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      }))
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 300)
    }, DURATION)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  updateProgress: (id, progress) =>
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, progress } : t)),
    })),
}))

export function toast(message: string, type?: ToastType) {
  useToastStore.getState().addToast(message, type)
}
