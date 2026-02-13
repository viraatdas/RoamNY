"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVideoRoute } from "@/lib/api-client";
import { interpolatePosition, getWatchedIndex } from "@/lib/interpolate-route";
import type { RoutePoint, VideoRoute } from "@/types";

export function useRouteAnimation(
  videoId: number | null,
  currentTime: number
) {
  const { data: route, isLoading } = useQuery<VideoRoute>({
    queryKey: ["route", videoId],
    queryFn: () => fetchVideoRoute(videoId!),
    enabled: videoId !== null,
    staleTime: 300_000,
  });

  const position = useMemo(() => {
    if (!route) return null;
    return interpolatePosition(route.points, currentTime);
  }, [route, currentTime]);

  const watchedIndex = useMemo(() => {
    if (!route) return 0;
    return getWatchedIndex(route.points, currentTime);
  }, [route, currentTime]);

  return {
    route,
    isLoading,
    position,
    watchedIndex,
  };
}
