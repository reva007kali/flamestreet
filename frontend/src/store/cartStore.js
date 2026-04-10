import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items.slice()
        items.push(item)
        set({ items })
      },
      removeItem: (index) => {
        const items = get().items.slice()
        items.splice(index, 1)
        set({ items })
      },
      clearCart: () => set({ items: [] }),
      setQuantity: (index, quantity) => {
        const items = get().items.slice()
        if (!items[index]) return
        const next = Number(quantity ?? 0)
        if (next <= 0) {
          items.splice(index, 1)
          set({ items })
          return
        }
        items[index] = { ...items[index], quantity: Math.max(1, next) }
        set({ items })
      },
      total: () =>
        get().items.reduce((sum, item) => {
          const price = Number(item.product?.price ?? 0)
          return sum + price * (item.quantity ?? 1)
        }, 0),
    }),
    { name: 'flamestreet_cart' },
  ),
)
