type Props = {
  title: string;
  description: string;
  planned: string[];
};

export function ComingSoon({ title, description, planned }: Props) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-white dark:text-neutral-900">
            Coming soon
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Shipping in a follow-up PR.
          </span>
        </div>
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
          Planned capabilities:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
          {planned.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
