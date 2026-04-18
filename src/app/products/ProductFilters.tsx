"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { ProductFilterOptions } from "@/lib/products.types";

type FilterKey = "gender" | "category" | "color" | "size";

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function toggle(list: string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
}

export function ProductFilters({ options }: { options: ProductFilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selected: Record<FilterKey, string[]> = {
    gender: parseList(searchParams.get("gender")),
    category: parseList(searchParams.get("category")),
    color: parseList(searchParams.get("color")),
    size: parseList(searchParams.get("size")),
  };

  const totalSelected =
    selected.gender.length +
    selected.category.length +
    selected.color.length +
    selected.size.length;

  function updateParam(key: FilterKey, slug: string) {
    const next = new URLSearchParams(searchParams.toString());
    const nextList = toggle(selected[key], slug);
    if (nextList.length === 0) {
      next.delete(key);
    } else {
      next.set(key, nextList.join(","));
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("gender");
    next.delete("category");
    next.delete("color");
    next.delete("size");
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // Split categories into top-level and children.
  const topLevel = options.categories.filter((c) => c.parentSlug === null);
  const children = options.categories.filter((c) => c.parentSlug !== null);

  return (
    <aside
      aria-label="Filters"
      data-pending={isPending ? "true" : undefined}
      className="space-y-8 text-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Filters</h2>
        {totalSelected > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterSection title="Gender">
        {options.genders.map((g) => (
          <CheckboxRow
            key={g.slug}
            checked={selected.gender.includes(g.slug)}
            onChange={() => updateParam("gender", g.slug)}
            label={g.label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Category">
        <div className="space-y-3">
          {topLevel.map((top) => {
            const kids = children.filter((c) => c.parentSlug === top.slug);
            return (
              <div key={top.slug}>
                <CheckboxRow
                  checked={selected.category.includes(top.slug)}
                  onChange={() => updateParam("category", top.slug)}
                  label={top.name}
                  strong
                />
                {kids.length > 0 && (
                  <div className="ml-5 mt-1 space-y-1">
                    {kids.map((k) => (
                      <CheckboxRow
                        key={k.slug}
                        checked={selected.category.includes(k.slug)}
                        onChange={() => updateParam("category", k.slug)}
                        label={k.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Color">
        <div className="grid grid-cols-2 gap-y-2">
          {options.colors.map((c) => {
            const isChecked = selected.color.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => updateParam("color", c.slug)}
                aria-pressed={isChecked}
                className="flex items-center gap-2 text-left"
              >
                <span
                  className={
                    "inline-block h-5 w-5 rounded-full border " +
                    (isChecked
                      ? "border-black ring-2 ring-offset-1 ring-black dark:border-white dark:ring-white"
                      : "border-black/15 dark:border-white/20")
                  }
                  style={{ backgroundColor: c.hexCode }}
                />
                <span
                  className={
                    "text-sm " +
                    (isChecked
                      ? "text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 dark:text-neutral-400")
                  }
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Size">
        <div className="grid grid-cols-3 gap-2">
          {options.sizes.map((s) => {
            const isChecked = selected.size.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => updateParam("size", s.slug)}
                aria-pressed={isChecked}
                className={
                  "rounded-md border px-3 py-2 text-center text-sm transition " +
                  (isChecked
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/15 text-neutral-700 hover:border-black dark:border-white/20 dark:text-neutral-300 dark:hover:border-white")
                }
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </FilterSection>
    </aside>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  strong = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  strong?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-black/20 accent-black dark:accent-white"
      />
      <span
        className={
          strong
            ? "font-medium text-neutral-900 dark:text-neutral-100"
            : "text-neutral-700 dark:text-neutral-300"
        }
      >
        {label}
      </span>
    </label>
  );
}
