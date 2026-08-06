import { Search } from "lucide-react";
import { useRef } from "react";
import { useHotkeyFocus } from "@/lib/use-hotkey-focus";

export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useHotkeyFocus(ref, () => onChange(""));

  return (
    <div className="relative flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tools…"
        aria-label="Search tools by name"
        className="h-10 w-full rounded-control border border-border bg-surface pl-9 pr-16 text-sm text-fg placeholder:text-fg-subtle"
      />
      <kbd
        aria-hidden="true"
        className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle sm:inline-block"
      >
        /
      </kbd>
    </div>
  );
}
