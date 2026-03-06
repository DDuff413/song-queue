import "dotenv/config";

import { getNowPlaying, isAuthenticated } from "./spotify.js";

import Fastify from "fastify";
import { apiRoutes } from "./routes/api.js";
import { authRoutes } from "./routes/auth.js";
import { broadcastNowPlaying } from "./sse.js";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

const fastify = Fastify({ logger: { level: "info" } });

// Allow requests from the Vite dev server and the configured app URL
await fastify.register(cors, {
  origin: [
    "http://localhost:5173",
    process.env.APP_URL ?? "http://localhost:5173",
  ],
  credentials: true,
});

await fastify.register(authRoutes);
await fastify.register(apiRoutes);

// Serve the built React client when available (production / tunnel mode)
const clientDist = join(dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (existsSync(clientDist)) {
  await fastify.register(staticFiles, { root: clientDist, prefix: "/" });
  // SPA catch-all: non-API/auth routes serve index.html
  fastify.setNotFoundHandler((_req, reply) => {
    reply.sendFile("index.html");
  });
}

// Poll Spotify every 3 seconds and push now-playing updates to all SSE clients
let lastTrackId: string | null | undefined = undefined;
setInterval(async () => {
  if (!isAuthenticated()) return;
  try {
    const track = await getNowPlaying();
    // Only broadcast if something changed (avoids noisy identical pushes)
    const newId = track?.spotifyTrackId ?? null;
    if (newId !== lastTrackId) {
      lastTrackId = newId;
      broadcastNowPlaying(track);
    }
  } catch {
    // Token may be mid-refresh — silently skip this tick
  }
}, 3_000);

const port = parseInt(process.env.PORT ?? "3001", 10);
await fastify.listen({ port, host: "0.0.0.0" });
console.log(`Server listening on http://localhost:${port}`);
