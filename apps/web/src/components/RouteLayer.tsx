"use client";

import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import type { VideoRoute } from "@/types";

interface RouteLayerProps {
  map: mapboxgl.Map | null;
  route: VideoRoute | null | undefined;
  watchedIndex: number;
}

const ROUTE_SOURCE = "active-route";
const ROUTE_LAYER = "active-route-line";
const WATCHED_SOURCE = "watched-route";
const WATCHED_LAYER = "watched-route-line";

export function RouteLayer({ map, route, watchedIndex }: RouteLayerProps) {
  // Full route line
  useEffect(() => {
    if (!map || !route) return;

    const geojson = route.geojson;

    if (!map.getSource(ROUTE_SOURCE)) {
      map.addSource(ROUTE_SOURCE, { type: "geojson", data: geojson });
    } else {
      (map.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource).setData(geojson);
    }

    if (!map.getLayer(ROUTE_LAYER)) {
      map.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        paint: {
          "line-color": "#ffffff",
          "line-width": 3,
          "line-opacity": 0.4,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
    }

    return () => {
      if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
      if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
    };
  }, [map, route]);

  // Watched portion
  useEffect(() => {
    if (!map || !route || watchedIndex < 1) return;

    const watchedCoords = route.points
      .slice(0, watchedIndex + 1)
      .map((p) => [p.lng, p.lat] as [number, number]);

    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: watchedCoords,
      },
    };

    if (!map.getSource(WATCHED_SOURCE)) {
      map.addSource(WATCHED_SOURCE, { type: "geojson", data: geojson });
    } else {
      (map.getSource(WATCHED_SOURCE) as mapboxgl.GeoJSONSource).setData(
        geojson
      );
    }

    if (!map.getLayer(WATCHED_LAYER)) {
      map.addLayer({
        id: WATCHED_LAYER,
        type: "line",
        source: WATCHED_SOURCE,
        paint: {
          "line-color": "#f59e0b",
          "line-width": 4,
          "line-opacity": 0.9,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
    }

    return () => {
      if (map.getLayer(WATCHED_LAYER)) map.removeLayer(WATCHED_LAYER);
      if (map.getSource(WATCHED_SOURCE)) map.removeSource(WATCHED_SOURCE);
    };
  }, [map, route, watchedIndex]);

  return null;
}
