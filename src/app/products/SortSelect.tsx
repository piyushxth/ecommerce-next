"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { DEFAULT_SORT, SORT_OPTIONS, type SortKey } from "@/lib/products.types";

export function SortSelect({ current }: { current: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString());
    const value = event.target.value as SortKey;
    if (value === DEFAULT_SORT) {
      next.delete("sort");
    } else {
      next.set("sort", value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-500">Sort by</span>
      <select
        value={current}
        onChange={onChange}
        className="appearance-none rounded-md border border-black/10 bg-transparent px-3 py-2 pr-8 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key} className="bg-white dark:bg-neutral-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
