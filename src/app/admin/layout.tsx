import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { signOut } from "@/auth";

import { AdminSidebar } from "./AdminSidebar";

export const metadata = {
  title: "Admin · Ecommerce",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="flex flex-1 bg-neutral-50 dark:bg-neutral-950">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Admin console
            </Link>
            <span className="hidden rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white sm:inline dark:bg-white dark:text-neutral-900">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="hidden sm:inline">
              {session.user?.name ?? session.user?.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
