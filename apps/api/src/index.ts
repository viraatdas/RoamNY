import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import "dotenv/config";
import { videosRoutes } from "./routes/videos.js";
import { routesRoutes } from "./routes/routes.js";
import { coverageRoutes } from "./routes/coverage.js";

const app = Fastify({
  logger: true,
});

async function start() {
  // CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  // Routes
  await app.register(videosRoutes);
  await app.register(routesRoutes);
  await app.register(coverageRoutes);

  const port = parseInt(process.env.PORT || "3001", 10);
  const host = process.env.HOST || "0.0.0.0";

  await app.listen({ port, host });
  console.log(`API server listening on ${host}:${port}`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
