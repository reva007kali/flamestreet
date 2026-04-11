import { create } from "zustand";

type ModifierOptionSnapshot = {
  modifier_name: string;
  option_name: string;
  additional_price: number;
};

export type CartItem = {
  key: string;
  product_id: number;
  slug?: string | null;
  name: string;
  image?: string | null;
  base_price: number;
  modifier_option_ids?: number[];
  modifier_options?: ModifierOptionSnapshot[];
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "quantity" | "key">,
    quantity?: number,
  ) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
  totalItems: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item, quantity = 1) => {
    const ids = (item.modifier_option_ids ?? []).slice().sort((a, b) => a - b);
    const key = `${item.product_id}:${ids.join(",")}`;
    const items = get().items.slice();
    const idx = items.findIndex((i) => i.key === key);
    if (idx >= 0) {
      items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
    } else {
      items.push({ ...item, key, modifier_option_ids: ids, quantity });
    }
    set({ items });
  },
  removeItem: (key) => set({ items: get().items.filter((i) => i.key !== key) }),
  setQuantity: (key, quantity) => {
    const q = Math.max(1, quantity);
    set({
      items: get().items.map((i) =>
        i.key === key ? { ...i, quantity: q } : i,
      ),
    });
  },
  clear: () => set({ items: [] }),
  total: () =>
    get().items.reduce((sum, i) => {
      const add = (i.modifier_options ?? []).reduce(
        (s, o) => s + Number(o.additional_price ?? 0),
        0,
      );
      const unit = Number(i.base_price ?? 0) + add;
      return sum + unit * i.quantity;
    }, 0),
  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
