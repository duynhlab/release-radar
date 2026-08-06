import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyVersionButton({ version }: { version: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    // Capability check happens here, never during render — navigator does not
    // exist on the server.
    try {
      await navigator.clipboard.writeText(version);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked or unavailable; leave the UI unchanged.
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="md"
        aria-label={`Copy version ${version}`}
        onClick={() => void copy()}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        Copy version
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Version copied" : ""}
      </span>
    </>
  );
}
