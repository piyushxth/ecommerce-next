"use client";

import type { MouseEvent } from "react";

import { useCartStore } from "@/lib/cart/store";
import type { ProductListItem } from "@/lib/products.types";

type Props = { product: ProductListItem };

export function ProductCardQuickAdd({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const variant = product.quickAddVariant;
  const disabled = !variant || variant.inStock <= 0;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // The whole card is a Link. Stop nav + default so clicking the badge
    // doesn't route to the detail page.
    e.preventDefault();
    e.stopPropagation();
    if (!variant || variant.inStock <= 0) return;

    addItem({
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      imageUrl: product.primaryImageUrl,
      color: variant.color,
      size: variant.size,
      price: variant.salePrice ?? variant.price,
      fullPrice: variant.price,
      inStock: variant.inStock,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={
        disabled
          ? `${product.name} is out of stock`
          : `Add ${product.name} to bag`
      }
      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-900/90 dark:text-neutral-100 dark:ring-white/10 dark:hover:bg-neutral-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-4 w-4"
      >
        <path d="M6 7h12l-1 13H7L6 7z" />
        <path d="M9 7a3 3 0 016 0" />
        <path d="M10 12h4" />
        <path d="M12 10v4" />
      </svg>
    </button>
  );
}
