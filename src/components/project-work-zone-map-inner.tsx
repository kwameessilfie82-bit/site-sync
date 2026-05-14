"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconRetinaUrl: typeof markerIcon2x === "string" ? markerIcon2x : markerIcon2x.src,
  iconUrl: typeof markerIcon === "string" ? markerIcon : markerIcon.src,
  shadowUrl: typeof markerShadow === "string" ? markerShadow : markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  centerLat: number;
  centerLng: number;
  radiusM: number;
  interactive: boolean;
  onCenterChange?: (lat: number, lng: number) => void;
};

function ViewToCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center[0], center[1], zoom]);
  return null;
}

function ClickToMove({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function ProjectWorkZoneMapInner({
  centerLat,
  centerLng,
  radiusM,
  interactive,
  onCenterChange,
}: Props) {
  const center = useMemo((): [number, number] => [centerLat, centerLng], [centerLat, centerLng]);
  const zoom = interactive ? 16 : radiusM > 50_000 ? 10 : radiusM > 5000 ? 12 : radiusM > 500 ? 14 : 16;

  useEffect(() => {
    L.Marker.prototype.options.icon = defaultIcon;
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="isolate z-0 h-[min(22rem,50vh)] w-full rounded-md border border-border"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ViewToCenter center={center} zoom={zoom} />
      <Circle
        center={center}
        radius={Math.max(10, radiusM)}
        pathOptions={{ color: "var(--chart-1)", fillColor: "var(--chart-1)", fillOpacity: 0.12, weight: 2 }}
      />
      <Marker
        position={center}
        draggable={interactive}
        eventHandlers={
          interactive && onCenterChange
            ? {
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  onCenterChange(ll.lat, ll.lng);
                },
              }
            : {}
        }
      />
      {interactive && onCenterChange ? <ClickToMove onPick={onCenterChange} /> : null}
    </MapContainer>
  );
}
