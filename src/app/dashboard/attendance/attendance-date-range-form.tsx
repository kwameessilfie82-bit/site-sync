"use client";

import Link from "next/link";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";

export function AttendanceDateRangeForm({
  from,
  to,
  maxRows,
}: {
  from: string;
  to: string;
  maxRows: number;
}) {
  return (
    <form method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="att-from">From</Label>
        <Input id="att-from" name="from" type="date" defaultValue={from} className="w-full sm:w-auto" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="att-to">To</Label>
        <Input id="att-to" name="to" type="date" defaultValue={to} className="w-full sm:w-auto" />
      </div>
      <Button type="submit" size="sm" className="sm:mb-0.5">
        Apply range
      </Button>
      <Button type="button" variant="ghost" size="sm" className="sm:mb-0.5" asChild>
        <Link href="/dashboard/attendance">Reset (last 7 days)</Link>
      </Button>
      <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto sm:text-right">
        Showing up to {maxRows} sessions in range (newest first).
      </p>
    </form>
  );
}
