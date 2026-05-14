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

type ProjectOption = { id: string; name: string; geofenceConfigured: boolean };

export function CheckInForm({
  projects,
  openSessionId,
}: {
  projects: ProjectOption[];
  openSessionId: string | null;
}) {
  const searchParams = useSearchParams();
  const presetProject = searchParams.get("project") ?? "";
  const [projectId, setProjectId] = useState(presetProject || (projects[0]?.id ?? ""));
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (presetProject) {
      queueMicrotask(() => setProjectId(presetProject));
    }
  }, [presetProject]);

  const selected = projects.find((p) => p.id === projectId);
  const geofenceConfigured = !!selected?.geofenceConfigured;
  const zoneBlocking = !openSessionId && !!selected && !geofenceConfigured;

  useEffect(() => {
    if (openSessionId || !geofenceConfigured || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }, [projectId, openSessionId, geofenceConfigured]);

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

  if (projects.length === 0) {
    return (
      <Empty className="border border-dashed bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPin className="size-4" />
          </EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            Create a project under Projects before your crew can clock in here.
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
            ? "You have an open session. Optionally capture GPS, then clock out."
            : zoneBlocking
              ? "This project does not have a work zone on the map yet. Ask a supervisor to open the project and save the site before you can clock in here."
              : geofenceConfigured
                ? "This project checks GPS at clock-in. Allow location access — we refresh your position when you select the project."
                : "Pick the project you are on."}
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
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <NativeSelect
                id="project_id"
                name="project_id"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full"
              >
                {projects.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <input type="hidden" name="latitude" value={lat} readOnly />
            <input type="hidden" name="longitude" value={lng} readOnly />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={captureLocation} disabled={pending || zoneBlocking}>
                {geofenceConfigured ? "Refresh GPS" : "Capture GPS (optional)"}
              </Button>
              <Button type="submit" disabled={pending || zoneBlocking}>
                {pending ? "Working…" : "Clock in"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="border-t bg-muted/30 text-xs text-muted-foreground">
        Links can pre-fill the project with <span className="font-mono">?project=…</span> in the URL.
      </CardFooter>
    </Card>
  );
}
