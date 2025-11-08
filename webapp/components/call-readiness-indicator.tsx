"use client";

import { Button } from "@/components/ui/button";
import { useCallReadiness } from "@/app/context/call-readiness-context";
import { CheckCircle, AlertTriangle } from "lucide-react";

export function CallReadinessIndicator() {
  const { isReady, checks, openDialog } = useCallReadiness();
  const pending = checks.filter((item) => !item.done);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openDialog}
      className="flex items-center gap-2"
    >
      {isReady ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      )}
      <div className="flex flex-col leading-none text-left">
        <span className="text-[10px] uppercase text-muted-foreground tracking-wide">
          Calls
        </span>
        <span className="text-xs font-medium text-foreground">
          {isReady ? "Ready" : `${pending.length} blocking`}
        </span>
      </div>
    </Button>
  );
}

