'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Heart, ThumbsDown, Bookmark, Sparkles, Tv, Ticket, Info, Check, Eye } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';

interface MovieCardProps {
  movie: Movie;
  onPlayTrailer: (movie: Movie) => void;
  onSelectMovie?: (movie: Movie) => void;
  onLove?: (movie: Movie) => void;
  onDislike?: (movie: Movie) => void;
  onWatchlist?: (movie: Movie) => void;
  onWatched?: (movie: Movie) => void;
  isLoved?: boolean;
  isDisliked?: boolean;
  isWatchlist?: boolean;
  isWatched?: boolean;
  compact?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onPlayTrailer,
  onSelectMovie,
  onLove,
  onDislike,
  onWatchlist,
  onWatched,
  isLoved = false,
  isDisliked = false,
  isWatchlist = false,
  isWatched = false,
  compact = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : '';

  const getStreamingBadgeConfig = (providerName: string) => {
    const norm = providerName.toLowerCase();
    if (norm.includes('netflix')) {
      return {
        bg: 'bg-red-950/90 text-red-100 border-red-600/70',
        badge: 'bg-[#E50914] text-white',
        label: 'Netflix',
        icon: 'https://image.tmdb.org/t/p/original/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg'
      };
    }
    if (norm.includes('prime') || norm.includes('amazon')) {
      return {
        bg: 'bg-sky-950/90 text-sky-100 border-sky-500/70',
        badge: 'bg-[#00A8E1] text-white',
        label: 'Prime Video',
        icon: 'https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg'
      };
    }
    if (norm.includes('disney')) {
      return {
        bg: 'bg-blue-950/90 text-blue-100 border-blue-500/70',
        badge: 'bg-[#113CCF] text-white',
        label: 'Disney+',
        icon: 'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg'
      };
    }
    if (norm.includes('max') || norm.includes('hbo')) {
      return {
        bg: 'bg-purple-950/90 text-purple-100 border-purple-500/70',
        badge: 'bg-[#7E22CE] text-white',
        label: 'Max',
        icon: 'https://image.tmdb.org/t/p/original/aS2zvJWn9mwiCOeaaCkIh4w00dD.jpg'
      };
    }
    if (norm.includes('hulu')) {
      return {
        bg: 'bg-emerald-950/90 text-emerald-100 border-emerald-500/70',
        badge: 'bg-[#1CE783] text-black font-bold',
        label: 'Hulu',
        icon: 'https://image.tmdb.org/t/p/original/giwM8L5DaFMTEG1Qg2G2tzxsYvg.jpg'
      };
    }
    if (norm.includes('paramount')) {
      return {
        bg: 'bg-blue-900/90 text-blue-100 border-blue-600',
        badge: 'bg-[#0064FF] text-white',
        label: 'Paramount+',
        icon: 'https://image.tmdb.org/t/p/original/fi83B1oztoS47xxcemFdPMhIzK.jpg'
      };
    }
    if (norm.includes('peacock')) {
      return {
        bg: 'bg-amber-950/90 text-amber-100 border-amber-600/70',
        badge: 'bg-amber-500 text-black font-bold',
        label: 'Peacock',
        icon: 'https://image.tmdb.org/t/p/original/8VCV78ehT9YImCcDTRAR292278b.jpg'
      };
    }
    if (norm.includes('apple')) {
      return {
        bg: 'bg-neutral-900/90 text-neutral-100 border-neutral-600',
        badge: 'bg-neutral-800 text-white',
        label: 'Apple TV',
        icon: 'https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg'
      };
    }
    if (norm.includes('tubi')) {
      return {
        bg: 'bg-amber-950/90 text-amber-100 border-amber-600/70',
        badge: 'bg-amber-600 text-black font-bold',
        label: 'Tubi',
        icon: 'https://image.tmdb.org/t/p/original/9dEuvA8wg5TSeFBZlPxSVxFdimJ.png'
      };
    }
    if (norm.includes('pluto')) {
      return {
        bg: 'bg-neutral-800/90 text-neutral-100 border-neutral-600',
        badge: 'bg-neutral-700 text-white',
        label: 'Pluto TV',
        icon: 'https://image.tmdb.org/t/p/original/fN4czqaMQNLeF6sSSIjGbAWzvwK.png'
      };
    }
    if (norm.includes('youtube')) {
      return {
        bg: 'bg-red-950/90 text-red-100 border-red-600/70',
        badge: 'bg-red-600 text-white',
        label: 'YouTube',
        icon: 'https://image.tmdb.org/t/p/original/peURlLlr8jggOwK53fJ5wdQl05y.jpg'
      };
    }
    return {
      bg: 'bg-neutral-900/90 text-neutral-300 border-neutral-700',
      badge: 'bg-neutral-800 text-white',
      label: providerName,
      icon: undefined
    };
  };

  return (
    <div
      onClick={() => onSelectMovie ? onSelectMovie(movie) : onPlayTrailer(movie)}
      className="group relative bg-neutral-900/90 border border-neutral-800/80 hover:border-amber-400/80 hover:bg-neutral-850/95 rounded-xl overflow-hidden shadow-lg transition-all duration-200 hover:shadow-2xl hover:shadow-amber-500/15 flex flex-col cursor-pointer"
    >
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

        {/* Top Left Badges: Rating & Year */}
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
          onClick={(e) => {
            e.stopPropagation();
            onPlayTrailer(movie);
          }}
          aria-label={`Watch ${movie.title} trailer`}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 text-white font-medium text-sm"
        >
          <span className="p-3.5 bg-amber-500 text-black rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </span>
        </button>
      </div>

      {/* Card Body (Clicking anywhere here opens the movie detail page) */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* AI Match Reason pill if present */}
          {movie.ai_match_reason && (
            <div className="mb-2 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-tight">{movie.ai_match_reason}</span>
            </div>
          )}

          <h4
            title={`View details for ${movie.title}`}
            className="font-semibold text-white text-base leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors text-left"
          >
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

          {/* Availability Row: In Theatres badge + Stream platform icons (Zero wasted space, no 'Watch:' label) */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {movie.is_in_theatres && (
              <a
                href={movie.theatre_tickets_url || `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+movie+showtimes+tickets`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`In Theatres now - Get showtimes & tickets for ${movie.title}`}
                className="p-1.5 rounded-lg bg-red-950/90 border border-red-600/80 text-red-300 hover:text-white hover:bg-red-900 transition shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center shrink-0"
              >
                <Ticket className="w-3.5 h-3.5 text-red-400 shrink-0" />
              </a>
            )}

            {movie.streaming_providers && movie.streaming_providers.length > 0 && movie.streaming_providers[0].name !== 'Available Online' ? (
              <>
                {movie.streaming_providers.slice(0, 4).map((p, idx) => {
                  const cfg = getStreamingBadgeConfig(p.name);
                  const logo = p.logo_path || cfg.icon;
                  const link = p.watch_url || `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+${encodeURIComponent(p.name)}`;
                  return (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={`Watch "${movie.title}" on ${p.name}`}
                      className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-750 hover:border-amber-400 shadow-sm transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center shrink-0"
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt={p.name}
                          className="w-5 h-5 rounded object-contain shrink-0"
                        />
                      ) : (
                        <span className="text-[9px] font-bold px-1 text-white">{p.name.slice(0, 3)}</span>
                      )}
                    </a>
                  );
                })}
                {movie.streaming_providers.length > 4 && (
                  <span
                    className="text-[10px] text-neutral-400 font-medium px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800"
                    title={movie.streaming_providers.slice(4).map((p) => p.name).join(', ')}
                  >
                    +{movie.streaming_providers.length - 4}
                  </span>
                )}
              </>
            ) : !movie.is_in_theatres ? (
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-950/70 py-1 px-2 rounded-lg border border-neutral-800/80">
                <Tv className="w-3 h-3 text-amber-400/80 shrink-0" />
                <a
                  href={`https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+online`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-amber-400 transition"
                >
                  Stream search ↗
                </a>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between"
        >
          {onWatched ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWatched(movie);
              }}
              title={isWatched ? "Seen (click to unmark)" : "Mark as seen"}
              className={`p-1.5 rounded-lg transition-all active:scale-95 flex items-center justify-center ${
                isWatched
                  ? 'text-amber-400 bg-amber-500/25 border border-amber-500/50 shadow-sm'
                  : 'text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 border border-transparent'
              }`}
            >
              <Eye className={`w-4 h-4 ${isWatched ? 'fill-amber-400/40 text-amber-400' : ''}`} />
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1">
            {onLove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLove(movie);
                }}
                title={isLoved ? "Loved" : "Mark as loved"}
                className={`p-1.5 rounded-lg transition active:scale-95 ${
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDislike(movie);
                }}
                title={isDisliked ? "Disliked" : "Mark as disliked"}
                className={`p-1.5 rounded-lg transition active:scale-95 ${
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onWatchlist(movie);
                }}
                title={isWatchlist ? "In Watchlist" : "Save to Watchlist"}
                className={`p-1.5 rounded-lg transition active:scale-95 ${
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
