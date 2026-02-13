"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import { NYC_CENTER, DEFAULT_ZOOM, NYC_BOUNDS, MAPBOX_TOKEN } from "@/lib/constants";

interface NYCMapProps {
  onMapReady?: (map: mapboxgl.Map) => void;
}

export const NYCMap = forwardRef<mapboxgl.Map | null, NYCMapProps>(
  function NYCMap({ onMapReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useImperativeHandle(ref, () => mapRef.current!, []);

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: NYC_CENTER,
        zoom: DEFAULT_ZOOM,
        maxBounds: [
          [NYC_BOUNDS[0][0] - 0.1, NYC_BOUNDS[0][1] - 0.1],
          [NYC_BOUNDS[1][0] + 0.1, NYC_BOUNDS[1][1] + 0.1],
        ],
        minZoom: 10,
        maxZoom: 18,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-left");

      map.on("load", () => {
        mapRef.current = map;
        onMapReady?.(map);
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, [onMapReady]);

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
      />
    );
  }
);
