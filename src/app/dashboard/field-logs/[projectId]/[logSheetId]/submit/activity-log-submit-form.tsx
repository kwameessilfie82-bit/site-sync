"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { submitProjectActivityLog } from "@/actions/project-activity-logs";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Separator } from "@/ui/primitives/separator";
import { toast } from "sonner";

type Col = { column_key: string; label: string };

export function ActivityLogSubmitForm({
  projectId,
  logSheetId,
  sheetName,
  columns,
  defaultClient,
  defaultLocation,
  defaultDate,
}: {
  projectId: string;
  logSheetId: string;
  sheetName: string;
  columns: Col[];
  defaultClient: string;
  defaultLocation: string;
  defaultDate: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await submitProjectActivityLog(fd);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Saved ${sheetName} log.`);
    router.push("/dashboard/field-logs");
    router.refresh();
  }

  function applyGpsToLocation() {
    if (!("geolocation" in navigator)) {
      toast.message("Location isn’t available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const el = formRef.current?.querySelector<HTMLInputElement>('[name="work_location"]');
        if (!el) return;
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        el.value = `GPS ${lat}, ${lng}`;
        toast.success("Location filled from GPS (you can edit it).");
      },
      () => toast.error("Could not read GPS. Enter location manually."),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-8">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="log_sheet_id" value={logSheetId} />

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Required header</CardTitle>
          <CardDescription>
            Client, location, date, and geomembrane details are required for every submission. Date and location
            are prefilled where we can; adjust them to match the job.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="client_name">Client</Label>
            <Input
              id="client_name"
              name="client_name"
              required
              defaultValue={defaultClient}
              placeholder="Client name"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label htmlFor="work_location">Location</Label>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={applyGpsToLocation}>
                Use GPS for location
              </Button>
            </div>
            <Input
              id="work_location"
              name="work_location"
              required
              defaultValue={defaultLocation}
              placeholder="Site or area description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="log_date">Date</Label>
            <Input id="log_date" name="log_date" type="date" required defaultValue={defaultDate} />
          </div>
          <div className="hidden sm:block" aria-hidden />
          <div className="space-y-2 sm:col-span-2">
            <Label>Geomembrane</Label>
            <p className="text-xs text-muted-foreground">Material, thickness, and texture</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="geomembrane_material" required placeholder="Material (e.g. HDPE)" />
              <Input name="geomembrane_thickness" required placeholder="Thickness" />
              <Input name="geomembrane_texture" required placeholder="Texture" />
            </div>
          </div>
        </CardContent>
      </Card>

      {columns.length > 0 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{sheetName} — detail fields</CardTitle>
            <CardDescription>These columns were set up by your manager for this activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {columns.map((c) => (
              <div key={c.column_key} className="space-y-2 sm:col-span-2">
                <Label htmlFor={`c_${c.column_key}`}>{c.label}</Label>
                <Input id={`c_${c.column_key}`} name={`custom_${c.column_key}`} required placeholder={c.label} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {columns.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">No detail columns yet</CardTitle>
            <CardDescription>
              Your manager has not added columns for this log sheet. You can still submit the header block; ask
              them to add fields like Patch number or Machine operator on the project page.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Separator />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Submit log"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
