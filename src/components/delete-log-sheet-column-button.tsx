"use client";

import { useTransition } from "react";
import { deleteLogSheetColumn } from "@/actions/project-log-sheets";
import { Button } from "@/ui/primitives/button";
import { toast } from "sonner";

export function DeleteLogSheetColumnButton({ columnId }: { columnId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteLogSheetColumn(columnId);
          toast.success("Column removed.");
        })
      }
    >
      {pending ? "…" : "Remove"}
    </Button>
  );
}
