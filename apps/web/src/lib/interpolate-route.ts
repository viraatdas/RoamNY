import type { RoutePoint } from "@/types";

/**
 * Binary search + linear interpolation to find the map position
 * for a given video timestamp.
 */
export function interpolatePosition(
  points: RoutePoint[],
  currentTime: number
): { lat: number; lng: number; heading: number } | null {
  if (points.length === 0) return null;

  const first = points[0]!;
  const last = points[points.length - 1]!;

  if (currentTime <= first.timestamp_s) {
    return { lat: first.lat, lng: first.lng, heading: first.heading ?? 0 };
  }
  if (currentTime >= last.timestamp_s) {
    return { lat: last.lat, lng: last.lng, heading: last.heading ?? 0 };
  }

  // Binary search for the segment containing currentTime
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.timestamp_s <= currentTime) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const a = points[lo]!;
  const b = points[hi]!;
  const segmentDuration = b.timestamp_s - a.timestamp_s;
  const t = segmentDuration > 0 ? (currentTime - a.timestamp_s) / segmentDuration : 0;

  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    heading: lerpAngle(a.heading ?? 0, b.heading ?? 0, t),
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * t) % 360 + 360) % 360;
}

/**
 * Find the watched portion of the route (indices before current time).
 */
export function getWatchedIndex(
  points: RoutePoint[],
  currentTime: number
): number {
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (points[mid]!.timestamp_s <= currentTime) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}
