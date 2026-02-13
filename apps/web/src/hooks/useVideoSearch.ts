"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNearbyVideos } from "@/lib/api-client";
import type { DropLocation, VideoResult } from "@/types";

export function useVideoSearch(dropLocation: DropLocation | null) {
  return useQuery<VideoResult[]>({
    queryKey: ["videos-near", dropLocation?.lat, dropLocation?.lng],
    queryFn: () =>
      fetchNearbyVideos(dropLocation!.lat, dropLocation!.lng),
    enabled: !!dropLocation,
    staleTime: 30_000,
  });
}
