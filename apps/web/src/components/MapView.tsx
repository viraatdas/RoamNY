"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { NYCMap } from "./NYCMap";
import { Pegman } from "./Pegman";
import { CoverageLayer } from "./CoverageLayer";
import { RouteLayer } from "./RouteLayer";
import { PositionMarker } from "./PositionMarker";
import { VideoPanel } from "./VideoPanel";
import { usePegmanDrag } from "@/hooks/usePegmanDrag";
import { useVideoSearch } from "@/hooks/useVideoSearch";
import { useVideoPlayback } from "@/hooks/useVideoPlayback";
import { useRouteAnimation } from "@/hooks/useRouteAnimation";
import type { AppState, VideoResult } from "@/types";

export function MapView() {
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const {
    isDragging,
    dragPosition,
    dropLocation,
    handleDragStart,
    resetDrop,
  } = usePegmanDrag(mapRef, setAppState);

  const {
    data: videos,
    isLoading: videosLoading,
    error: videosError,
  } = useVideoSearch(dropLocation);

  // When videos arrive, auto-select the first one
  useEffect(() => {
    if (videos && videos.length > 0 && appState === "LOADING") {
      setActiveVideo(videos[0]!);
      setAppState("PLAYING");
    } else if (videos && videos.length === 0 && appState === "LOADING") {
      setAppState("IDLE");
    }
  }, [videos, appState]);

  const startTimestamp = activeVideo?.nearest_timestamp_s ?? 0;

  const {
    currentTime,
    isPlaying,
    onReady,
    onPlay,
    onPause,
    onEnd,
    seekTo,
    cleanup,
  } = useVideoPlayback();

  const { route, position, watchedIndex } = useRouteAnimation(
    activeVideo?.id ?? null,
    currentTime
  );

  // Fit map to route when loaded
  useEffect(() => {
    if (!mapRef.current || !route) return;
    const coords = route.points.map(
      (p) => [p.lng, p.lat] as [number, number]
    );
    if (coords.length < 2) return;

    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0]!, coords[0]!)
    );
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 1000 });
  }, [route]);

  const handleSelectVideo = useCallback(
    (video: VideoResult) => {
      cleanup();
      setActiveVideo(video);
      setAppState("PLAYING");
    },
    [cleanup]
  );

  const handleReset = useCallback(() => {
    cleanup();
    setActiveVideo(null);
    resetDrop();
    setAppState("IDLE");

    // Clean up route layers
    const map = mapRef.current;
    if (map) {
      for (const id of [
        "active-route-line",
        "watched-route-line",
      ]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of ["active-route", "watched-route"]) {
        if (map.getSource(id)) map.removeSource(id);
      }
    }
  }, [cleanup, resetDrop]);

  const showCoverage = appState === "DRAGGING";
  const showPanel =
    appState === "PLAYING" || appState === "BROWSING";

  return (
    <div className="relative w-full h-full">
      <NYCMap ref={mapRef} onMapReady={handleMapReady} />

      {mapReady && (
        <>
          <CoverageLayer map={mapRef.current} visible={showCoverage} />
          <RouteLayer
            map={mapRef.current}
            route={route}
            watchedIndex={watchedIndex}
          />
          <PositionMarker map={mapRef.current} position={position} />
        </>
      )}

      <Pegman
        appState={appState}
        isDragging={isDragging}
        dragPosition={dragPosition}
        onDragStart={handleDragStart}
        onReset={handleReset}
      />

      {/* Loading overlay */}
      {appState === "LOADING" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="bg-roam-dark/90 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-roam-orange border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm">Finding walking tours...</p>
            </div>
          </div>
        </div>
      )}

      {/* No results message */}
      {videosError && appState === "LOADING" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="bg-roam-dark/90 backdrop-blur-md rounded-xl px-6 py-4 border border-white/10">
            <p className="text-white text-sm">
              No walking tours found here. Try a different spot!
            </p>
            <button
              onClick={handleReset}
              className="mt-3 text-roam-orange text-sm hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <VideoPanel
        visible={showPanel}
        videos={videos ?? []}
        activeVideo={activeVideo}
        startTimestamp={startTimestamp}
        onSelectVideo={handleSelectVideo}
        onClose={handleReset}
        onReady={onReady}
        onPlay={onPlay}
        onPause={onPause}
        onEnd={onEnd}
      />
    </div>
  );
}
