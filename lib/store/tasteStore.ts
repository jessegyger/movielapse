'use client';

import { useState, useEffect } from 'react';
import { Movie, TasteProfile, DeviceMode, AppMode } from '../tmdb/types';
import { tmdb } from '../tmdb/client';

const STORAGE_KEY = 'movielapse_taste_profile_v3';
const API_KEY_STORAGE = 'movielapse_tmdb_api_key';
const DEVICE_MODE_KEY = 'movielapse_device_mode';

export interface TasteState {
  watched: Movie[];
  loved: Movie[];
  okay: Movie[];
  disliked: Movie[];
  watchlist: Movie[];
  skippedIds: (string | number)[];
  cantRememberIds: (string | number)[];
  deviceMode: DeviceMode;
  appMode: AppMode;
  tmdbApiKey: string;
  isInitialized: boolean;
}

export function useTasteStore() {
  const [state, setState] = useState<TasteState>({
    watched: [],
    loved: [],
    okay: [],
    disliked: [],
    watchlist: [],
    skippedIds: [],
    cantRememberIds: [],
    deviceMode: 'auto',
    appMode: 'shelf',
    tmdbApiKey: '',
    isInitialized: false,
  });

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const savedProfile =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('movielapse_taste_profile_v2') ||
        localStorage.getItem('movielapse_taste_profile_v1');
      const savedKey = localStorage.getItem(API_KEY_STORAGE) || '';
      const savedDevice = (localStorage.getItem(DEVICE_MODE_KEY) as DeviceMode) || 'auto';

      let parsed: Partial<TasteProfile> = {};
      if (savedProfile) {
        parsed = JSON.parse(savedProfile);
      }

      if (savedKey) {
        tmdb.setApiKey(savedKey);
      }

      setState((prev) => ({
        ...prev,
        watched: parsed.watched || parsed.loved || [],
        loved: parsed.loved || [],
        okay: parsed.okay || [],
        disliked: parsed.disliked || [],
        watchlist: parsed.watchlist || [],
        skippedIds: parsed.skippedIds || [],
        cantRememberIds: parsed.cantRememberIds || [],
        deviceMode: savedDevice,
        tmdbApiKey: savedKey,
        isInitialized: true,
      }));
    } catch (e) {
      console.warn('Could not restore taste profile from localStorage', e);
      setState((prev) => ({ ...prev, isInitialized: true }));
    }
  }, []);

  // Save changes to LocalStorage
  const persist = (updated: Partial<TasteState>) => {
    setState((current) => {
      const next = { ...current, ...updated };
      try {
        const toSave: TasteProfile = {
          watched: next.watched,
          loved: next.loved,
          okay: next.okay,
          disliked: next.disliked,
          watchlist: next.watchlist,
          skippedIds: next.skippedIds,
          cantRememberIds: next.cantRememberIds,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        if (updated.deviceMode) {
          localStorage.setItem(DEVICE_MODE_KEY, updated.deviceMode);
        }
        if (updated.tmdbApiKey !== undefined) {
          localStorage.setItem(API_KEY_STORAGE, updated.tmdbApiKey);
          tmdb.setApiKey(updated.tmdbApiKey);
        }
      } catch (err) {
        console.warn('Error saving to localStorage', err);
      }
      return next;
    });
  };

  const markWatched = (movie: Movie) => {
    const withoutMovie = (list: Movie[]) => list.filter((m) => String(m.id) !== String(movie.id));
    persist({
      watched: [movie, ...withoutMovie(state.watched)],
      skippedIds: state.skippedIds.filter((id) => String(id) !== String(movie.id)),
      cantRememberIds: state.cantRememberIds.filter((id) => String(id) !== String(movie.id)),
    });
  };

  const toggleWatched = (movie: Movie) => {
    const isAlreadyWatched = state.watched.some((m) => String(m.id) === String(movie.id));
    if (isAlreadyWatched) {
      persist({
        watched: state.watched.filter((m) => String(m.id) !== String(movie.id)),
        loved: state.loved.filter((m) => String(m.id) !== String(movie.id)),
        okay: state.okay.filter((m) => String(m.id) !== String(movie.id)),
        disliked: state.disliked.filter((m) => String(m.id) !== String(movie.id)),
      });
    } else {
      markWatched(movie);
    }
  };

  const markLoved = (movie: Movie) => {
    const withoutMovie = (list: Movie[]) => list.filter((m) => String(m.id) !== String(movie.id));
    persist({
      watched: [movie, ...withoutMovie(state.watched)],
      loved: [movie, ...withoutMovie(state.loved)],
      okay: withoutMovie(state.okay),
      disliked: withoutMovie(state.disliked),
      skippedIds: state.skippedIds.filter((id) => String(id) !== String(movie.id)),
      cantRememberIds: state.cantRememberIds.filter((id) => String(id) !== String(movie.id)),
    });
  };

  const markOkay = (movie: Movie) => {
    const withoutMovie = (list: Movie[]) => list.filter((m) => String(m.id) !== String(movie.id));
    persist({
      watched: [movie, ...withoutMovie(state.watched)],
      okay: [movie, ...withoutMovie(state.okay)],
      loved: withoutMovie(state.loved),
      disliked: withoutMovie(state.disliked),
      skippedIds: state.skippedIds.filter((id) => String(id) !== String(movie.id)),
      cantRememberIds: state.cantRememberIds.filter((id) => String(id) !== String(movie.id)),
    });
  };

  const markDisliked = (movie: Movie) => {
    const withoutMovie = (list: Movie[]) => list.filter((m) => String(m.id) !== String(movie.id));
    persist({
      watched: [movie, ...withoutMovie(state.watched)],
      loved: withoutMovie(state.loved),
      okay: withoutMovie(state.okay),
      disliked: [movie, ...withoutMovie(state.disliked)],
      watchlist: withoutMovie(state.watchlist),
      skippedIds: state.skippedIds.filter((id) => String(id) !== String(movie.id)),
      cantRememberIds: state.cantRememberIds.filter((id) => String(id) !== String(movie.id)),
    });
  };

  const markWatchlist = (movie: Movie) => {
    const withoutMovie = (list: Movie[]) => list.filter((m) => String(m.id) !== String(movie.id));
    persist({
      watchlist: [movie, ...withoutMovie(state.watchlist)],
      skippedIds: state.skippedIds.filter((id) => String(id) !== String(movie.id)),
      cantRememberIds: state.cantRememberIds.filter((id) => String(id) !== String(movie.id)),
    });
  };

  const markSkipped = (id: string | number) => {
    if (!state.skippedIds.includes(id)) {
      persist({
        skippedIds: [...state.skippedIds, id],
      });
    }
  };

  const markCantRemember = (id: string | number) => {
    if (!state.cantRememberIds.includes(id)) {
      persist({
        cantRememberIds: [...state.cantRememberIds, id],
      });
    }
  };

  const removeMovie = (id: string | number) => {
    const filter = (list: Movie[]) => list.filter((m) => String(m.id) !== String(id));
    persist({
      watched: filter(state.watched),
      loved: filter(state.loved),
      okay: filter(state.okay),
      disliked: filter(state.disliked),
      watchlist: filter(state.watchlist),
      skippedIds: state.skippedIds.filter((item) => String(item) !== String(id)),
      cantRememberIds: state.cantRememberIds.filter((item) => String(item) !== String(id)),
    });
  };

  const clearAll = () => {
    persist({
      watched: [],
      loved: [],
      okay: [],
      disliked: [],
      watchlist: [],
      skippedIds: [],
      cantRememberIds: [],
    });
  };

  const setDeviceMode = (mode: DeviceMode) => {
    persist({ deviceMode: mode });
  };

  const setAppMode = (mode: AppMode) => {
    setState((prev) => ({ ...prev, appMode: mode }));
  };

  const setTmdbApiKey = (key: string) => {
    persist({ tmdbApiKey: key.trim() });
  };

  // Compile taste summary into a punchy prompt for the AI
  const getTasteSummaryPrompt = (): string => {
    const lovedTitles = state.loved.slice(0, 8).map((m) => m.title);
    const okayTitles = state.okay.slice(0, 6).map((m) => m.title);
    const watchedTitles = state.watched.slice(0, 10).map((m) => m.title);
    const dislikedTitles = state.disliked.slice(0, 5).map((m) => m.title);

    let summary = "";
    if (watchedTitles.length > 0) {
      summary += `User has already watched: ${watchedTitles.join(", ")}. Do not recommend these again unless asked. `;
    }
    if (lovedTitles.length > 0) {
      summary += `User LOVES these films (top favorites): ${lovedTitles.join(", ")}. `;
    }
    if (okayTitles.length > 0) {
      summary += `User watched these and thought they were just OK / decent (middle of the road, didn't love, didn't hate): ${okayTitles.join(", ")}. `;
    }
    if (dislikedTitles.length > 0) {
      summary += `User dislikes/avoids: ${dislikedTitles.join(", ")}. `;
    }
    if (state.watchlist.length > 0) {
      summary += `User wants to watch: ${state.watchlist.slice(0, 5).map((m) => m.title).join(", ")}. `;
    }
    return summary;
  };

  return {
    ...state,
    markWatched,
    toggleWatched,
    markLoved,
    markOkay,
    markDisliked,
    markWatchlist,
    markSkipped,
    markCantRemember,
    removeMovie,
    clearAll,
    setDeviceMode,
    setAppMode,
    setTmdbApiKey,
    getTasteSummaryPrompt,
  };
}
