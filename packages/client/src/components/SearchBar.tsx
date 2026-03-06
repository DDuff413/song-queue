import { addToQueue, searchTracks } from "../api.js";
import { useEffect, useRef, useState } from "react";

import type { TrackResult } from "@song-queue/shared";

const NAME_KEY = "song-queue:name";

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SearchBarProps {
  authenticated: boolean;
}

export function SearchBar({ authenticated }: SearchBarProps) {
  const [name, setName] = useState<string>(
    () => localStorage.getItem(NAME_KEY) ?? "",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null); // spotifyTrackId being added
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist name in localStorage
  const handleNameChange = (val: string) => {
    setName(val);
    localStorage.setItem(NAME_KEY, val);
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || !authenticated) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const tracks = await searchTracks(query.trim());
        setResults(tracks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, authenticated]);

  // Close results when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = async (track: TrackResult) => {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name first");
      return;
    }
    setAdding(track.spotifyTrackId);
    try {
      await addToQueue({
        spotifyTrackId: track.spotifyTrackId,
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt,
        requestedBy: name.trim(),
      });
      setAdded((prev) => new Set(prev).add(track.spotifyTrackId));
      setQuery("");
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add song");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div ref={containerRef} className="mb-6">
      {/* Name field */}
      <div className="mb-3">
        <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Enter your name…"
          maxLength={40}
          className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30
                     outline-none focus:ring-2 focus:ring-green-500 transition"
        />
      </div>

      {/* Search field */}
      <div className="relative">
        <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">
          Search for a song
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              authenticated
                ? "Search Spotify…"
                : "Waiting for host to connect Spotify…"
            }
            disabled={!authenticated}
            className="w-full rounded-lg bg-white/10 px-4 py-2.5 pr-10 text-sm text-white
                       placeholder-white/30 outline-none focus:ring-2 focus:ring-green-500
                       disabled:opacity-40 transition"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs animate-pulse">
              ...
            </span>
          )}
        </div>

        {/* Results dropdown */}
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-xl bg-gray-800 border border-white/10 shadow-xl overflow-hidden">
            {results.map((track) => {
              const isAdded = added.has(track.spotifyTrackId);
              const isAdding = adding === track.spotifyTrackId;
              return (
                <li key={track.spotifyTrackId}>
                  <button
                    onClick={() => handleAdd(track)}
                    disabled={isAdding || isAdded}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left
                               hover:bg-white/10 transition disabled:opacity-60"
                  >
                    <img
                      src={track.albumArt}
                      alt={track.title}
                      className="h-9 w-9 flex-shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-white/50 truncate">
                        {track.artist}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-white/30 tabular-nums">
                      {isAdding ? (
                        <span className="text-green-400 animate-pulse">
                          Adding…
                        </span>
                      ) : isAdded ? (
                        <span className="text-green-400">✓ Added</span>
                      ) : (
                        formatMs(track.durationMs)
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
