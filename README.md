# RoamNY

Drag-to-tour NYC walking video app. Drop a pegman on the map to find YouTube walking tours that pass through that location, synced to an interactive map.

## Architecture

- **Frontend**: Next.js 15 + React 19 + Mapbox GL JS + Tailwind CSS (`apps/web`)
- **Backend**: Fastify API with PostGIS spatial queries (`apps/api`)
- **Monorepo**: Turborepo + pnpm workspaces

## Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Mapbox token and database URL

# Run database migration (requires PostgreSQL + PostGIS)
pnpm db:migrate

# Seed with walking tour data
pnpm db:seed

# Start development servers
pnpm dev
```

Frontend runs on `http://localhost:3000`, API on `http://localhost:3001`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL JS access token |
| `NEXT_PUBLIC_API_URL` | API server URL (default: `http://localhost:3001`) |
| `DATABASE_URL` | PostgreSQL connection string with PostGIS |
| `PORT` | API server port (default: `3001`) |
| `CORS_ORIGIN` | Allowed CORS origin (default: `http://localhost:3000`) |

## Route Builder

Use the CLI tool to map new walking tour videos:

```bash
cd tools/route-builder
pnpm start
```

## Seed Data

5 curated NYC walking tours covering:
- Times Square to Central Park
- SoHo & NoLita
- Brooklyn Bridge to DUMBO
- East Village & Alphabet City
- The High Line
