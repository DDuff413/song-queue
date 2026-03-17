# Song Queue

A party app that lets guests request songs to be played on the host's Spotify. Guests scan a QR code, search for a track, optionally enter their name (a random name is generated if they don't), and it gets added to the queue instantly.

## How it works

- The **host** runs the app, connects their Spotify account once via OAuth, and leaves the browser open
- **Guests** scan the QR code shown on screen, open the app on their phone, and request songs
- Requested songs are added directly to the host's active Spotify queue
- When a queued song starts playing it disappears from the queue automatically
- The queue and now-playing track update in real time for everyone via Server-Sent Events
- The host can skip the current track — if it was requested through the app, a confirmation modal shows who requested it

## Tech stack

|           |                                          |
| --------- | ---------------------------------------- |
| Frontend  | Vite + React + TypeScript + Tailwind CSS |
| Backend   | Fastify + TypeScript                     |
| Real-time | Server-Sent Events (SSE)                 |
| Spotify   | Web API — no SDK, plain `fetch`          |
| Monorepo  | npm workspaces                           |
| Deploy    | Railway                                  |

## Project structure

```
packages/
  shared/   — TypeScript types shared between client and server
  server/   — Fastify API, Spotify OAuth, queue logic, SSE broadcaster
  client/   — React guest/host UI
```

## Prerequisites

- Node.js 18+
- A Spotify **Premium** account (required for the add-to-queue and skip APIs)
- A Spotify developer app ([developer.spotify.com/dashboard](https://developer.spotify.com/dashboard))

## Setup

**1. Create a Spotify app**

- Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app
- Under **APIs used**, select **Web API**
- Add `http://127.0.0.1:3001/auth/callback` as a Redirect URI
- Copy your **Client ID** and **Client Secret**

**2. Configure environment variables**

```bash
cp packages/server/.env.example packages/server/.env
```

Fill in [packages/server/.env](packages/server/.env):

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/auth/callback
APP_URL=http://localhost:5173
PORT=3001
```

**3. Install dependencies**

```bash
npm install
```

**4. Start the app**

```bash
npm run dev
```

This starts both the Fastify server (port 3001) and the Vite dev server (port 5173) concurrently.

## Using the app

1. Open `http://localhost:5173`
2. Click the **Connect Spotify** banner and approve access
3. The banner disappears — the app is live
4. Start playing a playlist on Spotify on the host's device
5. Guests scan the QR code or navigate to the app URL and start requesting songs

## Running at an event (LAN)

Guests connect over the same Wi-Fi network. Update `APP_URL` in `.env` to your machine's LAN IP so the QR code points to the right address:

```
APP_URL=http://192.168.1.x:5173
```

Also update Vite to bind to all interfaces so other devices can reach it. In [packages/client/vite.config.ts](packages/client/vite.config.ts), add `host: true` under `server`:

```ts
server: {
  host: true,
  proxy: { ... }
}
```

The OAuth flow (`/auth/login`, `/auth/callback`) only ever runs on the host's machine and always uses `127.0.0.1` — guests never touch it.

## Deploying to Railway

The app is configured for Railway with `railway.toml` at the repo root.

1. Push to GitHub and connect the repo in [railway.app](https://railway.app)
2. Set environment variables in Railway's Variables tab:
   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   SPOTIFY_REDIRECT_URI=https://your-app.up.railway.app/auth/callback
   APP_URL=https://your-app.up.railway.app
   ```
3. Add the Railway callback URL to your Spotify app's Redirect URIs
4. After each deploy, visit `/auth/login` once to reconnect Spotify (tokens are in-memory and cleared on restart)

The server serves the built React client as static files, so a single Railway service handles everything on one URL.

## API endpoints

| Method   | Path             | Description                                                |
| -------- | ---------------- | ---------------------------------------------------------- |
| `GET`    | `/auth/login`    | Redirects host to Spotify OAuth                            |
| `GET`    | `/auth/callback` | OAuth callback, stores tokens                              |
| `GET`    | `/auth/status`   | Returns `{ authenticated: boolean }`                       |
| `GET`    | `/api/search?q=` | Searches Spotify tracks                                    |
| `POST`   | `/api/queue`     | Adds a track to the Spotify queue                          |
| `GET`    | `/api/queue`     | Returns the in-memory request history                      |
| `POST`   | `/api/skip`      | Skips the current track (host only)                        |
| `GET`    | `/api/stream`    | SSE stream — pushes `queue`, `nowPlaying`, `status` events |

## Notes

- The request history is **in-memory only** — it resets when the server restarts, which is intentional
- Songs are removed from the request history automatically when they start playing
- The fallback playlist is handled outside the app: have the host start an appropriate playlist in Spotify before the event; requested songs get queued on top of it
- Adding to the Spotify queue requires the host's Spotify device to be active (something must be playing or paused)
- After a Railway redeploy, tokens are wiped — always re-authenticate via `/auth/login` before the event starts
