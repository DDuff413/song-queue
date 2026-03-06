# Copilot Instructions

## Project Overview

`song-queue` is a party/event app where guests can request songs to be played on Spotify. The host runs the app, guests submit requests (e.g., via a shared link on their phones), and the host plays them through their Spotify account.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Backend**: Express or Fastify (TBD) — REST API for queue management and Spotify OAuth
- **Frontend**: React (TypeScript)
- **Spotify**: Spotify Web API — track search (`GET /v1/search`) and add to queue (`POST /v1/me/player/queue`)
- **Storage**: None — Spotify's queue is the source of truth; an in-memory array on the server tracks the session's request history (lost on restart, which is fine)

## Repository Structure

Monorepo using npm workspaces. Each workspace has its own `package.json`; the root `package.json` declares the workspaces and shared dev scripts.

```
package.json          # root — npm workspaces, shared scripts
packages/
  server/             # Express/Fastify API, Spotify OAuth, queue logic
  client/             # React guest UI (search + request a song) and host UI
  shared/             # Shared TypeScript types imported by both server and client
```

## Key Concepts

- **Core flow**: Guest searches Spotify (via server proxy) → selects a track → server calls `POST /v1/me/player/queue` to add it to the host's active Spotify playback queue.
- **Request history**: In-memory list on the server of songs requested this session — used to display a "songs requested so far" view. Not persisted.
- **SongRequest**: `{ id, spotifyTrackId, title, artist, albumArt, requestedBy, requestedAt }`
- **Host vs Guest**: Host authenticates with Spotify (OAuth) once; guests submit requests without auth (name/nickname only).
- **Spotify OAuth flow**: Server handles OAuth 2.0 authorization code flow; access token + refresh token stored in server memory, never sent to the browser.

## Developer Workflows

```bash
# Install all dependencies (root + workspaces if monorepo)
npm install

# Start dev server (backend + frontend with hot reload)
npm run dev

# Run tests
npm test

# Environment variables required
# SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI
# Copy .env.example to .env and fill in values
```

## Conventions

- Shared TypeScript types live in `packages/shared/` — import from there in both client and server; never duplicate type definitions.
- All Spotify API calls go through the server (`packages/server/`) — never expose the client secret, access token, or refresh token to the browser.
- The server exposes a small REST API: search proxy, add-to-queue, and request history endpoints.
- [TODO: add more patterns once code exists]
