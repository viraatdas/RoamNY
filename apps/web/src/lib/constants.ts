export const NYC_BOUNDS: [[number, number], [number, number]] = [
  [-74.05, 40.68],
  [-73.9, 40.82],
];

export const NYC_CENTER: [number, number] = [-73.975, 40.75];
export const DEFAULT_ZOOM = 13;

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export const SEARCH_RADIUS_M = 200;
export const SEARCH_LIMIT = 5;

export const PLAYBACK_POLL_HZ = 4;
