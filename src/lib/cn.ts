import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The semantic font-size tiers declared in app.css.
 *
 * tailwind-merge has to be told about these. Out of the box it parses
 * `text-<x>` as a COLOUR, so `cn("text-micro", "text-fg-muted")` saw two
 * conflicting colour classes and silently dropped the size — badges, filter
 * chips and section labels all rendered at the inherited 14px while the class
 * strings in source looked correct. Nothing errors; the size just disappears.
 */
const FONT_SIZES = [
  "micro",
  "meta",
  "control",
  "body",
  "card-title",
  "version",
  "page-title",
  "detail-title",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
