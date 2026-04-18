"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

import {
  hydrateServerCart,
  mergeAndHydrateServerCart,
  useCartStore,
} from "@/lib/cart/store";

// Reconciles the client cart store with the user's authentication state.
//
// Transitions we care about:
//   unauthenticated → authenticated : push any localStorage items to the
//       server via /api/cart/merge, then replace the store with the server
//       cart. Handles the "guest adds items, then logs in" flow.
//   (initial load) authenticated    : just GET /api/cart and replace the
//       store. Handles returning visits where the browser already has a
//       session cookie.
//   authenticated → unauthenticated : flip back to guest mode so further
//       mutations write to localStorage instead of 401-ing the API.
//
// Mounted once in the root layout so every route inherits the correct mode.
export function CartBootstrap() {
  const { status, data } = useSession();
  const setServerCart = useCartStore((s) => s.setServerCart);
  const resetToGuest = useCartStore((s) => s.resetToGuest);
  const hasHydrated = useCartStore((s) => s.hasHydrated);

  // Keep track of the previous auth status so we can tell a sign-in
  // transition (merge + hydrate) from an already-authed initial load
  // (hydrate only).
  const lastStatusRef = useRef<typeof status | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  // Guard against React 18 strict-mode double effects firing the merge
  // endpoint twice.
  const inFlightRef = useRef(false);

  useEffect(() => {
    // Wait for both the session to settle and the localStorage rehydration
    // to complete — otherwise we'd merge an empty guest cart.
    if (status === "loading" || !hasHydrated) return;

    const prevStatus = lastStatusRef.current;
    const prevUserId = lastUserIdRef.current;
    const nextUserId = data?.user?.id ?? null;

    if (status === "authenticated" && nextUserId) {
      // Different user signed in on the same tab? Drop whatever we were
      // showing and treat this as a fresh login.
      const userChanged = prevUserId !== null && prevUserId !== nextUserId;
      const isFirstSignIn =
        prevStatus === "unauthenticated" || prevStatus === null;

      if (!inFlightRef.current) {
        inFlightRef.current = true;
        const run = userChanged || prevStatus === null
          ? hydrateServerCart
          : isFirstSignIn
            ? mergeAndHydrateServerCart
            : hydrateServerCart;
        void run().finally(() => {
          inFlightRef.current = false;
        });
      }
    } else if (status === "unauthenticated" && prevStatus === "authenticated") {
      // Signed out: switch back to guest mode with an empty bag, so the
      // previous user's items don't leak to whoever is at this browser
      // next.
      resetToGuest([]);
    }

    lastStatusRef.current = status;
    lastUserIdRef.current = nextUserId;
  }, [status, data?.user?.id, hasHydrated, setServerCart, resetToGuest]);

  return null;
}
