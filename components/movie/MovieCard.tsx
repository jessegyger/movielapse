'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Heart, ThumbsDown, Bookmark, Sparkles, Tv } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';

interface MovieCardProps {
  movie: Movie;
  onPlayTrailer: (movie: Movie) => void;
  onLove?: (movie: Movie) => void;
  onDislike?: (movie: Movie) => void;
  onWatchlist?: (movie: Movie) => void;
  isLoved?: boolean;
  isDisliked?: boolean;
  isWatchlist?: boolean;
  compact?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onPlayTrailer,
  onLove,
  onDislike,
  onWatchlist,
  isLoved = false,
  isDisliked = false,
  isWatchlist = false,
  compact = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : '';

  return (
    <div className="group relative bg-neutral-900/90 border border-neutral-800/80 hover:border-amber-500/50 rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col">
      {/* Poster Media */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
        {!imageError && movie.poster_path ? (
          <Image
            src={movie.poster_path}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            unoptimized={movie.poster_path.startsWith('http')}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-800 to-neutral-950 text-center">
            <span className="text-3xl mb-2">🎬</span>
            <p className="text-xs text-neutral-400 font-medium line-clamp-2">{movie.title}</p>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 text-xs font-bold flex items-center gap-1 shadow-sm">
            ★ {movie.vote_average ? movie.vote_average.toFixed(1) : '8.0'}
          </span>
          {releaseYear && (
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-neutral-300 text-xs font-medium shadow-sm">
              {releaseYear}
            </span>
          )}
        </div>

        {/* Quick trailer play overlay on hover/tap */}
        <button
          onClick={() => onPlayTrailer(movie)}
          aria-label={`Watch ${movie.title} trailer`}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 text-white font-medium text-sm"
        >
          <span className="p-3.5 bg-amber-500 text-black rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </span>
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* AI Match Reason pill if present */}
          {movie.ai_match_reason && (
            <div className="mb-2 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-tight">{movie.ai_match_reason}</span>
            </div>
          )}

          <h4 className="font-semibold text-white text-base leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors">
            {movie.title}
          </h4>

          {/* Genre chips */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {movie.genres?.slice(0, compact ? 2 : 3).map((g) => (
              <span
                key={g}
                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-medium"
              >
                {g}
              </span>
            ))}
          </div>

          {!compact && movie.overview && (
            <p className="mt-2 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
              {movie.overview}
            </p>
          )}

          {/* Streaming info badge */}
          {movie.streaming_providers && movie.streaming_providers.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-neutral-300 bg-neutral-950/70 py-1 px-2 rounded-lg border border-neutral-800">
              <Tv className="w-3 h-3 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5 overflow-hidden">
                {movie.streaming_providers[0].logo_path && (
                  <img
                    src={movie.streaming_providers[0].logo_path}
                    alt=""
                    className="w-3.5 h-3.5 rounded object-contain shrink-0"
                  />
                )}
                <span className="truncate font-medium">
                  {movie.streaming_providers[0].name}
                </span>
                {movie.streaming_providers.length > 1 && (
                  <span className="text-[10px] text-neutral-500 shrink-0 font-normal">
                    +{movie.streaming_providers.length - 1}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
          <button
            onClick={() => onPlayTrailer(movie)}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Trailer
          </button>

          <div className="flex items-center gap-1">
            {onLove && (
              <button
                onClick={() => onLove(movie)}
                title={isLoved ? "Loved" : "Mark as loved"}
                className={`p-1.5 rounded-lg transition ${
                  isLoved
                    ? 'text-red-400 bg-red-500/20'
                    : 'text-neutral-400 hover:text-red-400 hover:bg-neutral-800'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLoved ? 'fill-current' : ''}`} />
              </button>
            )}

            {onDislike && (
              <button
                onClick={() => onDislike(movie)}
                title={isDisliked ? "Disliked" : "Mark as disliked"}
                className={`p-1.5 rounded-lg transition ${
                  isDisliked
                    ? 'text-neutral-200 bg-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
              </button>
            )}

            {onWatchlist && (
              <button
                onClick={() => onWatchlist(movie)}
                title={isWatchlist ? "In Watchlist" : "Save to Watchlist"}
                className={`p-1.5 rounded-lg transition ${
                  isWatchlist
                    ? 'text-amber-400 bg-amber-500/20'
                    : 'text-neutral-400 hover:text-amber-400 hover:bg-neutral-800'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isWatchlist ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
