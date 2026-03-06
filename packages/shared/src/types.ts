export interface SongRequest {
  id: string;
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArt: string;
  requestedBy: string;
  requestedAt: string; // ISO 8601
}

export interface TrackResult {
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArt: string;
  durationMs: number;
}

export interface NowPlayingTrack {
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArt: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
}
