"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import {
  selectCartItems,
  selectCartSubtotal,
  useCartStore,
} from "@/lib/cart/store";
import { MAX_QTY_PER_ITEM } from "@/lib/cart/types";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.closeCart);
  const items = useCartStore(selectCartItems);
  const subtotal = useCartStore(selectCartSubtotal);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll + listen for Escape while drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the panel so screen readers announce it.
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        tabIndex={isOpen ? 0 : -1}
        className={`absolute inset-0 bg-neutral-950/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        tabIndex={-1}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl outline-none transition-transform duration-300 dark:bg-neutral-950 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Shopping bag
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="rounded-full p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M4.28 4.28a.75.75 0 011.06 0L10 8.94l4.66-4.66a.75.75 0 111.06 1.06L11.06 10l4.66 4.66a.75.75 0 11-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 01-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-neutral-500">Your bag is empty.</p>
            <Link
              href="/products"
              onClick={close}
              className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-900 px-5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-neutral-200 overflow-y-auto dark:divide-neutral-800">
            {items.map((item) => (
              <li
                key={item.variantId}
                className="flex gap-4 px-5 py-4"
              >
                <Link
                  href={`/products/${item.productSlug}`}
                  onClick={close}
                  className="relative block aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${item.productSlug}`}
                        onClick={close}
                        className="truncate text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-neutral-500">
                        {item.color.name} · Size {item.size.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.productName}`}
                      onClick={() => removeItem(item.variantId)}
                      className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.28 4.28a.75.75 0 011.06 0L10 8.94l4.66-4.66a.75.75 0 111.06 1.06L11.06 10l4.66 4.66a.75.75 0 11-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 01-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 010-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          setQuantity(item.variantId, item.quantity - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center text-neutral-700 transition hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-200 dark:hover:text-white"
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQuantity(item.variantId, item.quantity + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center text-neutral-700 transition hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-200 dark:hover:text-white"
                        disabled={
                          item.quantity >=
                          Math.min(item.inStock, MAX_QTY_PER_ITEM)
                        }
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <footer className="space-y-3 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-neutral-500">Subtotal</span>
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {formatPrice(subtotal)}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Shipping and taxes calculated at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={close}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/products"
              onClick={close}
              className="block text-center text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Continue shopping
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
