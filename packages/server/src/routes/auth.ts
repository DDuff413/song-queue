import { exchangeCode, isAuthenticated } from "../spotify.js";

import type { FastifyInstance } from "fastify";
import { broadcastStatus } from "../sse.js";

const SCOPES = [
  "user-read-currently-playing",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/auth/login", async (_request, reply) => {
    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID!);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", process.env.SPOTIFY_REDIRECT_URI!);
    url.searchParams.set("scope", SCOPES);
    return reply.redirect(url.toString());
  });

  fastify.get<{ Querystring: { code?: string; error?: string } }>(
    "/auth/callback",
    async (request, reply) => {
      const { code, error } = request.query;

      if (error ?? !code) {
        return reply.status(400).send({ error: error ?? "No code provided" });
      }

      await exchangeCode(code!);
      broadcastStatus(true);

      const appUrl = process.env.APP_URL ?? "http://localhost:5173";
      return reply.redirect(appUrl);
    },
  );

  fastify.get("/auth/status", async () => {
    return { authenticated: isAuthenticated() };
  });
}
