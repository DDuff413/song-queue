import "dotenv/config";

import {
  broadcastNowPlaying,
  broadcastQueue,
  setLastNowPlaying,
} from "./sse.js";
import { dirname, join } from "node:path";
import { getNowPlaying, isAuthenticated } from "./spotify.js";

import Fastify from "fastify";
import { apiRoutes } from "./routes/api.js";
import { authRoutes } from "./routes/auth.js";
import cors from "@fastify/cors";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import staticFiles from "@fastify/static";
import { store } from "./store.js";

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
const clientDist = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../client/dist",
);
if (existsSync(clientDist)) {
  await fastify.register(staticFiles, { root: clientDist, prefix: "/" });
  // SPA catch-all: non-API/auth routes serve index.html
  fastify.setNotFoundHandler((_req, reply) => {
    reply.sendFile("index.html");
  });
}

// Poll Spotify every 3 seconds and push now-playing updates to all SSE clients
let lastTrackId: string | null | undefined = undefined;
let lastIsPlaying: boolean | undefined = undefined;
let lastProgressMs: number = 0;
let lastPollTime: number = 0;
setInterval(async () => {
  if (!isAuthenticated()) return;
  try {
    const track = await getNowPlaying();
    const now = Date.now();

    // Always keep lastNowPlaying current so new SSE clients get fresh progress
    const newId = track?.spotifyTrackId ?? null;
    const newIsPlaying = track?.isPlaying ?? false;
    const newProgressMs = track?.progressMs ?? 0;

    // Expected progress based on elapsed time since last poll
    const elapsed = now - lastPollTime;
    const expectedProgressMs = lastIsPlaying
      ? lastProgressMs + elapsed
      : lastProgressMs;
    // Seek detected if actual progress diverges by more than 3 seconds from expected
    const seeked =
      lastPollTime > 0 && Math.abs(newProgressMs - expectedProgressMs) > 3_000;

    if (newId !== lastTrackId || newIsPlaying !== lastIsPlaying || seeked) {
      // Remove the now-playing song from the request history when the track changes
      if (newId !== lastTrackId && lastTrackId) {
        const prevIdx = store.queue.findIndex(
          (s) => s.spotifyTrackId === lastTrackId,
        );
        if (prevIdx !== -1) {
          store.queue.splice(prevIdx, 1);
          broadcastQueue(store.queue);
        }
      }
      broadcastNowPlaying(track);
    } else {
      // Update stored state without broadcasting (keeps it fresh for new connects)
      setLastNowPlaying(track);
    }

    lastTrackId = newId;
    lastIsPlaying = newIsPlaying;
    lastProgressMs = newProgressMs;
    lastPollTime = now;
  } catch {
    // Token may be mid-refresh — silently skip this tick
  }
}, 3_000);

const port = parseInt(process.env.PORT ?? "3001", 10);
await fastify.listen({ port, host: "0.0.0.0" });
console.log(`Server listening on http://localhost:${port}`);
