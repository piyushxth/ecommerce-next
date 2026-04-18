// Client-safe types, constants, and parsers for the products module.
// Kept separate from products.ts (which imports mongoose) so client components
// can share these without pulling Node-only modules into the browser bundle.

export type SortKey = "newest" | "price-desc" | "price-asc" | "name-asc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "name-asc", label: "Name: A to Z" },
];

export const DEFAULT_SORT: SortKey = "newest";

// A trimmed variant payload shipped with each list card so the ProductCard
// quick-add button can drop the first in-stock variant into the cart without
// navigating to the detail page (same pattern as nike.com / zara.com).
export type QuickAddVariant = {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  inStock: number;
  color: { name: string; hexCode: string };
  size: { name: string };
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  gender: { label: string; slug: string };
  category: { name: string; slug: string };
  price: number;
  salePrice: number | null;
  isOnSale: boolean;
  primaryImageUrl: string | null;
  colors: { name: string; slug: string; hexCode: string }[];
  quickAddVariant: QuickAddVariant | null;
};

export type ProductFilterOptions = {
  genders: { label: string; slug: string }[];
  categories: { name: string; slug: string; parentSlug: string | null }[];
  colors: { name: string; slug: string; hexCode: string }[];
  sizes: { name: string; slug: string; sortOrder: number }[];
};

export type ProductQuery = {
  genders?: string[];
  categories?: string[];
  colors?: string[];
  sizes?: string[];
  sort?: SortKey;
};

// Detailed per-product data used by the product detail page. The server
// pre-computes this in one aggregation so the client carousel + pickers can
// filter/change state without extra network round-trips.
export type ProductDetailImage = {
  id: string;
  url: string;
  // The variant this image belongs to (nullable for "general" product shots).
  variantId: string | null;
  // Flattened color slug of the image's variant, for easy client-side filtering.
  colorSlug: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductDetailVariant = {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  inStock: number;
  color: { id: string; name: string; slug: string; hexCode: string };
  size: { id: string; name: string; slug: string; sortOrder: number };
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  gender: { id: string; label: string; slug: string };
  category: { id: string; name: string; slug: string };
  price: number; // lowest full price across variants
  salePrice: number | null; // lowest sale price (if any variant is on sale)
  isOnSale: boolean;
  variants: ProductDetailVariant[];
  images: ProductDetailImage[];
  // Flattened distinct color list derived from variants, preserving insertion order.
  colors: { id: string; name: string; slug: string; hexCode: string }[];
  // Flattened distinct size list sorted by sortOrder.
  sizes: { id: string; name: string; slug: string; sortOrder: number }[];
};

// Parse a comma-separated query-string value into a deduped slug list.
export function parseSlugList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  const seen = new Set<string>();
  for (const slug of raw.split(",")) {
    const s = slug.trim().toLowerCase();
    if (s) seen.add(s);
  }
  return [...seen];
}

export function parseSort(value: string | string[] | undefined): SortKey {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "price-desc" || v === "price-asc" || v === "name-asc" || v === "newest") {
    return v;
  }
  return DEFAULT_SORT;
}
