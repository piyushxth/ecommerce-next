import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getOrderSummary } from "@/lib/checkout/server";

export const dynamic = "force-dynamic";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

type Params = Promise<{ orderId: string }>;

export default async function OrderSuccessPage({
  params,
}: {
  params: Params;
}) {
  const { orderId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/success/${orderId}`);
  }

  const order = await getOrderSummary(session.user.id, orderId);
  if (!order) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          Order placed
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
          Thanks — we&apos;ve got your order.
        </h1>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          Order <span className="font-mono">{order.orderId}</span> is{" "}
          <span className="font-medium">{order.status}</span>. Payment will be
          collected in a follow-up step once the checkout integration ships.
        </p>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Items
        </h2>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex gap-4 p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col text-sm">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                >
                  {item.productName}
                </Link>
                <span className="text-xs text-neutral-500">
                  {item.colorName} · {item.sizeName} · Qty {item.quantity}
                </span>
                <span className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {formatPrice(item.priceAtPurchase * item.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Ship to
          </h3>
          <p className="text-neutral-900 dark:text-neutral-100">
            {order.shipping.fullName}
          </p>
          <p className="text-neutral-600 dark:text-neutral-400">
            {order.shipping.line1}
            {order.shipping.line2 ? `, ${order.shipping.line2}` : ""}
          </p>
          <p className="text-neutral-600 dark:text-neutral-400">
            {order.shipping.city}, {order.shipping.state}{" "}
            {order.shipping.postalCode}
          </p>
          <p className="text-neutral-600 dark:text-neutral-400">
            {order.shipping.country}
          </p>
          {order.shipping.phone ? (
            <p className="mt-1 text-neutral-500">{order.shipping.phone}</p>
          ) : null}
        </div>

        <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Total
          </h3>
          <div className="flex items-baseline justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">
              Order total
            </span>
            <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Shipping and taxes are not included; they will be added when the
            payment step is wired in.
          </p>
        </div>
      </section>

      <div className="mt-10 flex justify-center">
        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-900 px-5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
