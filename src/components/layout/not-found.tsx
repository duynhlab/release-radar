import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFound({
  kind = "page",
}: {
  kind?: "page" | "tool" | "category";
}) {
  const body =
    kind === "tool"
      ? "No tool with that name is tracked here."
      : kind === "category"
        ? "That category does not exist."
        : "The tool or page you are looking for is not tracked here.";

  return (
    <div className="py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-fg">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-fg-muted">{body}</p>
      <Button variant="solid" size="md" asChild className="mt-6">
        <Link to="/">Back to all tools</Link>
      </Button>
    </div>
  );
}
