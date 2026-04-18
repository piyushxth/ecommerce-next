import type { Metadata } from "next";

import { ProductCard } from "@/components/ProductCard";
import {
  getProductFilterOptions,
  listProducts,
  parseSlugList,
  parseSort,
} from "@/lib/products";

import { ProductFilters } from "./ProductFilters";
import { SortSelect } from "./SortSelect";

export const metadata: Metadata = {
  title: "Shop all · Ecommerce",
  description: "Browse the full product catalog.",
};

// Opt out of caching: filters + sort come from searchParams at request time
// and we want fresh stock/prices on every view.
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const query = {
    genders: parseSlugList(sp.gender),
    categories: parseSlugList(sp.category),
    colors: parseSlugList(sp.color),
    sizes: parseSlugList(sp.size),
    sort: parseSort(sp.sort),
  };

  const [options, products] = await Promise.all([
    getProductFilterOptions(),
    listProducts(query),
  ]);

  const totalFiltersApplied =
    query.genders.length +
    query.categories.length +
    query.colors.length +
    query.sizes.length;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Shop all
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {products.length} {products.length === 1 ? "product" : "products"}
            {totalFiltersApplied > 0
              ? ` · ${totalFiltersApplied} filter${totalFiltersApplied === 1 ? "" : "s"} applied`
              : ""}
          </p>
        </div>
        <SortSelect current={query.sort} />
      </header>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ProductFilters options={options} />

        <section aria-label="Products">
          {products.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-black/10 text-sm text-neutral-500 dark:border-white/15">
              No products match these filters.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
