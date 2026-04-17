import { create } from 'zustand'

let timer = null

export const useFullscreenNoticeStore = create((set) => ({
  open: false,
  title: '',
  subtitle: '',
  show: ({ title, subtitle, durationMs = 2000 }) => {
    if (timer) window.clearTimeout(timer)
    set({ open: true, title: title ?? '', subtitle: subtitle ?? '' })
    timer = window.setTimeout(() => set({ open: false, title: '', subtitle: '' }), durationMs)
  },
  hide: () => {
    if (timer) window.clearTimeout(timer)
    set({ open: false, title: '', subtitle: '' })
  },
}))

