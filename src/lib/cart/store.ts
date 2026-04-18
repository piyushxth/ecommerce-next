"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { MAX_QTY_PER_ITEM, type CartItem } from "./types";

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  // hasHydrated flips to true after zustand/persist finishes loading from
  // localStorage. Used by components to avoid rendering mismatched values
  // between server HTML (empty cart) and the first client render.
  hasHydrated: boolean;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
};

function clampQty(qty: number, inStock: number): number {
  if (!Number.isFinite(qty)) return 1;
  const max = Math.min(MAX_QTY_PER_ITEM, Math.max(inStock, 0));
  if (max <= 0) return 0;
  return Math.max(1, Math.min(Math.floor(qty), max));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hasHydrated: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (item, quantity = 1) => {
        const { items } = get();
        const existing = items.find((i) => i.variantId === item.variantId);
        if (existing) {
          const next = clampQty(existing.quantity + quantity, existing.inStock);
          set({
            items: items.map((i) =>
              i.variantId === item.variantId ? { ...i, quantity: next } : i,
            ),
            isOpen: true,
          });
          return;
        }
        const qty = clampQty(quantity, item.inStock);
        if (qty <= 0) return;
        set({
          items: [...items, { ...item, quantity: qty }],
          isOpen: true,
        });
      },

      removeItem: (variantId) =>
        set((s) => ({
          items: s.items.filter((i) => i.variantId !== variantId),
        })),

      setQuantity: (variantId, quantity) =>
        set((s) => ({
          items: s.items.flatMap((i) => {
            if (i.variantId !== variantId) return [i];
            const next = clampQty(quantity, i.inStock);
            if (next <= 0) return []; // setting to 0 removes the line
            return [{ ...i, quantity: next }];
          }),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "ecom-cart",
      storage: createJSONStorage(() => localStorage),
      // Persist only the items list; isOpen is ephemeral UI state.
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => () => {
        useCartStore.setState({ hasHydrated: true });
      },
    },
  ),
);

// Derived selectors. Kept as plain functions so callers can opt into
// fine-grained subscriptions via `useCartStore(selectCartCount)`.
export const selectCartItems = (s: CartState) => s.items;
export const selectCartCount = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
