export interface VideoResult {
  id: number;
  youtube_id: string;
  title: string;
  channel_name: string;
  duration_secs: number;
  thumbnail_url: string;
  nearest_timestamp_s: number;
  distance_m: number;
}

export interface RoutePoint {
  timestamp_s: number;
  lat: number;
  lng: number;
  heading: number | null;
}

export interface VideoRoute {
  video_id: number;
  youtube_id: string;
  title: string;
  points: RoutePoint[];
  geojson: GeoJSON.Feature<GeoJSON.LineString>;
}

export interface CoverageCell {
  lat: number;
  lng: number;
  video_count: number;
}

export type AppState = "IDLE" | "DRAGGING" | "LOADING" | "PLAYING" | "BROWSING";

export interface DropLocation {
  lat: number;
  lng: number;
}
