import type { TrackResult } from "@song-queue/shared";

export interface QueuePayload {
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArt: string;
  requestedBy: string;
}

export async function searchTracks(query: string): Promise<TrackResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Search failed");
  }
  const data = (await res.json()) as { tracks: TrackResult[] };
  return data.tracks;
}

export async function addToQueue(payload: QueuePayload): Promise<void> {
  const res = await fetch("/api/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to add to queue");
  }
}
