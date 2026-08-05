import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function AppError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div role="alert" className="py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-fg">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-fg-muted">{error.message}</p>
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
