"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { MAX_QTY_PER_ITEM, type CartItem } from "./types";

// "guest"  → zustand state is authoritative, persisted to localStorage.
// "user"   → MongoDB is authoritative, zustand mirrors what the server sent.
//            Local mutations fire-and-forget the matching HTTP call, then
//            reconcile from the server's response.
type CartMode = "guest" | "user";

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  mode: CartMode;
  // hasHydrated flips to true after zustand/persist finishes loading from
  // localStorage. Used by components to avoid rendering mismatched values
  // between server HTML (empty cart) and the first client render.
  hasHydrated: boolean;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Switches the store into server-backed mode and replaces `items` with
  // whatever the API returned. Called once on sign-in.
  setServerCart: (items: CartItem[]) => void;
  // Switches back to localStorage-backed mode (called on sign-out). The
  // caller decides whether to clear the local items or not; we leave them
  // alone so the user's browser doesn't forget what they had pre-login.
  resetToGuest: (items?: CartItem[]) => void;

  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number,
  ) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  clear: () => void;
};

function clampQty(qty: number, inStock: number): number {
  if (!Number.isFinite(qty)) return 1;
  const max = Math.min(MAX_QTY_PER_ITEM, Math.max(inStock, 0));
  if (max <= 0) return 0;
  return Math.max(1, Math.min(Math.floor(qty), max));
}

// Thin wrappers around the API. Each returns the authoritative items[] the
// server responded with, or throws. Kept inside the store file so callers
// never have to know whether the cart is local or remote.
async function apiGetCart(): Promise<CartItem[]> {
  const res = await fetch("/api/cart", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`GET /api/cart ${res.status}`);
  const data = (await res.json()) as { items: CartItem[] };
  return data.items;
}

async function apiAddItem(
  variantId: string,
  quantity: number,
): Promise<CartItem[]> {
  const res = await fetch("/api/cart", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ variantId, quantity }),
  });
  if (!res.ok) throw new Error(`POST /api/cart ${res.status}`);
  const data = (await res.json()) as { items: CartItem[] };
  return data.items;
}

async function apiSetQuantity(
  variantId: string,
  quantity: number,
): Promise<CartItem[]> {
  const res = await fetch(
    `/api/cart/items/${encodeURIComponent(variantId)}`,
    {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    },
  );
  if (!res.ok) throw new Error(`PATCH /api/cart/items ${res.status}`);
  const data = (await res.json()) as { items: CartItem[] };
  return data.items;
}

async function apiRemoveItem(variantId: string): Promise<CartItem[]> {
  const res = await fetch(
    `/api/cart/items/${encodeURIComponent(variantId)}`,
    {
      method: "DELETE",
      cache: "no-store",
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error(`DELETE /api/cart/items ${res.status}`);
  const data = (await res.json()) as { items: CartItem[] };
  return data.items;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      mode: "guest",
      hasHydrated: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      setServerCart: (items) => set({ mode: "user", items }),
      resetToGuest: (items) =>
        set((s) => ({ mode: "guest", items: items ?? s.items })),

      addItem: async (item, quantity = 1) => {
        const { mode, items } = get();

        // Optimistic: update the UI immediately, drawer pops open.
        const existing = items.find((i) => i.variantId === item.variantId);
        const desired = existing
          ? existing.quantity + quantity
          : quantity;
        const optimisticQty = clampQty(desired, item.inStock);
        if (optimisticQty <= 0) return;

        const optimisticItems = existing
          ? items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: optimisticQty }
                : i,
            )
          : [...items, { ...item, quantity: optimisticQty }];
        set({ items: optimisticItems, isOpen: true });

        if (mode === "guest") return;

        try {
          const authoritative = await apiAddItem(item.variantId, quantity);
          // Re-check mode — the user may have signed out mid-flight, in
          // which case <CartBootstrap> already applied resetToGuest([]) and
          // we must not resurrect the previous user's items.
          if (get().mode !== "user") return;
          set({ items: authoritative });
        } catch {
          if (get().mode !== "user") return;
          // Revert to pre-optimistic state. The server is the source of
          // truth when signed in.
          set({ items });
        }
      },

      removeItem: async (variantId) => {
        const { mode, items } = get();
        const optimistic = items.filter((i) => i.variantId !== variantId);
        set({ items: optimistic });

        if (mode === "guest") return;

        try {
          const authoritative = await apiRemoveItem(variantId);
          if (get().mode !== "user") return;
          set({ items: authoritative });
        } catch {
          if (get().mode !== "user") return;
          set({ items });
        }
      },

      setQuantity: async (variantId, quantity) => {
        const { mode, items } = get();
        const optimistic = items.flatMap((i) => {
          if (i.variantId !== variantId) return [i];
          const next = clampQty(quantity, i.inStock);
          if (next <= 0) return []; // 0 means remove
          return [{ ...i, quantity: next }];
        });
        set({ items: optimistic });

        if (mode === "guest") return;

        try {
          const authoritative = await apiSetQuantity(variantId, quantity);
          if (get().mode !== "user") return;
          set({ items: authoritative });
        } catch {
          if (get().mode !== "user") return;
          set({ items });
        }
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: "ecom-cart",
      storage: createJSONStorage(() => localStorage),
      // Persist only the items list, and only while in guest mode. The
      // persist middleware fires on *every* state change; if we returned
      // items unconditionally, any UI interaction (openCart, qty bump,
      // etc.) while signed in would re-write the previous user's cart to
      // localStorage, defeating the cross-user leakage protection in
      // hydrateServerCart / mergeAndHydrateServerCart. Gating on mode
      // means user-mode writes always serialize `items: []` so the next
      // guest session starts empty.
      partialize: (s) => ({ items: s.mode === "guest" ? s.items : [] }),
      skipHydration: false,
      // Zustand fires the rehydration finisher synchronously during
      // `create(persist(...))`, which means `useCartStore` is still in its
      // temporal dead zone when the finisher runs on initial load — calling
      // `useCartStore.setState(...)` here throws a ReferenceError that
      // zustand silently swallows, leaving `hasHydrated` stuck at `false`.
      // Defer the write to a microtask so the store binding is assigned
      // before we touch it. Without this, <CartBootstrap/> never progresses
      // past its `if (!hasHydrated) return` guard, so signed-in users'
      // carts never sync to the server.
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useCartStore.setState({ hasHydrated: true });
        });
      },
    },
  ),
);

// Caller-supplied check so CartBootstrap can invalidate a hydrate/merge that
// was kicked off for user A but resolves after the user has already signed
// out or switched to user B. Without this, a slow network response can
// overwrite the guest-reset state applied on logout.
export type CartSyncOptions = { isActive?: () => boolean };

function isStillActive(opts?: CartSyncOptions): boolean {
  return opts?.isActive ? opts.isActive() : true;
}

// Fetches the server cart and flips the store into "user" mode. Called from
// <CartBootstrap/> once the session becomes authenticated.
export async function hydrateServerCart(
  opts?: CartSyncOptions,
): Promise<void> {
  try {
    const items = await apiGetCart();
    // The session may have changed while we were awaiting the network —
    // bail out instead of clobbering the new authoritative state.
    if (!isStillActive(opts)) return;
    useCartStore.getState().setServerCart(items);
    // Remove localStorage copy so a logout→different login on the same
    // browser doesn't resurrect the previous user's items. Only runs on
    // the success path so a transient network failure doesn't destroy
    // the guest cart.
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ecom-cart");
    }
  } catch {
    // Leave the store alone; the drawer will show whatever was there
    // (likely the localStorage copy from before sign-in).
  }
}

// POSTs the guest cart up and flips to "user" mode with the merged result.
// Called on the sign-in transition (guest → user).
export async function mergeAndHydrateServerCart(
  opts?: CartSyncOptions,
): Promise<void> {
  const guestItems = useCartStore.getState().items.map((i) => ({
    variantId: i.variantId,
    quantity: i.quantity,
  }));

  if (guestItems.length === 0) {
    await hydrateServerCart(opts);
    return;
  }

  try {
    const res = await fetch("/api/cart/merge", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: guestItems }),
    });
    if (!res.ok) throw new Error(`POST /api/cart/merge ${res.status}`);
    const data = (await res.json()) as { items: CartItem[] };

    if (!isStillActive(opts)) return;

    useCartStore.getState().setServerCart(data.items);
    // Only clear localStorage on the *success* path — a transient failure
    // should leave the guest cart intact so the next attempt can retry.
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ecom-cart");
    }
  } catch {
    // Merge failed. Fall back to a plain GET so the user at least sees
    // their server cart; hydrateServerCart owns the localStorage clear on
    // its own success path.
    await hydrateServerCart(opts);
  }
}

// Derived selectors. Kept as plain functions so callers can opt into
// fine-grained subscriptions via `useCartStore(selectCartCount)`.
export const selectCartItems = (s: CartState) => s.items;
export const selectCartCount = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
