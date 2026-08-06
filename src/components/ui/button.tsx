import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-control text-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "bg-accent text-accent-fg hover:bg-accent-hover",
        soft: "bg-accent-soft text-accent hover:brightness-110",
        outline:
          "border border-border bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg",
        ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg",
      },
      // Horizontal padding is px-2.5 at every tier so these line up with
      // NativeSelect, which is the same height and used beside them in the
      // toolbar. They previously disagreed (px-4 vs px-2.5).
      size: {
        sm: "h-7 px-2.5",
        md: "h-8 px-2.5",
        lg: "h-9 px-3",
        // 32px visual. `hit-40` grows the pointer target to 40px via a
        // pseudo-element, so compact sizing and the touch-target minimum can
        // both hold — previously this was a literal 40x40 box.
        icon: "size-8 shrink-0 hit-40",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export type ButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}

export { buttonVariants };
