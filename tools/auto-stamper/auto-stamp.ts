/**
 * RoamNY Auto-Stamper
 *
 * Automatically maps walking tour videos to GPS coordinates using:
 *   1. yt-dlp    — download video + extract metadata from YouTube
 *   2. ffmpeg    — extract frames at regular intervals
 *   3. Gemini    — identify NYC location from street signs, landmarks, storefronts
 *   4. Mapbox    — geocode location descriptions to lat/lng
 *
 * Single video:
 *   pnpm stamp -- https://www.youtube.com/watch?v=VIDEO_ID
 *
 * Batch mode (pass a file with one URL per line):
 *   pnpm stamp -- --batch urls.txt
 *
 * Options:
 *   --interval <secs>   Seconds between frame captures (default: 30)
 *   --batch <file>      Process every URL in the file
 *   --keep-video        Don't delete the downloaded video after processing
 */

import { execSync, spawnSync } from "child_process";
import {
  mkdirSync,
  rmSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOWNLOADS_DIR = resolve(__dirname, ".downloads");
const FRAMES_DIR = resolve(__dirname, ".frames-tmp");
const OUTPUT_DIR = resolve(__dirname, "../../data/seed/routes");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAPBOX_TOKEN =
  process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY not set in environment");
  process.exit(1);
}
if (!MAPBOX_TOKEN) {
  console.error(
    "Error: MAPBOX_TOKEN (or NEXT_PUBLIC_MAPBOX_TOKEN) not set"
  );
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  urls: string[];
  interval: number;
  keepVideo: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const urls: string[] = [];
  let interval = 30;
  let keepVideo = false;
  let batchFile: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case "--interval":
        interval = parseInt(args[++i] ?? "30", 10);
        break;
      case "--batch":
        batchFile = args[++i] ?? null;
        break;
      case "--keep-video":
        keepVideo = true;
        break;
      default:
        if (!arg.startsWith("--")) {
          urls.push(arg);
        }
    }
  }

  if (batchFile) {
    const lines = readFileSync(batchFile, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    urls.push(...lines);
  }

  if (urls.length === 0) {
    console.error(`
Usage:
  pnpm stamp -- <youtube-url> [youtube-url ...] [--interval 30] [--keep-video]
  pnpm stamp -- --batch urls.txt [--interval 30]

Example:
  pnpm stamp -- https://www.youtube.com/watch?v=C_nK_-ZI6Zo
  pnpm stamp -- --batch urls.txt --interval 20
    `);
    process.exit(1);
  }

  return { urls, interval, keepVideo };
}

// ---------------------------------------------------------------------------
// yt-dlp: download video + get metadata
// ---------------------------------------------------------------------------

interface VideoMeta {
  videoId: string;
  title: string;
  duration: number;
  channelId: string;
  channelName: string;
  channelSlug: string;
  videoPath: string;
}

function downloadVideo(url: string): VideoMeta {
  mkdirSync(DOWNLOADS_DIR, { recursive: true });

  console.log(`\n  Fetching metadata...`);

  // Get metadata as JSON first
  const metaJson = execSync(
    `yt-dlp --dump-json --no-download "${url}" 2>/dev/null`,
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
  );
  const meta = JSON.parse(metaJson);

  const videoId: string = meta.id;
  const title: string = meta.title ?? "Unknown";
  const duration: number = Math.floor(meta.duration ?? 0);
  const channelId: string = meta.channel_id ?? "unknown";
  const channelName: string = meta.channel ?? meta.uploader ?? "Unknown";
  const channelSlug: string = channelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  console.log(`  Title: ${title}`);
  console.log(`  Channel: ${channelName}`);
  console.log(
    `  Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`
  );

  // Download the video (720p max to keep it reasonable)
  const outTemplate = resolve(DOWNLOADS_DIR, `${videoId}.%(ext)s`);
  console.log(`  Downloading (720p)...`);

  execSync(
    `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4 -o "${outTemplate}" "${url}" 2>/dev/null`,
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024, timeout: 600_000 }
  );

  // Find the actual output file
  const files = readdirSync(DOWNLOADS_DIR).filter((f) =>
    f.startsWith(videoId)
  );
  if (files.length === 0) {
    throw new Error(`Download failed: no file found for ${videoId}`);
  }
  const videoPath = resolve(DOWNLOADS_DIR, files[0]!);

  console.log(`  Downloaded: ${files[0]}`);

  return {
    videoId,
    title,
    duration,
    channelId,
    channelName,
    channelSlug,
    videoPath,
  };
}

// ---------------------------------------------------------------------------
// ffmpeg: extract frames
// ---------------------------------------------------------------------------

function extractFrames(
  videoPath: string,
  interval: number
): string[] {
  if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
  mkdirSync(FRAMES_DIR, { recursive: true });

  console.log(`  Extracting frames every ${interval}s...`);

  execSync(
    `ffmpeg -i "${videoPath}" -vf "fps=1/${interval}" -q:v 2 "${FRAMES_DIR}/frame_%06d.jpg" -y 2>/dev/null`,
    { encoding: "utf-8", timeout: 300_000 }
  );

  const frames = readdirSync(FRAMES_DIR)
    .filter((f) => f.endsWith(".jpg"))
    .sort();

  console.log(`  Extracted ${frames.length} frames`);
  return frames;
}

// ---------------------------------------------------------------------------
// Gemini Vision: identify location
// ---------------------------------------------------------------------------

const VISION_PROMPT = `You are analyzing a frame from a walking tour video filmed in New York City.

Your job is to identify the EXACT location where this frame was captured, based on visual clues:
- Street signs (look for green street name signs at intersections)
- Store names, restaurant names, business signs
- Subway station entrances (letter/number indicators)
- Landmarks (bridges, parks, notable buildings, statues, public art)
- Building numbers visible on facades
- Neighborhood characteristics (cobblestones, fire escapes, brownstones, etc.)
- Construction scaffolding with addresses
- Parking signs with cross streets
- Bus stop signs with route info
- Any other text or visual marker that pins the location

Respond in this EXACT JSON format (no markdown, no code fences):
{
  "confidence": "high" | "medium" | "low" | "none",
  "location_query": "specific location search string for geocoding, e.g. 'Broadway and W 42nd St, Manhattan, NYC' or 'Katz Deli, E Houston St, Manhattan, NYC'",
  "reasoning": "brief explanation of what visual clues you used",
  "street_signs": ["any street names visible"],
  "landmarks": ["any landmarks identified"],
  "heading_estimate": 0
}

heading_estimate: compass bearing the camera is facing (0=north, 90=east, 180=south, 270=west). Estimate from shadows, building orientation, one-way street directions, or known landmark positions.

If you CANNOT determine the location at all, set confidence to "none" and location_query to "".
Be as specific as possible — intersection-level is ideal.
Always include the borough (e.g. "Manhattan, NYC" or "Brooklyn, NYC") in location_query.`;

interface VisionResult {
  confidence: "high" | "medium" | "low" | "none";
  location_query: string;
  reasoning: string;
  street_signs: string[];
  landmarks: string[];
  heading_estimate: number;
}

async function analyzeFrame(
  framePath: string,
  retries = 2
): Promise<VisionResult | null> {
  const imageData = readFileSync(framePath);
  const base64 = imageData.toString("base64");

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent([
        { text: VISION_PROMPT },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64,
          },
        },
      ]);

      const text = result.response.text().trim();
      const jsonStr = text
        .replace(/^```json?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();

      return JSON.parse(jsonStr) as VisionResult;
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      console.error(
        `  Gemini error: ${err instanceof Error ? err.message : err}`
      );
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mapbox geocoding
// ---------------------------------------------------------------------------

interface GeocodedPoint {
  lat: number;
  lng: number;
  place_name: string;
}

async function geocode(query: string): Promise<GeocodedPoint | null> {
  if (!query) return null;

  const url = new URL(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
      encodeURIComponent(query) +
      ".json"
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN!);
  url.searchParams.set("bbox", "-74.05,40.68,-73.90,40.85");
  url.searchParams.set("limit", "1");
  url.searchParams.set("types", "poi,address,neighborhood,place");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as any;
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.center;
    return { lat, lng, place_name: feature.place_name };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function computeHeading(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ---------------------------------------------------------------------------
// Process a single video
// ---------------------------------------------------------------------------

interface RouteCandidate {
  timestamp_s: number;
  vision: VisionResult;
  geo: GeocodedPoint;
  heading: number;
}

async function processVideo(
  url: string,
  interval: number,
  keepVideo: boolean
): Promise<string | null> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Processing: ${url}`);
  console.log("=".repeat(70));

  // Step 1: Download
  let meta: VideoMeta;
  try {
    meta = downloadVideo(url);
  } catch (err) {
    console.error(
      `  FAILED to download: ${err instanceof Error ? err.message : err}`
    );
    return null;
  }

  // Step 2: Extract frames
  const frames = extractFrames(meta.videoPath, interval);

  if (frames.length === 0) {
    console.error("  No frames extracted");
    if (!keepVideo) unlinkSync(meta.videoPath);
    return null;
  }

  // Step 3 + 4: Analyze frames with Gemini + geocode
  const candidates: RouteCandidate[] = [];
  const totalFrames = frames.length;

  console.log(
    `\n  Analyzing ${totalFrames} frames with Gemini Vision...\n`
  );

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]!;
    const timestamp_s = (i + 1) * interval;
    const framePath = resolve(FRAMES_DIR, frame);

    const pct = Math.round(((i + 1) / totalFrames) * 100);
    process.stdout.write(
      `  [${String(i + 1).padStart(3)}/${totalFrames}] ` +
        `t=${formatTime(timestamp_s)} (${pct}%) ... `
    );

    const vision = await analyzeFrame(framePath);

    if (!vision || vision.confidence === "none" || !vision.location_query) {
      console.log(`skip (${vision?.confidence ?? "error"})`);
      continue;
    }

    const geo = await geocode(vision.location_query);

    if (!geo) {
      console.log(`geocode miss: "${vision.location_query}"`);
      continue;
    }

    candidates.push({
      timestamp_s,
      vision,
      geo,
      heading: vision.heading_estimate ?? 0,
    });

    const conf = { high: "H", medium: "M", low: "L" }[vision.confidence] ?? "?";
    console.log(
      `[${conf}] ${geo.place_name.substring(0, 55)}`
    );

    // Rate limit
    await sleep(400);
  }

  // Clean up frames
  if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });

  // Clean up video
  if (!keepVideo && existsSync(meta.videoPath)) {
    unlinkSync(meta.videoPath);
  }

  if (candidates.length === 0) {
    console.error(
      `\n  No locations identified for "${meta.title}". Skipping.`
    );
    return null;
  }

  console.log(
    `\n  Located ${candidates.length}/${totalFrames} frames`
  );

  // Deduplicate points too close together
  const deduplicated = candidates.filter((c, i) => {
    if (i === 0) return true;
    const prev = candidates[i - 1]!;
    const dist = Math.sqrt(
      (c.geo.lat - prev.geo.lat) ** 2 + (c.geo.lng - prev.geo.lng) ** 2
    );
    return dist > 0.00005;
  });

  // Compute headings from geometry
  const points = deduplicated.map((c, i) => {
    let heading = c.heading;
    if (i < deduplicated.length - 1) {
      const next = deduplicated[i + 1]!;
      heading = Math.round(computeHeading(c.geo, next.geo));
    }
    return {
      timestamp_s: c.timestamp_s,
      lat: Math.round(c.geo.lat * 10000) / 10000,
      lng: Math.round(c.geo.lng * 10000) / 10000,
      heading,
    };
  });

  // Build output JSON
  const output = {
    channel: {
      youtube_id: meta.channelId,
      name: meta.channelName,
      slug: meta.channelSlug,
    },
    video: {
      youtube_id: meta.videoId,
      title: meta.title,
      duration_secs: meta.duration,
      thumbnail_url: `https://img.youtube.com/vi/${meta.videoId}/hqdefault.jpg`,
    },
    points,
    _auto_stamper: {
      generated_at: new Date().toISOString(),
      source_url: url,
      interval_s: interval,
      frames_analyzed: totalFrames,
      locations_found: candidates.length,
      points_after_dedup: points.length,
      confidence_breakdown: {
        high: candidates.filter((c) => c.vision.confidence === "high").length,
        medium: candidates.filter((c) => c.vision.confidence === "medium")
          .length,
        low: candidates.filter((c) => c.vision.confidence === "low").length,
      },
    },
  };

  const slug = meta.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = resolve(OUTPUT_DIR, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  const cb = output._auto_stamper.confidence_breakdown;
  console.log(`\n  Saved: ${outPath}`);
  console.log(
    `  ${points.length} waypoints (${cb.high}H ${cb.medium}M ${cb.low}L)`
  );

  return outPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function main() {
  console.log("=== RoamNY Auto-Stamper ===");
  console.log(`Gemini: gemini-2.0-flash | Geocoder: Mapbox`);

  const cli = parseArgs();

  console.log(`\nVideos to process: ${cli.urls.length}`);
  console.log(`Frame interval: ${cli.interval}s`);

  const results: { url: string; output: string | null }[] = [];

  for (let i = 0; i < cli.urls.length; i++) {
    const url = cli.urls[i]!;
    console.log(
      `\n[${"#".repeat(1)} Video ${i + 1}/${cli.urls.length}]`
    );

    const output = await processVideo(url, cli.interval, cli.keepVideo);
    results.push({ url, output });
  }

  // Clean up downloads dir if empty
  if (
    existsSync(DOWNLOADS_DIR) &&
    readdirSync(DOWNLOADS_DIR).length === 0
  ) {
    rmSync(DOWNLOADS_DIR, { recursive: true });
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log("BATCH COMPLETE");
  console.log("=".repeat(70));

  const succeeded = results.filter((r) => r.output);
  const failed = results.filter((r) => !r.output);

  console.log(`  ${succeeded.length}/${results.length} videos processed\n`);

  for (const r of succeeded) {
    console.log(`  OK  ${r.output}`);
  }
  for (const r of failed) {
    console.log(`  FAIL  ${r.url}`);
  }

  if (succeeded.length > 0) {
    console.log(`\nNext steps:`);
    console.log(`  1. Review the JSONs in data/seed/routes/`);
    console.log(`  2. pnpm db:seed   (from repo root)`);
    console.log(`  3. pnpm dev       (start the app)`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
