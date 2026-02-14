# RoamNY

Drag-to-tour NYC walking video app. Drop a pegman (like Google Street View's little person) anywhere on a Mapbox map of NYC to instantly find and play YouTube walking tour videos from that exact location.

## Project Overview

Users drag a pegman figure from a dock onto an interactive map of New York City. When dropped, the app performs a spatial query to find YouTube walking tour videos whose routes pass through that location. The best match starts playing from the exact timestamp where the video passes through the drop point, with a moving dot on the map synced to video playback.

## Architecture

```
Vercel (Next.js frontend)  →  Fly.io (Fastify API)  →  PostgreSQL + PostGIS
```

- **Frontend**: Next.js 15 + React 19 + Mapbox GL JS + Tailwind CSS (deployed on Vercel)
- **Backend**: Fastify API server (deployed on Fly.io)
- **Database**: PostgreSQL with PostGIS extension (Fly.io managed)
- **Monorepo**: Turborepo + pnpm workspaces

## Tech Stack Decisions

- **Mapbox GL JS directly** (not react-map-gl) — for fine-grained control over the pegman drag interaction, pointer events, DOM overlays, and `map.unproject()`
- **Fastify over Express** — better TypeScript support, faster cold starts on Fly.io, built-in schema validation
- **PostGIS over in-memory spatial index** — scales to thousands of videos, `ST_DWithin` with GIST index is <5ms for the core query
- **react-youtube** — wraps YouTube IFrame API for embedded playback with timestamp seeking
- **framer-motion** — pegman drag/drop animations
- **@tanstack/react-query** — data fetching with caching for API calls
- **@turf/nearest-point-on-line** — client-side spatial math for route interpolation

## Project Structure

```
roamny/
├── apps/
│   ├── web/                    # Next.js frontend (Vercel)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   └── page.tsx
│   │       ├── components/
│   │       │   ├── MapView.tsx          # Top-level orchestrator (state machine)
│   │       │   ├── NYCMap.tsx           # Mapbox GL JS map wrapper
│   │       │   ├── Pegman.tsx           # Draggable pegman figure
│   │       │   ├── CoverageLayer.tsx    # Heatmap showing tour coverage
│   │       │   ├── RouteLayer.tsx       # Active route polyline on map
│   │       │   ├── PositionMarker.tsx   # Animated dot tracking video position
│   │       │   ├── VideoPanel.tsx       # Slide-up panel with player + video list
│   │       │   └── YouTubePlayer.tsx    # react-youtube wrapper
│   │       ├── hooks/
│   │       │   ├── usePegmanDrag.ts     # Pegman drag state machine (pointer events)
│   │       │   ├── useVideoSearch.ts    # API fetch on pegman drop
│   │       │   ├── useVideoPlayback.ts  # YouTube player state + time tracking
│   │       │   └── useRouteAnimation.ts # Sync video time → map position
│   │       ├── lib/
│   │       │   ├── api-client.ts        # Typed fetch wrapper for backend API
│   │       │   ├── interpolate-route.ts # Binary search + lerp for position on route
│   │       │   └── constants.ts         # NYC bounds, default center/zoom
│   │       └── types/index.ts
│   │
│   └── api/                    # Fastify backend (Fly.io)
│       └── src/
│           ├── index.ts                 # Server entry point
│           ├── routes/
│           │   ├── videos.ts            # GET /api/videos/near?lat=&lng=
│           │   ├── routes.ts            # GET /api/routes/:videoId
│           │   └── coverage.ts          # GET /api/coverage
│           ├── services/
│           │   └── spatial-query.ts     # PostGIS query builders
│           └── db/
│               ├── client.ts            # pg Pool setup
│               ├── migrations/001_initial.sql
│               └── seed/seed-videos.ts
│
├── tools/
│   └── route-builder/
│       └── manual-mapper.ts     # CLI to map video timestamps → GPS coordinates
│
├── data/seed/routes/            # GeoJSON seed files (one per video)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Database Schema

Three core tables with PostGIS spatial indexes:

- **channels** — YouTube channel metadata (id, youtube_id, name, slug, avatar_url)
- **videos** — Walking tour videos (youtube_id, title, duration_secs, route_geom as LINESTRING, bbox as POLYGON)
- **route_points** — Core mapping table: each row is a GPS coordinate + video timestamp along a walking route (video_id, timestamp_s, location as POINT, heading, seq_order). Spatially indexed with GIST.
- **coverage_cells** — Materialized view snapping route_points to a ~111m grid with video_count per cell, for the heatmap layer.

The key spatial query uses `ST_DWithin` on `route_points.location` to find videos near a dropped coordinate within a radius, returning the nearest timestamp and distance.

## API Endpoints

- `GET /api/videos/near?lat=&lng=&radius_m=200&limit=5` — Find videos passing near a coordinate. Returns video metadata + nearest timestamp + distance.
- `GET /api/routes/:videoId` — Full route as GeoJSON LineString + timestamped point array for map rendering and playback sync.
- `GET /api/coverage` — GeoJSON FeatureCollection of coverage grid cells with video_count for the heatmap. Cached aggressively.

## Core UX: Pegman Drag Interaction

State machine in MapView.tsx:
```
IDLE → DRAGGING → LOADING → PLAYING → BROWSING
```

1. **IDLE**: Pegman sits in a dock (bottom-right of map)
2. **DRAGGING**: User picks up pegman; coverage heatmap fades in showing where tours exist
3. **LOADING**: Pegman dropped on map; API call in flight
4. **PLAYING**: Video playing, route drawn on map, position dot animates synced to video
5. **BROWSING**: User picks a different video from the match list

The pegman is an HTML overlay (not a Mapbox marker) during drag. On drop, `map.unproject([x, y])` converts screen coords to lat/lng. Mobile alternative: long-press on map.

## Video ↔ Map Sync

- Poll `player.getCurrentTime()` at ~4Hz via `requestAnimationFrame`
- Binary search route points array to find surrounding points for current timestamp
- Linear interpolation for smooth lat/lng/heading between points
- Update PositionMarker position on map
- Color route segments differently for "watched" vs "upcoming" portions

## Route Data Pipeline

The core data challenge: mapping YouTube video timestamps to GPS coordinates.

**MVP (Phase 1)**: Manual curation with Route Builder tool
- Watch video, click map at key waypoints to record `{ timestamp, lat, lng }`
- Snap-interpolate between waypoints along street network via Mapbox Directions API
- Export as GeoJSON seed files
- Target: 10-20 curated videos covering major NYC areas
- Sampling density: one point every 5-15 seconds (~200-400 points per hour of video)

**Phase 2**: Semi-automated — parse YouTube chapter markers, geocode location names, interpolate between waypoints

**Phase 3**: GPX import from walking tour creators who use GPS trackers

**Phase 4 (future)**: Vision-based extraction using LLMs to identify street signs/landmarks from video frames

## Seed Data Coverage Areas

Priority neighborhoods for initial video curation:
- Midtown Manhattan (Times Square, 5th Ave, Rockefeller Center)
- Central Park
- Lower Manhattan (Wall Street, Brooklyn Bridge)
- Brooklyn (Williamsburg, DUMBO)
- SoHo, Greenwich Village, Chelsea, East Village
- The High Line

## Environment Variables

```
# Frontend (.env.local on Vercel)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
NEXT_PUBLIC_API_URL=https://api.roamny.app  # or http://localhost:3001

# Backend (.env on Fly.io)
DATABASE_URL=postgres://...
YOUTUBE_API_KEY=AIza...
CORS_ORIGIN=https://roamny.app
PORT=3001
```

## Implementation Steps

1. **Monorepo scaffold** — Turborepo + pnpm workspaces, apps/web (Next.js), apps/api (Fastify)
2. **Map foundation** — Mapbox GL JS in NYCMap.tsx, NYC default bounds
3. **Pegman drag-and-drop** — SVG sprite, usePegmanDrag hook, pointer events, coordinate extraction
4. **Database + API** — PostGIS schema, spatial query endpoints, CORS/rate limiting
5. **Seed data** — Route Builder tool, curate 5 initial videos, seed script
6. **Coverage heatmap** — Fetch coverage GeoJSON, Mapbox heatmap layer, fade on drag
7. **Video player + route visualization** — YouTube player, seek to timestamp, route line, animated position marker
8. **Polish + deploy** — Loading/error states, mobile touch, Vercel + Fly.io deployment

## Development

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start both frontend (3000) and API (3001)
pnpm db:migrate       # Run PostGIS migrations
pnpm db:seed          # Seed walking tour data
```

## Deployment

- Frontend: `vercel` (auto-deploys from main branch)
- Backend: `fly deploy` from `apps/api/` (uses Dockerfile + fly.toml, primary region: ewr/Newark)
- Database: Fly.io managed PostgreSQL with PostGIS enabled
