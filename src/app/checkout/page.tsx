import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getCartForUser } from "@/lib/cart/server";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/checkout");
  }

  const { items } = await getCartForUser(session.user.id);

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Your bag is empty
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Add something before you check out.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-neutral-900 px-5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Shop products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Payment step is coming soon. For now, placing this order creates a
        pending record that a payment provider will settle later.
      </p>

      <CheckoutForm
        defaultEmail={session.user.email ?? ""}
        defaultFullName={session.user.name ?? ""}
        items={items}
      />
    </main>
  );
}
