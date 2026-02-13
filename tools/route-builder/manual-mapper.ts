/**
 * Route Builder CLI Tool
 *
 * Interactive tool for mapping YouTube walking tour timestamps to coordinates.
 *
 * Usage:
 *   pnpm start
 *
 * Workflow:
 *   1. Enter video metadata (YouTube ID, title, channel info)
 *   2. Play the video at youtube.com alongside a map
 *   3. At key waypoints, enter the timestamp and click coordinates
 *   4. Export as a seed JSON file
 */

import * as readline from "readline";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RoutePoint {
  timestamp_s: number;
  lat: number;
  lng: number;
  heading: number;
}

interface VideoMeta {
  youtube_id: string;
  title: string;
  duration_secs: number;
  channel_youtube_id: string;
  channel_name: string;
  channel_slug: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("=== RoamNY Route Builder ===\n");
  console.log("This tool helps you map video timestamps to map coordinates.\n");

  // Collect video metadata
  const youtube_id = await ask("YouTube video ID: ");
  const title = await ask("Video title: ");
  const duration_secs = parseInt(await ask("Duration (seconds): "), 10);
  const channel_youtube_id = await ask("Channel YouTube ID: ");
  const channel_name = await ask("Channel name: ");
  const channel_slug = await ask("Channel slug: ");

  const meta: VideoMeta = {
    youtube_id,
    title,
    duration_secs,
    channel_youtube_id,
    channel_name,
    channel_slug,
  };

  console.log(
    "\nNow enter waypoints. For each point, enter timestamp, lat, lng, heading."
  );
  console.log('Type "done" when finished.\n');

  const points: RoutePoint[] = [];

  while (true) {
    const input = await ask(
      `Point ${points.length + 1} (timestamp_s lat lng heading) or "done": `
    );

    if (input.trim().toLowerCase() === "done") break;

    const parts = input.trim().split(/\s+/);
    if (parts.length < 3) {
      console.log("  Need at least: timestamp_s lat lng");
      continue;
    }

    const timestamp_s = parseFloat(parts[0]!);
    const lat = parseFloat(parts[1]!);
    const lng = parseFloat(parts[2]!);
    const heading = parts[3] ? parseFloat(parts[3]) : 0;

    if (isNaN(timestamp_s) || isNaN(lat) || isNaN(lng)) {
      console.log("  Invalid numbers, try again.");
      continue;
    }

    points.push({ timestamp_s, lat, lng, heading });
    console.log(`  ✓ Added point at ${lat}, ${lng} @ ${timestamp_s}s`);
  }

  if (points.length === 0) {
    console.log("No points entered, exiting.");
    rl.close();
    return;
  }

  // Build output
  const output = {
    channel: {
      youtube_id: meta.channel_youtube_id,
      name: meta.channel_name,
      slug: meta.channel_slug,
    },
    video: {
      youtube_id: meta.youtube_id,
      title: meta.title,
      duration_secs: meta.duration_secs,
      thumbnail_url: `https://img.youtube.com/vi/${meta.youtube_id}/hqdefault.jpg`,
    },
    points,
  };

  const slug = meta.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outPath = resolve(
    __dirname,
    `../../data/seed/routes/${slug}.json`
  );

  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Saved to ${outPath}`);
  console.log(`  ${points.length} points mapped`);

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
