import { notFound } from "next/navigation";

import { auth } from "@/auth";

/**
 * Gate a server component / route handler to admin users only.
 *
 * Non-admins (including guests) hit `notFound()` instead of a redirect. We
 * intentionally don't differentiate "not signed in" from "not an admin" so the
 * existence of admin-only routes isn't leaked to unauthenticated crawlers.
 */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    notFound();
  }
  return session;
}
