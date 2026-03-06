import type { SongRequest } from "@song-queue/shared";

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix ms — when the access token expires */
  expiresAt: number;
}

interface Store {
  tokens: SpotifyTokens | null;
  /** In-memory history of all song requests this session */
  queue: SongRequest[];
}

export const store: Store = {
  tokens: null,
  queue: [],
};
