"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { ChevronDown } from "lucide-react";
import { createSite } from "@/actions/sites";
import { Button } from "@/ui/primitives/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/ui/primitives/collapsible";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Separator } from "@/ui/primitives/separator";
import { cn } from "@/lib/cn";

import "leaflet/dist/leaflet.css";

/** Initial map view when no pin yet (Accra, Ghana — editable via manual inputs). */
const DEFAULT_CENTER: LatLngExpression = [5.6037, -0.187];
const DEFAULT_ZOOM = 11;

const geofenceCircle = {
  color: "#2563eb",
  fillColor: "#2563eb",
  fillOpacity: 0.14,
  weight: 2,
};

function formatCoord(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(6);
}

function MapEvents({
  onPlacePin,
}: {
  onPlacePin: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPlacePin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PanToPin({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.panTo(position);
  }, [map, position]);
  return null;
}

function SiteMap({
  position,
  radiusM,
  onPlacePin,
}: {
  position: [number, number] | null;
  radiusM: number | null;
  onPlacePin: (lat: number, lng: number) => void;
}) {
  const showCircle = position != null && radiusM != null && radiusM > 0;

  return (
    <MapContainer
      center={position ?? DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="z-0 size-full min-h-[340px] rounded-lg [&_.leaflet-control-attribution]:text-[10px]"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onPlacePin={onPlacePin} />
      <PanToPin position={position} />
      {position && (
        <>
          <CircleMarker
            center={position}
            radius={8}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 1,
              weight: 2,
            }}
          />
          {showCircle ? (
            <Circle center={position} radius={radiusM} pathOptions={geofenceCircle} />
          ) : null}
        </>
      )}
    </MapContainer>
  );
}

export function AddSiteForm({ projectId }: { projectId: string }) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [radiusInput, setRadiusInput] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const radiusM = parseRadius(radiusInput);

  function applyManualCoords() {
    const lat = Number.parseFloat(manualLat);
    const lng = Number.parseFloat(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    setPosition([lat, lng]);
  }

  function onPlacePin(lat: number, lng: number) {
    setPosition([lat, lng]);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
  }

  return (
    <form action={createSite} className="grid gap-6">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="latitude" value={position ? String(position[0]) : ""} />
      <input type="hidden" name="longitude" value={position ? String(position[1]) : ""} />

      <div className="space-y-2">
        <Label htmlFor="site-name">Site name</Label>
        <Input id="site-name" name="name" required placeholder="Main laydown / Gate A" />
      </div>

      <div className="space-y-3">
        <div>
          <Label>Location on map</Label>
          <p className="text-sm text-muted-foreground">
            Click the map to place the site. Latitude and longitude update automatically.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border bg-muted/20 ring-1 ring-border">
          {mounted ? (
            <SiteMap position={position} radiusM={radiusM} onPlacePin={onPlacePin} />
          ) : (
            <div className="flex min-h-[340px] items-center justify-center text-sm text-muted-foreground">
              Loading map…
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Latitude</Label>
            <Input readOnly tabIndex={-1} value={formatCoord(position?.[0] ?? null)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Longitude</Label>
            <Input readOnly tabIndex={-1} value={formatCoord(position?.[1] ?? null)} className="font-mono text-sm" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="geofence_radius_m">Geofence radius (meters, optional)</Label>
        <Input
          id="geofence_radius_m"
          name="geofence_radius_m"
          type="number"
          inputMode="numeric"
          min={1}
          max={50000}
          step={1}
          placeholder="e.g. 200"
          value={radiusInput}
          onChange={(e) => setRadiusInput(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          When set, workers must clock in within this distance from the pin. The circle previews on the map.
        </p>
      </div>

      <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="h-auto w-full justify-between px-0 py-2 font-normal hover:bg-transparent">
            <span className="text-sm text-muted-foreground">Enter latitude & longitude instead</span>
            <ChevronDown
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", manualOpen && "rotate-180")}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <Separator />
          <p className="text-sm text-muted-foreground">
            Use decimal degrees. Values sync to the map when you apply them.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-lat">Latitude</Label>
              <Input
                id="manual-lat"
                inputMode="decimal"
                placeholder="5.6037"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-lng">Longitude</Label>
              <Input
                id="manual-lng"
                inputMode="decimal"
                placeholder="-0.1870"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={applyManualCoords}>
            Apply to map
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <Button type="submit" className="w-full sm:w-auto">
        Create site & check-in link
      </Button>
    </form>
  );
}

function parseRadius(radiusInput: string): number | null {
  const t = radiusInput.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
