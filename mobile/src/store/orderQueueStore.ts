import { create } from "zustand";

export type OrderQueueCounts = {
  queue_total?: number;
  queue_unpaid?: number;
};

type OrderQueueState = {
  counts: OrderQueueCounts;
  lastEventAt: number;
  setCounts: (counts: OrderQueueCounts) => void;
  bump: () => void;
};

export const useOrderQueueStore = create<OrderQueueState>((set) => ({
  counts: {},
  lastEventAt: 0,
  setCounts: (counts) => set({ counts: counts ?? {}, lastEventAt: Date.now() }),
  bump: () => set({ lastEventAt: Date.now() }),
}));

