# Copilot Instructions

## Project Overview

`song-queue` is a party/event app where guests can request songs to be played on Spotify. The host runs the app, guests submit requests via a shared URL/QR code on their phones, and the host plays them through their Spotify account.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Backend**: Fastify — REST API for queue management, Spotify OAuth, SSE broadcaster
- **Frontend**: React (TypeScript) + Vite + Tailwind CSS
- **Real-time**: Server-Sent Events (SSE) — server pushes queue, now-playing, and auth status updates to all clients
- **Spotify**: Spotify Web API — `GET /v1/search`, `POST /v1/me/player/queue`, `POST /v1/me/player/next`, `GET /v1/me/player`
- **Storage**: In-memory only — tokens and request history are lost on restart (intentional for a party app)
- **Deployment**: Railway (persistent Node process — required for SSE and in-memory state)

## Repository Structure

Monorepo using npm workspaces.

```
package.json           # root — npm workspaces, shared scripts
railway.toml           # Railway deployment config
packages/
  server/              # Fastify API, Spotify OAuth, queue logic, SSE broadcaster
    src/
      index.ts         # Server entry point, Spotify poll loop, static file serving
      spotify.ts       # Spotify API calls (search, addToQueue, skipTrack, getNowPlaying)
      sse.ts           # SSE client registry, broadcast helpers, lastNowPlaying state
      store.ts         # In-memory store (tokens, request queue)
      routes/
        api.ts         # /api/search, /api/queue, /api/skip, /api/stream (SSE)
        auth.ts        # /auth/login, /auth/callback, /auth/status
  client/              # React UI — guest song search + host controls
    src/
      api.ts           # Typed fetch wrappers (searchTracks, addToQueue, skipTrack)
      App.tsx          # Root component, SSE state, layout
      components/
        NowPlaying.tsx  # Now-playing card with progress bar, requester name, skip button
        QueueList.tsx   # Requested songs list, "Up next" highlight
        SearchBar.tsx   # Debounced search, name input (optional), add-to-queue
        QrCode.tsx      # QR code pointing to window.location.origin
      hooks/
        useSSE.ts       # Persistent SSE connection, typed event handlers
  shared/              # TypeScript types imported by both client and server
    src/types.ts       # SongRequest, TrackResult, NowPlayingTrack
```

## Key Concepts

- **Core flow**: Guest searches Spotify (via server proxy) → selects a track → server calls `POST /v1/me/player/queue` → song added to host's Spotify queue → all SSE clients receive updated queue instantly.
- **Real-time**: Every open browser tab holds a persistent SSE connection (`/api/stream`). Queue, now-playing, and auth status changes are pushed immediately to all clients. New connections receive the full current state on connect.
- **Now-playing poll**: Server polls `GET /v1/me/player` every 3 seconds. Broadcasts on track change, play/pause change, or detected seek (>3s deviation from expected progress). `lastNowPlaying` is stored in `sse.ts` (not `store.ts`) to avoid module singleton issues with `tsx watch`.
- **Played songs auto-removed**: When the now-playing track changes, the server checks if the new track is in the request queue. If so, it removes it and broadcasts the updated queue before broadcasting the new now-playing state.
- **requestedBy on NowPlayingTrack**: When a queued song transitions to now-playing, `requestedBy` is captured from the queue entry and attached to the broadcast. This persists after the song is removed from the queue — used for the skip confirmation modal and the "Requested by" label.
- **Host vs Guest**: Host authenticates with Spotify (OAuth) once via `/auth/login`. Only the host account needs Spotify Premium. Guests submit requests with an optional name (generates a random `Adjective Animal` name if blank using `unique-names-generator`).
- **Skip confirmation**: If the host skips a song that was requested through the app, a modal shows "[Name] picked this one. They're probably watching." — skipping songs from the host's own playlist fires immediately with no modal.
- **Spotify OAuth flow**: Server handles OAuth 2.0 authorization code flow. Tokens stored in `store.ts` server memory, never sent to the browser. Token is refreshed proactively 60s before expiry.

## Developer Workflows

```bash
# Install all dependencies
npm install

# Start dev server (Fastify on :3001 + Vite on :5173, hot reload)
npm run dev

# Build for production (client then server)
npm run build

# Start production server (serves built client as static files)
npm start

# Environment variables required (copy .env.example to .env)
# SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI, APP_URL
```

## Conventions

- Shared TypeScript types live in `packages/shared/src/types.ts` — import from `@song-queue/shared` in both client and server; never duplicate.
- All Spotify API calls go through the server — never expose client secret, access token, or refresh token to the browser.
- `lastNowPlaying` lives in `sse.ts`, not `store.ts` — avoids module cache splitting under `tsx watch` where `index.ts` and `routes/api.ts` can get different `store` instances.
- The server serves the built React client as static files in production (`@fastify/static` on `packages/client/dist`). A catch-all 404 handler returns `index.html` for SPA routing.
- Input validation: `spotifyTrackId` is validated against `/^[A-Za-z0-9]{1,32}$/` before use in URLs. `requestedBy` is capped at 40 chars server-side.
- After a Railway redeploy, tokens are wiped — visit `/auth/login` again before the event.
