"use client";

import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export function CategoryFilter({
  selected,
  onChange,
  availableCategories,
}: {
  selected: Category | "all";
  onChange: (category: Category | "all") => void;
  availableCategories: ReadonlySet<Category>;
}) {
  const options: Array<Category | "all"> = [
    "all",
    ...CATEGORIES.filter((c) => availableCategories.has(c)),
  ];
  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="flex flex-wrap gap-1.5"
    >
      {options.map((option) => {
        const active = selected === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {option === "all" ? "All" : CATEGORY_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
