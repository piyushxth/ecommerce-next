"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: <IconGrid />,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: <IconBox />,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: <IconReceipt />,
  },
  {
    label: "Carts",
    href: "/admin/carts",
    icon: <IconCart />,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: <IconUsers />,
  },
  {
    label: "Coupons",
    href: "/admin/coupons",
    icon: <IconTag />,
  },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-neutral-200 bg-white lg:block dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
          E
        </span>
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          ecom. admin
        </span>
      </div>
      <nav className="p-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                  ].join(" ")}
                >
                  <span className="h-4 w-4" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 rounded-md border border-dashed border-neutral-300 p-3 text-[11px] leading-relaxed text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          CRUD endpoints land in follow-up PRs. This shell gates the panel and
          renders the overview.
        </div>
      </nav>
    </aside>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" />
      <polyline points="3.3 7 12 12 20.7 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v18l-3-2-3 2-2-2-2 2-3-2-3 2V4Z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5" />
      <circle cx="18" cy="21" r="1.5" />
      <path d="M3 3h2l2.4 12.4A2 2 0 0 0 9.4 17H18a2 2 0 0 0 2-1.6L22 7H6" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 13.41 20.6a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  );
}
