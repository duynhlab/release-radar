import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Styled native <select>.
 *
 * Deliberately not Radix Select: the native control gets the OS picker on
 * mobile, needs no portal or focus trap, works in the SSR HTML with scripts
 * blocked (an explicit audit scenario), costs nothing in bundle, and a
 * 57-option Radix listbox is a scroll-jail.
 */
export function NativeSelect({
  label,
  id,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"select"> & { label: string; id: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          "h-9 rounded-control border border-border bg-surface px-2.5 text-control text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </span>
  );
}
