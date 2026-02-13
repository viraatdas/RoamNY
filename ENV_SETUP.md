# RoamNY Environment Keys

## Required for Auto-Stamper (VM)

| Key | Where to get it | Used by |
|-----|----------------|---------|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | Gemini Vision (frame analysis) |
| `MAPBOX_TOKEN` | https://account.mapbox.com/access-tokens/ | Geocoding API (location → lat/lng) |

## Required for Frontend

| Key | Where to get it | Used by |
|-----|----------------|---------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | https://account.mapbox.com/access-tokens/ | Mapbox GL JS map rendering |
| `NEXT_PUBLIC_API_URL` | Your Fly.io deploy URL or `http://localhost:3001` | API server connection |

## Required for Backend API

| Key | Where to get it | Used by |
|-----|----------------|---------|
| `DATABASE_URL` | Your PostgreSQL+PostGIS connection string | Fastify API → PostGIS |
| `PORT` | Default: `3001` | Fastify listen port |
| `CORS_ORIGIN` | Your Vercel deploy URL or `http://localhost:3000` | CORS allowlist |

## .env template (copy to repo root)

```env
# Auto-Stamper
GEMINI_API_KEY=
MAPBOX_TOKEN=

# Frontend
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend
DATABASE_URL=postgresql://roamny:roamny@localhost:5432/roamny
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## Free tier notes

- **Gemini API**: Free tier gives 15 RPM / 1M tokens per day — enough for ~5 videos at 30s intervals
- **Mapbox**: 100,000 free geocoding requests/month — way more than needed
- **Mapbox GL JS**: 50,000 free map loads/month
