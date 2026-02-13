import type { FastifyInstance } from "fastify";
import { getCoverage } from "../services/spatial-query.js";

let coverageCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 600_000; // 10 minutes

export async function coverageRoutes(app: FastifyInstance) {
  app.get("/api/coverage", async (_request, reply) => {
    const now = Date.now();

    if (coverageCache && now - coverageCache.timestamp < CACHE_TTL_MS) {
      reply.header("X-Cache", "HIT");
      return coverageCache.data;
    }

    const coverage = await getCoverage();

    coverageCache = { data: coverage, timestamp: now };
    reply.header("X-Cache", "MISS");
    return coverage;
  });
}
