"use client";

export function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" />
        <path strokeLinecap="round" d="M13.5 13.5L17 17" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tools…"
        aria-label="Search tools by name"
        className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900"
      />
    </div>
  );
}
