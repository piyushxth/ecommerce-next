import Link from "next/link";

import { auth } from "@/auth";
import { CartButton } from "@/components/cart/CartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";

// Gender link set. Hard-coded slugs match the seeded Gender.slug values and
// are also the same values ProductFilters writes to the URL, so a click here
// lands on the filtered grid without any extra code.
const GENDER_LINKS: { label: string; slug: string }[] = [
  { label: "Men", slug: "men" },
  { label: "Women", slug: "women" },
  { label: "Unisex", slug: "unisex" },
];

export async function Navbar() {
  const session = await auth();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8"
        >
          <Link
            href="/products"
            className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            ecom.
          </Link>

          <ul className="hidden items-center gap-5 sm:flex">
            <li>
              <Link
                href="/products"
                className="text-sm text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
              >
                Shop all
              </Link>
            </li>
            {GENDER_LINKS.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/products?gender=${g.slug}`}
                  className="text-sm text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            {session?.user ? (
              <>
                {session.user.role === "admin" ? (
                  <Link
                    href="/admin"
                    className="hidden rounded-full border border-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white sm:inline-block dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
                  >
                    Admin
                  </Link>
                ) : null}
                <Link
                  href="/dashboard"
                  className="hidden text-sm text-neutral-700 hover:text-neutral-900 sm:inline dark:text-neutral-300 dark:hover:text-white"
                >
                  {session.user.name ?? session.user.email ?? "Account"}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm text-neutral-700 hover:text-neutral-900 sm:inline dark:text-neutral-300 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden rounded-full border border-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white sm:inline-block dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900"
                >
                  Join
                </Link>
              </>
            )}
            <CartButton />
          </div>
        </nav>
      </header>
      {/* Rendered as a sibling to <header> so the drawer's z-50 overlay
          resolves at the root stacking context, not inside the header's
          sticky/z-40 context — otherwise future root-level positioned
          elements could occlude it. */}
      <CartDrawer />
    </>
  );
}
