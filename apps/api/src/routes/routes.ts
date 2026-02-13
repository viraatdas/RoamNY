import type { FastifyInstance } from "fastify";
import { getVideoRoute } from "../services/spatial-query.js";

export async function routesRoutes(app: FastifyInstance) {
  app.get<{
    Params: { videoId: string };
  }>("/api/routes/:videoId", {
    schema: {
      params: {
        type: "object",
        required: ["videoId"],
        properties: {
          videoId: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const videoId = parseInt(request.params.videoId, 10);

      if (isNaN(videoId)) {
        return reply.status(400).send({ error: "Invalid video ID" });
      }

      const route = await getVideoRoute(videoId);

      if (!route) {
        return reply.status(404).send({ error: "Route not found" });
      }

      return route;
    },
  });
}
