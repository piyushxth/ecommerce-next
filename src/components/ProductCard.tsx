import Image from "next/image";
import Link from "next/link";

import type { ProductListItem } from "@/lib/products.types";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const displayPrice = product.salePrice ?? product.price;
  const showStrike = product.isOnSale && product.salePrice !== null;
  const colorCount = product.colors.length;
  const href = `/products/${product.slug}`;

  return (
    <Link
      href={href}
      className="group block focus:outline-none"
      prefetch={false}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
            No image
          </div>
        )}

        {product.isOnSale && (
          <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
            Sale
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">
          {[product.gender.label, product.category.name]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <h3 className="text-[15px] font-medium leading-snug text-neutral-900 group-hover:underline underline-offset-4 decoration-1 dark:text-neutral-100">
          {product.name}
        </h3>

        {colorCount > 0 && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-xs text-neutral-500">
              {colorCount} {colorCount === 1 ? "color" : "colors"}
            </span>
            <div className="flex items-center gap-1">
              {product.colors.slice(0, 4).map((c) => (
                <span
                  key={c.slug}
                  title={c.name}
                  className="inline-block h-3 w-3 rounded-full border border-black/10 dark:border-white/15"
                  style={{ backgroundColor: c.hexCode }}
                />
              ))}
              {colorCount > 4 && (
                <span className="text-[11px] text-neutral-500">
                  +{colorCount - 4}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-baseline gap-2 pt-1 text-sm">
          {showStrike && (
            <span className="text-neutral-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
          <span
            className={
              product.isOnSale
                ? "font-medium text-red-600"
                : "font-medium text-neutral-900 dark:text-neutral-100"
            }
          >
            {formatPrice(displayPrice)}
          </span>
        </div>
      </div>
    </Link>
  );
}
