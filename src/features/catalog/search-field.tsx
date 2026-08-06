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
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tools…"
        aria-label="Search tools by name"
        className="h-9 w-full rounded-control border border-border bg-surface pl-8 pr-12 text-control text-fg placeholder:text-fg-subtle"
      />
      <kbd
        aria-hidden="true"
        className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-badge border border-border px-1.5 font-mono text-micro leading-5 text-fg-subtle sm:inline-block"
      >
        /
      </kbd>
    </div>
  );
}
