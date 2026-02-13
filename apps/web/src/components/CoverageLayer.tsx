"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCoverage } from "@/lib/api-client";
import type mapboxgl from "mapbox-gl";

interface CoverageLayerProps {
  map: mapboxgl.Map | null;
  visible: boolean;
}

const SOURCE_ID = "coverage";
const LAYER_ID = "coverage-heatmap";

export function CoverageLayer({ map, visible }: CoverageLayerProps) {
  const { data: coverage } = useQuery({
    queryKey: ["coverage"],
    queryFn: fetchCoverage,
    staleTime: 600_000, // 10 min cache
  });

  useEffect(() => {
    if (!map || !coverage) return;

    // Add source if not present
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: coverage,
      });
    } else {
      (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(coverage);
    }

    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: "heatmap",
        source: SOURCE_ID,
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "video_count"],
            0, 0,
            5, 1,
          ],
          "heatmap-intensity": 0.6,
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 15,
            15, 30,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(26,115,232,0.2)",
            0.4, "rgba(26,115,232,0.4)",
            0.6, "rgba(245,158,11,0.5)",
            0.8, "rgba(245,158,11,0.7)",
            1, "rgba(245,158,11,0.9)",
          ],
          "heatmap-opacity": 0,
        },
      });
    }
  }, [map, coverage]);

  // Fade heatmap in/out
  useEffect(() => {
    if (!map || !map.getLayer(LAYER_ID)) return;
    map.setPaintProperty(
      LAYER_ID,
      "heatmap-opacity",
      visible ? 0.8 : 0
    );
  }, [map, visible]);

  return null;
}
