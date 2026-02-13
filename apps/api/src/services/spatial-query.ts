import { query } from "../db/client.js";

export interface NearbyVideoRow {
  id: number;
  youtube_id: string;
  title: string;
  channel_name: string;
  duration_secs: number;
  thumbnail_url: string;
  nearest_timestamp_s: number;
  distance_m: number;
}

export async function findNearbyVideos(
  lat: number,
  lng: number,
  radiusM: number,
  limit: number
): Promise<NearbyVideoRow[]> {
  const result = await query<NearbyVideoRow>(
    `
    WITH nearest_points AS (
      SELECT DISTINCT ON (rp.video_id)
        rp.video_id,
        rp.timestamp_s AS nearest_timestamp_s,
        ST_Distance(rp.location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_m
      FROM route_points rp
      WHERE ST_DWithin(
        rp.location::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      ORDER BY rp.video_id, distance_m ASC
    )
    SELECT
      v.id,
      v.youtube_id,
      v.title,
      c.name AS channel_name,
      v.duration_secs,
      v.thumbnail_url,
      np.nearest_timestamp_s,
      np.distance_m
    FROM nearest_points np
    JOIN videos v ON v.id = np.video_id
    JOIN channels c ON c.id = v.channel_id
    WHERE v.status = 'active'
    ORDER BY np.distance_m ASC
    LIMIT $4
    `,
    [lat, lng, radiusM, limit]
  );
  return result.rows;
}

export interface RoutePointRow {
  timestamp_s: number;
  lat: number;
  lng: number;
  heading: number | null;
}

export async function getVideoRoute(videoId: number) {
  // Get route points
  const pointsResult = await query<RoutePointRow>(
    `
    SELECT
      timestamp_s,
      ST_Y(location) AS lat,
      ST_X(location) AS lng,
      heading
    FROM route_points
    WHERE video_id = $1
    ORDER BY seq_order ASC
    `,
    [videoId]
  );

  // Get video metadata
  const videoResult = await query(
    `
    SELECT v.id, v.youtube_id, v.title, ST_AsGeoJSON(v.route_geom) AS geojson
    FROM videos v
    WHERE v.id = $1
    `,
    [videoId]
  );

  if (videoResult.rows.length === 0) return null;

  const video = videoResult.rows[0];
  const points = pointsResult.rows;

  // Build GeoJSON from points if route_geom is not set
  let geojson;
  if (video.geojson) {
    geojson = {
      type: "Feature" as const,
      properties: {},
      geometry: JSON.parse(video.geojson),
    };
  } else {
    geojson = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: points.map((p) => [p.lng, p.lat]),
      },
    };
  }

  return {
    video_id: video.id,
    youtube_id: video.youtube_id,
    title: video.title,
    points,
    geojson,
  };
}

export async function getCoverage() {
  const result = await query(
    `
    SELECT
      ST_X(cell_center) AS lng,
      ST_Y(cell_center) AS lat,
      video_count
    FROM coverage_cells
    `
  );

  const features = result.rows.map(
    (row: { lng: number; lat: number; video_count: number }) => ({
      type: "Feature" as const,
      properties: { video_count: Number(row.video_count) },
      geometry: {
        type: "Point" as const,
        coordinates: [row.lng, row.lat],
      },
    })
  );

  return {
    type: "FeatureCollection" as const,
    features,
  };
}
