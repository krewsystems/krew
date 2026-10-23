import { create } from 'zustand'

interface ToastItem {
  id: number
  title: string
  description?: string
}

interface ToastState {
  current: ToastItem | null
  push: (title: string, description?: string) => void
  clear: () => void
}

let next = 1

/** One toast at a time (Arc's Toast is a single surface); a new one replaces the last. */
export const useToasts = create<ToastState>((set) => ({
  current: null,
  push: (title, description) => set({ current: { id: next++, title, description } }),
  clear: () => set({ current: null }),
}))

export const toast = (title: string, description?: string) => useToasts.getState().push(title, description)
