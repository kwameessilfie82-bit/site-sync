"use client";

import { useTransition } from "react";
import { deleteProjectLogSheet } from "@/actions/project-log-sheets";
import { Button } from "@/ui/primitives/button";
import { toast } from "sonner";

export function DeleteLogSheetButton({ logSheetId }: { logSheetId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await deleteProjectLogSheet(logSheetId);
          if (r.error) toast.error(r.error);
          else toast.success("Log sheet removed.");
        })
      }
    >
      {pending ? "Removing…" : "Remove log sheet"}
    </Button>
  );
}
