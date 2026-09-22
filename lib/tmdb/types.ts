export interface Movie {
  id: number | string;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string;
  backdrop_path?: string;
  release_date: string;
  vote_average: number;
  vote_count?: number;
  genres: string[];
  runtime?: number;
  tagline?: string;
  trailer_key?: string; // YouTube video ID
  streaming_providers?: StreamingProvider[];
  director?: string;
  cast?: string[];
  ai_match_reason?: string; // Explanation from the AI why this fits your mood
}

export interface StreamingProvider {
  name: string;
  logo_path?: string;
  type: 'stream' | 'rent' | 'buy';
  watch_url?: string;
}

export interface TasteProfile {
  watched: Movie[];
  loved: Movie[];
  okay: Movie[];
  disliked: Movie[];
  watchlist: Movie[];
  skippedIds: (number | string)[];
  cantRememberIds: (number | string)[];
}

export type DeviceMode = 'auto' | 'mobile' | 'tablet' | 'desktop';

export type AppMode = 'twenty_questions' | 'chat' | 'shelf' | 'taste_library';

export interface WebLLMProgress {
  progress: number; // 0 to 1
  text: string;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string | null;
  usingFallback?: boolean;
}
