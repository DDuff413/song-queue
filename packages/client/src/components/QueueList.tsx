import type { SongRequest } from "@song-queue/shared";

interface QueueListProps {
  queue: SongRequest[];
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  return `${diffMin} mins ago`;
}

export function QueueList({ queue }: QueueListProps) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
        Song Queue
        {queue.length > 0 && (
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-white/60">
            {queue.length}
          </span>
        )}
      </h2>

      {queue.length === 0 ? (
        <div className="rounded-xl bg-white/5 p-6 text-center text-white/40 text-sm">
          No songs requested yet — be the first!
        </div>
      ) : (
        <ul className="space-y-2">
          {[...queue].reverse().map((song) => (
            <li
              key={song.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
            >
              <img
                src={song.albumArt}
                alt={song.title}
                className="h-10 w-10 flex-shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {song.title}
                </p>
                <p className="text-xs text-white/50 truncate">{song.artist}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-white/60">{song.requestedBy}</p>
                <p className="text-xs text-white/30">
                  {timeAgo(song.requestedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
