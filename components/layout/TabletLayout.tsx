'use client';

import React from 'react';
import { Movie, AppMode } from '@/lib/tmdb/types';
import { MovieCard } from '../movie/MovieCard';
import { Sparkles, Film } from 'lucide-react';

interface TabletLayoutProps {
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
  seedMovies: Movie[];
  lovedMovies: Movie[];
  watchlistMovies: Movie[];
  onPlayTrailer: (movie: Movie) => void;
  onLove: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatchlist: (movie: Movie) => void;
  children: React.ReactNode;
}

export const TabletLayout: React.FC<TabletLayoutProps> = ({
  appMode,
  onSelectAppMode,
  seedMovies,
  lovedMovies,
  watchlistMovies,
  onPlayTrailer,
  onLove,
  onDislike,
  onWatchlist,
  children,
}) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Tablet Subheader */}
      <div className="px-6 py-2 bg-neutral-900/50 border-b border-neutral-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
            Tablet Dual-Pane
          </span>
          <span className="text-neutral-400">Interactive Sommelier &amp; Live Vault</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectAppMode('twenty_questions')}
            className={`px-3 py-1 rounded-lg transition ${
              appMode === 'twenty_questions' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
            }`}
          >
            20 Questions
          </button>
          <button
            onClick={() => onSelectAppMode('chat')}
            className={`px-3 py-1 rounded-lg transition ${
              appMode === 'chat' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
            }`}
          >
            Ask Anything
          </button>
          <button
            onClick={() => onSelectAppMode('shelf')}
            className={`px-3 py-1 rounded-lg transition ${
              appMode === 'shelf' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400'
            }`}
          >
            Full Vault
          </button>
        </div>
      </div>

      {/* Dual Split-Pane View */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Pane: Interactive Questionnaire or Chat */}
        <div className="w-1/2 border-r border-neutral-800/80 overflow-y-auto p-4 sm:p-6 bg-neutral-950">
          {children}
        </div>

        {/* Right Pane: Live Cine-Shelf & Trailer Preview Deck */}
        <div className="w-1/2 overflow-y-auto p-4 sm:p-6 bg-neutral-950/70">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              Live Curated Deck
            </h3>
            <span className="text-xs text-neutral-500">
              {seedMovies.length} Masterpieces
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {seedMovies.slice(0, 10).map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onPlayTrailer={onPlayTrailer}
                onLove={onLove}
                onDislike={onDislike}
                onWatchlist={onWatchlist}
                isLoved={lovedMovies.some((m) => String(m.id) === String(movie.id))}
                isWatchlist={watchlistMovies.some((m) => String(m.id) === String(movie.id))}
                compact={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
