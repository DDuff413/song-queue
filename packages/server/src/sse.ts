import type { NowPlayingTrack, SongRequest } from "@song-queue/shared";

import type { ServerResponse } from "node:http";

/** All currently open SSE response streams */
const clients = new Set<ServerResponse>();

export function addClient(res: ServerResponse): void {
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (!client.writableEnded) {
      client.write(payload);
    }
  }
}

export function broadcastQueue(queue: SongRequest[]): void {
  broadcast("queue", queue);
}

export function broadcastNowPlaying(track: NowPlayingTrack | null): void {
  broadcast("nowPlaying", track);
}

export function broadcastStatus(authenticated: boolean): void {
  broadcast("status", { authenticated });
}
