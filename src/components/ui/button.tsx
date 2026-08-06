import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-control text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "bg-accent text-accent-fg hover:bg-accent-hover",
        soft: "bg-accent-soft text-accent hover:brightness-110",
        outline:
          "border border-border bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg",
        ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg",
      },
      size: {
        sm: "h-8 px-2.5",
        md: "h-10 px-4",
        // Every icon-only control is 40x40. Fixing it here is what makes the
        // touch-target requirement hold without auditing each call site — the
        // legacy card icons were p-1, about 24px.
        icon: "size-10 shrink-0",
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
