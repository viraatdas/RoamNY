import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { pool, query } from "../client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "../../../../data/seed/routes");

interface SeedPoint {
  timestamp_s: number;
  lat: number;
  lng: number;
  heading: number;
}

interface SeedData {
  channel: {
    youtube_id: string;
    name: string;
    slug: string;
  };
  video: {
    youtube_id: string;
    title: string;
    duration_secs: number;
    thumbnail_url: string;
  };
  points: SeedPoint[];
}

async function seed() {
  console.log("Seeding database...");

  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} route files`);

  for (const file of files) {
    const data: SeedData = JSON.parse(
      readFileSync(resolve(SEED_DIR, file), "utf-8")
    );

    console.log(`  Seeding: ${data.video.title}`);

    // Upsert channel
    const channelResult = await query(
      `
      INSERT INTO channels (youtube_id, name, slug)
      VALUES ($1, $2, $3)
      ON CONFLICT (youtube_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
      `,
      [data.channel.youtube_id, data.channel.name, data.channel.slug]
    );
    const channelId = channelResult.rows[0].id;

    // Build route geometry from points
    const lineCoords = data.points
      .map((p) => `${p.lng} ${p.lat}`)
      .join(", ");
    const lineWKT = `LINESTRING(${lineCoords})`;

    // Build bounding box
    const lngs = data.points.map((p) => p.lng);
    const lats = data.points.map((p) => p.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const bboxWKT = `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;

    // Upsert video
    const videoResult = await query(
      `
      INSERT INTO videos (youtube_id, channel_id, title, duration_secs, thumbnail_url, route_geom, bbox)
      VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326), ST_GeomFromText($7, 4326))
      ON CONFLICT (youtube_id) DO UPDATE SET
        title = EXCLUDED.title,
        route_geom = EXCLUDED.route_geom,
        bbox = EXCLUDED.bbox
      RETURNING id
      `,
      [
        data.video.youtube_id,
        channelId,
        data.video.title,
        data.video.duration_secs,
        data.video.thumbnail_url,
        lineWKT,
        bboxWKT,
      ]
    );
    const videoId = videoResult.rows[0].id;

    // Delete existing route points for this video
    await query("DELETE FROM route_points WHERE video_id = $1", [videoId]);

    // Insert route points
    for (let i = 0; i < data.points.length; i++) {
      const p = data.points[i]!;
      await query(
        `
        INSERT INTO route_points (video_id, timestamp_s, location, heading, seq_order)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6)
        `,
        [videoId, p.timestamp_s, p.lng, p.lat, p.heading, i]
      );
    }

    console.log(`    ✓ ${data.points.length} route points`);
  }

  // Refresh materialized view
  console.log("Refreshing coverage materialized view...");
  await query("REFRESH MATERIALIZED VIEW coverage_cells");

  console.log("Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
