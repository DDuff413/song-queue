import { addClient, broadcastQueue } from "../sse.js";
import { addToQueue, isAuthenticated, searchTracks } from "../spotify.js";

import type { FastifyInstance } from "fastify";
import type { SongRequest } from "@song-queue/shared";
import { randomUUID } from "node:crypto";
import { store } from "../store.js";

interface SearchQuery {
  q: string;
}

interface QueueBody {
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArt: string;
  requestedBy: string;
}

export async function apiRoutes(fastify: FastifyInstance): Promise<void> {
  // ---------- Search ----------
  fastify.get<{ Querystring: SearchQuery }>(
    "/api/search",
    async (request, reply) => {
      if (!isAuthenticated()) {
        return reply
          .status(401)
          .send({ error: "Host has not connected Spotify yet" });
      }
      const { q } = request.query;
      if (!q?.trim()) {
        return reply.status(400).send({ error: "Missing search query" });
      }
      const tracks = await searchTracks(q.trim());
      return { tracks };
    },
  );

  // ---------- Add to queue ----------
  fastify.post<{ Body: QueueBody }>("/api/queue", async (request, reply) => {
    if (!isAuthenticated()) {
      return reply
        .status(401)
        .send({ error: "Host has not connected Spotify yet" });
    }

    const { spotifyTrackId, title, artist, albumArt, requestedBy } =
      request.body;

    if (!spotifyTrackId || !requestedBy?.trim()) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    await addToQueue(spotifyTrackId);

    const entry: SongRequest = {
      id: randomUUID(),
      spotifyTrackId,
      title,
      artist,
      albumArt,
      requestedBy: requestedBy.trim(),
      requestedAt: new Date().toISOString(),
    };

    store.queue.push(entry);
    broadcastQueue(store.queue);

    return { ok: true, entry };
  });

  // ---------- Get queue (REST fallback) ----------
  fastify.get("/api/queue", async () => {
    return { queue: store.queue };
  });

  // ---------- SSE stream ----------
  fastify.get("/api/stream", (request, reply) => {
    reply.hijack();

    const res = reply.raw;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send current state immediately on connect
    res.write(`event: queue\ndata: ${JSON.stringify(store.queue)}\n\n`);
    res.write(
      `event: status\ndata: ${JSON.stringify({ authenticated: isAuthenticated() })}\n\n`,
    );

    addClient(res);

    // Keep-alive ping every 25 seconds (proxies typically close after 30s of silence)
    const ping = setInterval(() => {
      if (!res.writableEnded) {
        res.write(": ping\n\n");
      } else {
        clearInterval(ping);
      }
    }, 25_000);

    request.raw.on("close", () => clearInterval(ping));
  });
}
