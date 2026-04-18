"use client";

import { useMemo, useState } from "react";

import { ProductGallery } from "@/components/ProductGallery";
import type { ProductDetail as ProductDetailType } from "@/lib/products.types";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = { product: ProductDetailType };

export function ProductDetail({ product }: Props) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    product.colors[0]?.id ?? null,
  );
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);

  // Sizes available for the currently-selected color (in stock > 0). Sizes
  // that exist but aren't stocked for this color are still shown, just
  // disabled, so the user can see the full size range.
  const sizeAvailability = useMemo(() => {
    const map = new Map<string, { available: boolean; variantId: string | null }>();
    for (const size of product.sizes) {
      const variant = product.variants.find(
        (v) =>
          v.size.id === size.id &&
          (selectedColorId ? v.color.id === selectedColorId : true),
      );
      map.set(size.id, {
        available: !!variant && variant.inStock > 0,
        variantId: variant?.id ?? null,
      });
    }
    return map;
  }, [product.variants, product.sizes, selectedColorId]);

  // The variant currently "selected" by the user (color + size combo). Used
  // to drive the displayed price and the Add-to-bag CTA.
  const selectedVariant = useMemo(() => {
    if (!selectedColorId || !selectedSizeId) return null;
    return (
      product.variants.find(
        (v) =>
          v.color.id === selectedColorId && v.size.id === selectedSizeId,
      ) ?? null
    );
  }, [product.variants, selectedColorId, selectedSizeId]);

  // Price to display: variant price once both pickers are set, otherwise the
  // product-level aggregate (lowest across variants).
  const displayPrice = selectedVariant
    ? selectedVariant.salePrice ?? selectedVariant.price
    : product.salePrice ?? product.price;
  const fullPrice = selectedVariant
    ? selectedVariant.price
    : product.price;
  const isOnSale = selectedVariant
    ? selectedVariant.salePrice !== null &&
      selectedVariant.salePrice < selectedVariant.price
    : product.isOnSale;

  const activeColorSlug =
    product.colors.find((c) => c.id === selectedColorId)?.slug ?? null;

  const canAddToBag =
    selectedVariant !== null && selectedVariant.inStock > 0;

  return (
    <section
      aria-label={`${product.name} details`}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-12"
    >
      {/* Gallery */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          productName={product.name}
          images={product.images}
          activeColorSlug={activeColorSlug}
        />
      </div>

      {/* Right column — specs + pickers */}
      <div className="flex flex-col gap-6">
        <header className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            {[product.gender.label, product.category.name]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-100">
            {product.name}
          </h1>
          <div className="flex items-baseline gap-3 pt-1">
            <span
              className={
                isOnSale
                  ? "text-xl font-medium text-red-600"
                  : "text-xl font-medium text-neutral-900 dark:text-neutral-100"
              }
            >
              {formatPrice(displayPrice)}
            </span>
            {isOnSale && (
              <span className="text-sm text-neutral-400 line-through">
                {formatPrice(fullPrice)}
              </span>
            )}
          </div>
        </header>

        {product.description && (
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {product.description}
          </p>
        )}

        {/* Color picker */}
        {product.colors.length > 0 && (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Colour
              </h2>
              <span className="text-xs text-neutral-500">
                {product.colors.find((c) => c.id === selectedColorId)?.name ??
                  ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((c) => {
                const active = c.id === selectedColorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Select colour ${c.name}`}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedColorId(c.id);
                      // If the previously selected size isn't available for the
                      // new color, clear it so the size picker doesn't show a
                      // disabled button as active.
                      if (selectedSizeId) {
                        const stillAvailable = product.variants.some(
                          (v) =>
                            v.color.id === c.id &&
                            v.size.id === selectedSizeId &&
                            v.inStock > 0,
                        );
                        if (!stillAvailable) setSelectedSizeId(null);
                      }
                    }}
                    className={`relative h-10 w-10 overflow-hidden rounded-full border transition ${
                      active
                        ? "border-neutral-900 ring-1 ring-neutral-900 ring-offset-2 dark:border-white dark:ring-white"
                        : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700"
                    }`}
                    style={{ backgroundColor: c.hexCode }}
                  >
                    <span className="sr-only">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size picker */}
        {product.sizes.length > 0 && (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Size
              </h2>
              <button
                type="button"
                className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Size guide
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {product.sizes.map((s) => {
                const avail = sizeAvailability.get(s.id);
                const available = avail?.available ?? false;
                const active = s.id === selectedSizeId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!available}
                    aria-pressed={active}
                    onClick={() => setSelectedSizeId(s.id)}
                    className={`relative flex h-11 items-center justify-center rounded-md border text-sm transition ${
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                        : available
                          ? "border-neutral-300 text-neutral-900 hover:border-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-white"
                          : "cursor-not-allowed border-neutral-200 text-neutral-400 line-through dark:border-neutral-800 dark:text-neutral-600"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex flex-col gap-3">
          <button
            type="button"
            disabled={!canAddToBag}
            className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-900 px-6 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {selectedVariant
              ? canAddToBag
                ? "Add to bag"
                : "Out of stock"
              : "Select a size"}
          </button>
          <button
            type="button"
            onClick={() => setWishlisted((v) => !v)}
            aria-pressed={wishlisted}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-neutral-300 px-6 text-sm font-medium text-neutral-900 transition hover:border-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-white"
          >
            <HeartIcon filled={wishlisted} />
            {wishlisted ? "In wishlist" : "Wishlist"}
          </button>
        </div>

        {selectedVariant && (
          <p className="text-xs text-neutral-500">
            SKU: {selectedVariant.sku} ·{" "}
            {selectedVariant.inStock > 0
              ? `${selectedVariant.inStock} in stock`
              : "Out of stock"}
          </p>
        )}
      </div>
    </section>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}
