"use client";

import { selectCartCount, useCartStore } from "@/lib/cart/store";

export function CartButton() {
  const count = useCartStore(selectCartCount);
  const hydrated = useCartStore((s) => s.hasHydrated);
  const open = useCartStore((s) => s.openCart);

  // Avoid SSR/client mismatch: render 0 badge on server + first paint, then
  // swap to the real count after hydration.
  const displayCount = hydrated ? count : 0;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Open cart (${displayCount} item${displayCount === 1 ? "" : "s"})`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
    >
      <BagIcon />
      {displayCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold leading-[18px] text-white dark:bg-white dark:text-neutral-900">
          {displayCount > 99 ? "99+" : displayCount}
        </span>
      )}
    </button>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M6 7h12l-1 13H7L6 7z" />
      <path d="M9 7a3 3 0 016 0" />
    </svg>
  );
}
