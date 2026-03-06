import type { NowPlayingTrack, SongRequest } from "@song-queue/shared";
import { useEffect, useRef } from "react";

interface SSEHandlers {
  onQueue?: (queue: SongRequest[]) => void;
  onNowPlaying?: (track: NowPlayingTrack | null) => void;
  onStatus?: (status: { authenticated: boolean }) => void;
}

/**
 * Opens a persistent SSE connection to /api/stream.
 * Handlers are always called with the latest closure values via a ref,
 * so callers don't need to worry about stale state.
 */
export function useSSE(handlers: SSEHandlers): void {
  // Keep the latest handlers in a ref so the event listeners below never go stale
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const es = new EventSource("/api/stream");

    const onQueue = (e: MessageEvent) => {
      try {
        handlersRef.current.onQueue?.(JSON.parse(e.data) as SongRequest[]);
      } catch {}
    };

    const onNowPlaying = (e: MessageEvent) => {
      try {
        handlersRef.current.onNowPlaying?.(
          JSON.parse(e.data) as NowPlayingTrack | null,
        );
      } catch {}
    };

    const onStatus = (e: MessageEvent) => {
      try {
        handlersRef.current.onStatus?.(
          JSON.parse(e.data) as { authenticated: boolean },
        );
      } catch {}
    };

    es.addEventListener("queue", onQueue);
    es.addEventListener("nowPlaying", onNowPlaying);
    es.addEventListener("status", onStatus);

    return () => {
      es.removeEventListener("queue", onQueue);
      es.removeEventListener("nowPlaying", onNowPlaying);
      es.removeEventListener("status", onStatus);
      es.close();
    };
  }, []); // single connection for the lifetime of the app
}
