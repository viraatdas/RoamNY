"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface PositionMarkerProps {
  map: mapboxgl.Map | null;
  position: { lat: number; lng: number; heading: number } | null;
}

export function PositionMarker({ map, position }: PositionMarkerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const el = document.createElement("div");
    el.className = "position-marker";
    el.innerHTML = `
      <div style="
        width: 18px;
        height: 18px;
        background: #f59e0b;
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(245,158,11,0.6), 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `;

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([0, 0])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!markerRef.current || !position) return;
    markerRef.current.setLngLat([position.lng, position.lat]);
  }, [position]);

  if (!position) return null;
  return null;
}
