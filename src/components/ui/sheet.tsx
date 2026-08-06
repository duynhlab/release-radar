import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

/**
 * Mobile filter panel. The one place Radix clearly earns its weight: focus
 * trap, Escape to close, focus return to trigger, aria-modal, scroll lock and
 * background inert are all explicit acceptance criteria, and all come free.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-card border-t border-border bg-bg p-4 shadow-overlay">
          <Dialog.Title className="text-body font-semibold text-fg">
            {title}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {description ?? title}
          </Dialog.Description>
          <div className="mt-4 space-y-4">{children}</div>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
