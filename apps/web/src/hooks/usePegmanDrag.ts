"use client";

import { useCallback, useRef, useState } from "react";
import type { AppState, DropLocation } from "@/types";

interface PegmanDragState {
  isDragging: boolean;
  dragPosition: { x: number; y: number } | null;
  dropLocation: DropLocation | null;
}

interface UsePegmanDragReturn extends PegmanDragState {
  handleDragStart: (e: React.PointerEvent) => void;
  handleDragMove: (e: PointerEvent) => void;
  handleDragEnd: (e: PointerEvent) => void;
  resetDrop: () => void;
}

export function usePegmanDrag(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  onStateChange: (state: AppState) => void
): UsePegmanDragReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [dropLocation, setDropLocation] = useState<DropLocation | null>(null);
  const draggingRef = useRef(false);

  const handleDragMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragEnd = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
      setDragPosition(null);

      document.removeEventListener("pointermove", handleDragMove);
      document.removeEventListener("pointerup", handleDragEnd);

      const map = mapRef.current;
      if (!map) return;

      const canvas = map.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if dropped within map bounds
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const lngLat = map.unproject([x, y]);
        setDropLocation({ lat: lngLat.lat, lng: lngLat.lng });
        onStateChange("LOADING");
      } else {
        onStateChange("IDLE");
      }
    },
    [mapRef, handleDragMove, onStateChange]
  );

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      setIsDragging(true);
      setDropLocation(null);
      setDragPosition({ x: e.clientX, y: e.clientY });
      onStateChange("DRAGGING");

      document.addEventListener("pointermove", handleDragMove);
      document.addEventListener("pointerup", handleDragEnd);
    },
    [handleDragMove, handleDragEnd, onStateChange]
  );

  const resetDrop = useCallback(() => {
    setDropLocation(null);
    onStateChange("IDLE");
  }, [onStateChange]);

  return {
    isDragging,
    dragPosition,
    dropLocation,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    resetDrop,
  };
}
