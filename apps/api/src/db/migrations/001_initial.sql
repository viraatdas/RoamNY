CREATE EXTENSION IF NOT EXISTS postgis;

-- Walking tour YouTube channels
CREATE TABLE IF NOT EXISTS channels (
    id          SERIAL PRIMARY KEY,
    youtube_id  VARCHAR(64) UNIQUE NOT NULL,
    name        VARCHAR(256) NOT NULL,
    slug        VARCHAR(128) UNIQUE NOT NULL,
    avatar_url  TEXT
);

-- Walking tour videos
CREATE TABLE IF NOT EXISTS videos (
    id              SERIAL PRIMARY KEY,
    youtube_id      VARCHAR(16) UNIQUE NOT NULL,
    channel_id      INTEGER REFERENCES channels(id),
    title           VARCHAR(512) NOT NULL,
    duration_secs   INTEGER NOT NULL,
    thumbnail_url   TEXT,
    route_geom      GEOMETRY(LINESTRING, 4326),
    bbox            GEOMETRY(POLYGON, 4326),
    status          VARCHAR(32) DEFAULT 'active'
);

-- Core mapping: coordinate + timestamp along each route
CREATE TABLE IF NOT EXISTS route_points (
    id          BIGSERIAL PRIMARY KEY,
    video_id    INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    timestamp_s REAL NOT NULL,
    location    GEOMETRY(POINT, 4326) NOT NULL,
    heading     REAL,
    seq_order   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_route_points_location ON route_points USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_route_points_video_id ON route_points(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_bbox ON videos USING GIST(bbox);

-- Pre-computed coverage grid for the heatmap layer
DROP MATERIALIZED VIEW IF EXISTS coverage_cells;
CREATE MATERIALIZED VIEW coverage_cells AS
SELECT
    ST_SnapToGrid(location, 0.001) AS cell_center,
    COUNT(DISTINCT video_id) AS video_count
FROM route_points
GROUP BY ST_SnapToGrid(location, 0.001);
