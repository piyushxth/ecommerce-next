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
