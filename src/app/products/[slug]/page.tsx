import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/ProductDetail";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import { getProductBySlug } from "@/lib/products";

// Prices, stock and descriptions should reflect the DB on every request; no
// caching layer for the detail page yet.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found · Ecommerce" };
  return {
    title: `${product.name} · Ecommerce`,
    description: product.description || `Shop ${product.name}.`,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/products" className="hover:underline">
              Shop all
            </Link>
          </li>
          <li aria-hidden>·</li>
          <li>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:underline"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden>·</li>
          <li className="text-neutral-700 dark:text-neutral-300">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductDetail product={product} />

      <ProductRecommendations
        productId={product.id}
        categoryId={product.category.id}
        genderId={product.gender.id}
      />
    </main>
  );
}
