import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastStore {
  toast: Toast | null
  show: (message: string, action?: Toast['action']) => void
  dismiss: () => void
}

let nextId = 0
let timer: ReturnType<typeof setTimeout> | undefined

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  show: (message, action) => {
    clearTimeout(timer)
    const id = ++nextId
    set({ toast: { id, message, action } })
    timer = setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 6000)
  },
  dismiss: () => {
    clearTimeout(timer)
    set({ toast: null })
  },
}))
