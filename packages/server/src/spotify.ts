import type { NowPlayingTrack, TrackResult } from "@song-queue/shared";

import { store } from "./store.js";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

function basicAuth(): string {
  const credentials = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

async function refreshAccessToken(): Promise<void> {
  if (!store.tokens) throw new Error("No refresh token available");

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: store.tokens.refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  store.tokens = {
    accessToken: data.access_token,
    // Spotify may rotate the refresh token; fall back to the existing one
    refreshToken: data.refresh_token ?? store.tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function getAccessToken(): Promise<string> {
  if (!store.tokens) throw new Error("Not authenticated with Spotify");
  // Proactively refresh 60 seconds before expiry
  if (Date.now() > store.tokens.expiresAt - 60_000) {
    await refreshAccessToken();
  }
  return store.tokens.accessToken;
}

export async function exchangeCode(code: string): Promise<void> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Code exchange failed: ${err}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  store.tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function searchTracks(query: string): Promise<TrackResult[]> {
  const token = await getAccessToken();
  const url = new URL(`${SPOTIFY_API}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "8");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Spotify search failed");

  const data = (await res.json()) as {
    tracks: { items: SpotifyTrackItem[] };
  };

  return data.tracks.items.map((item) => ({
    spotifyTrackId: item.id,
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    albumArt: item.album.images[1]?.url ?? item.album.images[0]?.url ?? "",
    durationMs: item.duration_ms,
  }));
}

export async function addToQueue(spotifyTrackId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${SPOTIFY_API}/me/player/queue?uri=spotify:track:${spotifyTrackId}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to add track to Spotify queue: ${err}`);
  }
}

export async function getNowPlaying(): Promise<NowPlayingTrack | null> {
  const token = await getAccessToken();
  const res = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 204 = nothing playing
  if (res.status === 204) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as SpotifyCurrentlyPlaying | null;
  if (!data?.item) return null;

  return {
    spotifyTrackId: data.item.id,
    title: data.item.name,
    artist: data.item.artists.map((a) => a.name).join(", "),
    albumArt:
      data.item.album.images[1]?.url ?? data.item.album.images[0]?.url ?? "",
    durationMs: data.item.duration_ms,
    progressMs: data.progress_ms ?? 0,
    isPlaying: data.is_playing,
  };
}

export function isAuthenticated(): boolean {
  return store.tokens !== null;
}

// ---- Spotify response shape helpers ----

interface SpotifyImage {
  url: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyTrackItem {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: { images: SpotifyImage[] };
}

interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrackItem | null;
}
