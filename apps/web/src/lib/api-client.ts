import { API_URL, SEARCH_RADIUS_M, SEARCH_LIMIT } from "./constants";
import type { VideoResult, VideoRoute, CoverageCell } from "@/types";

export async function fetchNearbyVideos(
  lat: number,
  lng: number
): Promise<VideoResult[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius_m: SEARCH_RADIUS_M.toString(),
    limit: SEARCH_LIMIT.toString(),
  });
  const res = await fetch(`${API_URL}/api/videos/near?${params}`);
  if (!res.ok) throw new Error("Failed to fetch nearby videos");
  return res.json();
}

export async function fetchVideoRoute(videoId: number): Promise<VideoRoute> {
  const res = await fetch(`${API_URL}/api/routes/${videoId}`);
  if (!res.ok) throw new Error("Failed to fetch route");
  return res.json();
}

export async function fetchCoverage(): Promise<
  GeoJSON.FeatureCollection<GeoJSON.Point>
> {
  const res = await fetch(`${API_URL}/api/coverage`);
  if (!res.ok) throw new Error("Failed to fetch coverage");
  return res.json();
}
