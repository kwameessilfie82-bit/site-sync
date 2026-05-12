"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { clockIn, clockOut } from "@/actions/attendance";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/primitives/empty";
import { Label } from "@/ui/primitives/label";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Separator } from "@/ui/primitives/separator";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

type SiteOption = { id: string; name: string; project: { name: string } | null };

export function CheckInForm({
  sites,
  openSessionId,
}: {
  sites: SiteOption[];
  openSessionId: string | null;
}) {
  const searchParams = useSearchParams();
  const presetSite = searchParams.get("site") ?? "";
  const presetToken = searchParams.get("token") ?? "";
  const [siteId, setSiteId] = useState(presetSite || (sites[0]?.id ?? ""));
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (presetSite) {
      queueMicrotask(() => setSiteId(presetSite));
    }
  }, [presetSite]);

  function captureLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        toast.success("Location captured.");
      },
      () => toast.error("Could not read location. Allow permission or continue without."),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  function submitClockIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await clockIn(fd);
      if ("error" in res) toast.error(res.error);
      else toast.success("Clocked in.");
    });
  }

  function submitClockOut(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await clockOut(fd);
      if ("error" in res) toast.error(res.error);
      else toast.success("Clocked out.");
    });
  }

  if (sites.length === 0) {
    return (
      <Empty className="border border-dashed bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPin className="size-4" />
          </EmptyMedia>
          <EmptyTitle>No sites yet</EmptyTitle>
          <EmptyDescription>
            Create a project and add a site before workers can clock in here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card className="max-w-lg border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{openSessionId ? "Clock out" : "Clock in"}</CardTitle>
        <CardDescription>
          {openSessionId
            ? "You have an open session. Capture location if required, then clock out."
            : "Pick a site and optionally capture GPS for geofenced locations."}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {openSessionId ? (
          <form onSubmit={submitClockOut} className="space-y-4">
            <input type="hidden" name="latitude" value={lat} readOnly />
            <input type="hidden" name="longitude" value={lng} readOnly />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={captureLocation} disabled={pending}>
                Capture GPS for clock-out
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Working…" : "Clock out"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitClockIn} className="space-y-4">
            <input type="hidden" name="token" value={presetToken} readOnly />
            <div className="space-y-2">
              <Label htmlFor="site_id">Site</Label>
              <NativeSelect
                id="site_id"
                name="site_id"
                required
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full"
              >
                {sites.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.project?.name ? `${s.project.name} — ${s.name}` : s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <input type="hidden" name="latitude" value={lat} readOnly />
            <input type="hidden" name="longitude" value={lng} readOnly />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={captureLocation} disabled={pending}>
                Capture GPS (for geofenced sites)
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Working…" : "Clock in"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="border-t bg-muted/30 text-xs text-muted-foreground">
        QR deep links can pre-fill site and token via URL parameters.
      </CardFooter>
    </Card>
  );
}
