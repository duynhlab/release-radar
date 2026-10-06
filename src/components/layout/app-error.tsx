import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function AppError({ error }: ErrorComponentProps) {
  const router = useRouter();
  // The router passes the raw thrown value (typed `unknown`), falsy included.
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred.";
  return (
    <div role="alert" className="py-24 text-center">
      <h1 className="text-page-title font-semibold tracking-tight text-fg">
        Something went wrong
      </h1>
      <p className="mt-2 text-body text-fg-muted">{message}</p>
      <Button
        variant="solid"
        size="md"
        className="mt-6"
        onClick={() => void router.invalidate()}
      >
        Try again
      </Button>
    </div>
  );
}
