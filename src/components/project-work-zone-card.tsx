"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProjectSite } from "@/actions/projects";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";

const MapInner = dynamic(
  () => import("./project-work-zone-map-inner").then((m) => m.ProjectWorkZoneMapInner),
  {
    ssr: false,
    loading: () => <div className="h-[min(22rem,50vh)] animate-pulse rounded-md border bg-muted" />,
  },
);

/** Accra, Ghana — default pin when no work zone is saved yet. */
const DEFAULT_MAP_LAT = 5.6037;
const DEFAULT_MAP_LNG = -0.187;

type Props = {
  projectId: string;
  initialLat: number | null;
  initialLng: number | null;
  initialRadiusM: number | null;
  canManage: boolean;
};

export function ProjectWorkZoneCard({ projectId, initialLat, initialLng, initialRadiusM, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hasZone = initialLat != null && initialLng != null && initialRadiusM != null;
  const [lat, setLat] = useState(() => initialLat ?? DEFAULT_MAP_LAT);
  const [lng, setLng] = useState(() => initialLng ?? DEFAULT_MAP_LNG);
  const [radiusM, setRadiusM] = useState(() => initialRadiusM ?? 200);

  function buildSaveFormData() {
    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("site_latitude", String(lat));
    fd.set("site_longitude", String(lng));
    fd.set("site_radius_m", String(radiusM));
    return fd;
  }

  function saveZone() {
    startTransition(async () => {
      const res = await updateProjectSite(buildSaveFormData());
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Work zone saved.");
      router.refresh();
    });
  }

  function clearZone() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", projectId);
      fd.set("intent", "clear");
      const res = await updateProjectSite(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Work zone removed.");
      router.refresh();
    });
  }

  if (!canManage && !hasZone) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Job site &amp; check-in zone</CardTitle>
          <CardDescription>
            A supervisor has not pinned this project on the map yet. Self-service clock-in stays disabled until the
            work zone is set.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Job site &amp; check-in zone</CardTitle>
        <CardDescription>
          {canManage
            ? "Place the pin on the work site, adjust the radius in meters, and save. Employees must be inside the circle with GPS on to clock themselves in."
            : "Allowed clock-in area for this project. The shaded circle is the geofence."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <MapInner
          centerLat={lat}
          centerLng={lng}
          radiusM={radiusM}
          interactive={canManage}
          onCenterChange={
            canManage
              ? (nextLat, nextLng) => {
                  setLat(nextLat);
                  setLng(nextLng);
                }
              : undefined
          }
        />
        {canManage ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="site-lat">Latitude</Label>
              <Input
                id="site-lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={Number.isFinite(lat) ? lat : ""}
                onChange={(e) => setLat(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-lng">Longitude</Label>
              <Input
                id="site-lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={Number.isFinite(lng) ? lng : ""}
                onChange={(e) => setLng(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-radius">Radius (m)</Label>
              <Input
                id="site-radius"
                type="number"
                min={10}
                max={100_000}
                step={10}
                value={Number.isFinite(radiusM) ? radiusM : ""}
                onChange={(e) => setRadiusM(Number(e.target.value))}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
      {canManage ? (
        <CardFooter className="flex flex-col gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={saveZone}>
              Save work zone
            </Button>
          </div>
          {hasZone ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={pending}
              onClick={clearZone}
            >
              Remove zone
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
