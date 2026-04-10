import { create } from 'zustand'

export const useQueueStore = create((set) => ({
  counts: { queue_total: 0, queue_unpaid: 0 },
  setCounts: (counts) => set({ counts }),
}))

