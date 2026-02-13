import type { FastifyInstance } from "fastify";
import { findNearbyVideos } from "../services/spatial-query.js";

export async function videosRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      lat: string;
      lng: string;
      radius_m?: string;
      limit?: string;
    };
  }>("/api/videos/near", {
    schema: {
      querystring: {
        type: "object",
        required: ["lat", "lng"],
        properties: {
          lat: { type: "string" },
          lng: { type: "string" },
          radius_m: { type: "string" },
          limit: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      const lat = parseFloat(request.query.lat);
      const lng = parseFloat(request.query.lng);
      const radiusM = parseFloat(request.query.radius_m ?? "200");
      const limit = parseInt(request.query.limit ?? "5", 10);

      if (isNaN(lat) || isNaN(lng)) {
        return reply.status(400).send({ error: "Invalid lat/lng" });
      }

      if (lat < 40.4 || lat > 41.0 || lng < -74.3 || lng > -73.7) {
        return reply
          .status(400)
          .send({ error: "Coordinates outside NYC area" });
      }

      const videos = await findNearbyVideos(lat, lng, radiusM, limit);
      return videos;
    },
  });
}
