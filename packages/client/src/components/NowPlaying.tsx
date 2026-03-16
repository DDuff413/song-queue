import { useEffect, useRef, useState } from "react";

import type { NowPlayingTrack } from "@song-queue/shared";
import { skipTrack } from "../api.js";

interface NowPlayingProps {
  track: NowPlayingTrack | null;
  authenticated: boolean;
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function NowPlaying({ track, authenticated }: NowPlayingProps) {
  const [skipping, setSkipping] = useState(false);

  async function handleSkip() {
    setSkipping(true);
    try {
      await skipTrack();
    } finally {
      setSkipping(false);
    }
  }
  // Interpolate progress locally between SSE pushes for a smooth progress bar
  const [progressMs, setProgressMs] = useState(track?.progressMs ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Sync from SSE update
    setProgressMs(track?.progressMs ?? 0);

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (track?.isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgressMs((prev) => Math.min(prev + 1000, track.durationMs));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [track]);

  if (!track) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4 mb-6">
        <div className="h-14 w-14 flex-shrink-0 rounded-md bg-white/10" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
            Now Playing
          </p>
          <p className="text-white/50 text-sm">Nothing playing right now</p>
        </div>
      </div>
    );
  }

  const pct = Math.min((progressMs / track.durationMs) * 100, 100);

  return (
    <div className="flex flex-col rounded-xl bg-white/5 p-4 mb-6">
      <div className="flex items-center gap-4">
        <img
          src={track.albumArt}
          alt={track.title}
          className="h-16 w-16 flex-shrink-0 rounded-md object-cover shadow-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-1">
            {track.isPlaying ? "Now Playing" : "Paused"}
          </p>
          <p className="font-semibold text-white truncate">{track.title}</p>
          <p className="text-sm text-white/60 truncate">{track.artist}</p>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-white/40 tabular-nums w-9 text-right">
              {formatMs(progressMs)}
            </span>
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-400 transition-all duration-1000 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-white/40 tabular-nums w-9">
              {formatMs(track.durationMs)}
            </span>
          </div>
        </div>
        {authenticated && (
          <button
            onClick={handleSkip}
            disabled={skipping}
            className="hidden sm:block ml-2 flex-shrink-0 rounded-lg bg-white/10 px-3 py-1.5
                       text-xs font-medium text-white/70 hover:bg-white/20 hover:text-white
                       transition disabled:opacity-40"
          >
            {skipping ? "…" : "Skip"}
          </button>
        )}
      </div>
      {authenticated && (
        <button
          onClick={handleSkip}
          disabled={skipping}
          className="sm:hidden mt-3 w-full rounded-lg bg-white/10 py-2 text-xs font-medium
                     text-white/70 hover:bg-white/20 hover:text-white transition disabled:opacity-40"
        >
          {skipping ? "…" : "Skip"}
        </button>
      )}
    </div>
  );
}
