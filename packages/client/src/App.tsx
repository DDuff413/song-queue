import type { NowPlayingTrack, SongRequest } from "@song-queue/shared";

import { NowPlaying } from "./components/NowPlaying.js";
import { QrCode } from "./components/QrCode.js";
import { QueueList } from "./components/QueueList.js";
import { SearchBar } from "./components/SearchBar.js";
import { useSSE } from "./hooks/useSSE.js";
import { useState } from "react";

function App() {
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingTrack | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useSSE({
    onQueue: setQueue,
    onNowPlaying: setNowPlaying,
    onStatus: ({ authenticated }) => setAuthenticated(authenticated),
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Host auth banner */}
        {!authenticated && (
          <a
            href="/auth/login"
            className="mb-6 flex items-center justify-between rounded-xl bg-amber-500/10
                       border border-amber-500/20 px-4 py-3 text-sm text-amber-300
                       hover:bg-amber-500/20 transition"
          >
            <span>
              <strong>Host:</strong> Connect Spotify to enable song requests
            </span>
            <span className="font-semibold">Connect →</span>
          </a>
        )}

        {/* App header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">🎵 Song Queue</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Search for a song and add it to the queue
          </p>
        </header>

        {/* Now playing — full width */}
        <NowPlaying track={nowPlaying} />

        {/* Search — full width */}
        <SearchBar authenticated={authenticated} />

        {/*
          Layout:
          • Mobile  → queue stacked above QR code  (flex-col)
          • Tablet+ → queue beside QR code         (flex-row)
        */}
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <QueueList queue={queue} />
          </div>
          <div className="md:w-56 flex-shrink-0 flex md:justify-center">
            <QrCode />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
