"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Without this, a throw anywhere in the grid, charts
 * or detail panel unmounts the whole tree and leaves a blank page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center bg-background text-foreground">
      <div className="flex items-center justify-center w-12 h-12 rounded-md bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Something broke</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The view failed to render. Your SMILES input is still saved — retrying usually
          recovers it.
        </p>
      </div>
      <pre className="max-w-md overflow-x-auto rounded border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs font-mono text-muted-foreground">
        {error.message}
      </pre>
      <div className="flex items-center gap-2">
        <Button onClick={reset} size="sm" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Try again
        </Button>
        <Button onClick={() => window.location.reload()} size="sm" variant="outline">
          Reload page
        </Button>
      </div>
    </div>
  );
}
