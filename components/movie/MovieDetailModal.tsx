'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, Play, Heart, Bookmark, ThumbsDown, Tv, Ticket, ExternalLink, Calendar, Clock, Award, Users } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayTrailer: (movie: Movie) => void;
  onLove?: (movie: Movie) => void;
  onDislike?: (movie: Movie) => void;
  onWatchlist?: (movie: Movie) => void;
  isLoved?: boolean;
  isDisliked?: boolean;
  isWatchlist?: boolean;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  isOpen,
  onClose,
  onPlayTrailer,
  onLove,
  onDislike,
  onWatchlist,
  isLoved = false,
  isDisliked = false,
  isWatchlist = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !movie) return null;

  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : '';

  const formatCurrency = (amount?: number) => {
    if (!amount || amount <= 0) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRuntime = (mins?: number) => {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl my-auto text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop Banner / Header */}
        <div className="relative w-full aspect-[21/9] sm:aspect-[2.5/1] bg-neutral-950 overflow-hidden shrink-0">
          {movie.backdrop_path ? (
            <Image
              src={movie.backdrop_path}
              alt={movie.title}
              fill
              className="object-cover opacity-60"
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized={movie.backdrop_path.startsWith('http')}
            />
          ) : movie.poster_path ? (
            <Image
              src={movie.poster_path}
              alt={movie.title}
              fill
              className="object-cover opacity-30 blur-sm"
              sizes="800px"
              unoptimized={movie.poster_path.startsWith('http')}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-neutral-900 to-neutral-950" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close movie details"
            className="absolute top-3 right-3 p-2 text-neutral-300 hover:text-white rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition shadow-md z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trailer Play floating trigger on banner */}
          <div className="absolute bottom-4 left-4 sm:left-6 flex items-center gap-3">
            <button
              onClick={() => onPlayTrailer(movie)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-lg transform hover:scale-105 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Trailer</span>
            </button>
            {movie.is_in_theatres && (
              <a
                href={movie.theatre_tickets_url || `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+movie+showtimes+tickets`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 border border-red-500/80 text-white font-bold text-sm shadow-lg transform hover:scale-105 transition"
              >
                <Ticket className="w-4 h-4" />
                <span>Theatres ↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Title & Metadata Badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                ★ {movie.vote_average ? movie.vote_average.toFixed(1) : '8.0'}
                {movie.vote_count ? (
                  <span className="text-neutral-400 font-normal">({movie.vote_count.toLocaleString()})</span>
                ) : null}
              </span>

              {releaseYear && (
                <span className="px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  {releaseYear}
                </span>
              )}

              {movie.runtime && (
                <span className="px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  {formatRuntime(movie.runtime)}
                </span>
              )}

              {movie.is_in_theatres && (
                <span className="px-2.5 py-0.5 rounded-md bg-red-950/90 border border-red-600/70 text-red-200 flex items-center gap-1 font-bold">
                  <Ticket className="w-3 h-3" />
                  Now In Theatres
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {movie.title}
            </h2>

            {movie.tagline && (
              <p className="mt-1 text-sm text-neutral-400 italic">
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}
          </div>

          {/* Genre Chips */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map((genre) => (
                <span
                  key={genre}
                  className="text-xs px-2.5 py-1 rounded-lg bg-neutral-800/90 border border-neutral-700/60 text-neutral-300 font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Quick Action Bar (Love, Dislike, Watchlist) */}
          <div className="flex items-center gap-2 p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl">
            <span className="text-xs text-neutral-400 font-medium mr-auto">Your Taste:</span>
            {onLove && (
              <button
                onClick={() => onLove(movie)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isLoved
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-red-400 hover:bg-neutral-800'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLoved ? 'fill-current' : ''}`} />
                <span>{isLoved ? 'Loved' : 'Love'}</span>
              </button>
            )}
            {onDislike && (
              <button
                onClick={() => onDislike(movie)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isDisliked
                    ? 'bg-neutral-700 border border-neutral-600 text-neutral-200'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                }`}
              >
                <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-current' : ''}`} />
                <span>{isDisliked ? 'Disliked' : 'Dislike'}</span>
              </button>
            )}
            {onWatchlist && (
              <button
                onClick={() => onWatchlist(movie)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isWatchlist
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 hover:bg-neutral-800'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isWatchlist ? 'fill-current' : ''}`} />
                <span>{isWatchlist ? 'Saved' : 'Watchlist'}</span>
              </button>
            )}
          </div>

          {/* Full Synopsis / Overview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Synopsis &amp; Story
            </h3>
            <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-normal">
              {movie.overview || 'No synopsis provided for this title.'}
            </p>
          </div>

          {/* Director & Key Cast */}
          {(movie.director || (movie.cast && movie.cast.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
              {movie.director && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Director
                  </h4>
                  <p className="text-sm font-semibold text-white">{movie.director}</p>
                </div>
              )}

              {movie.cast && movie.cast.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Starring Cast
                  </h4>
                  <p className="text-sm text-neutral-300 font-medium">
                    {movie.cast.slice(0, 6).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Financials & Keywords */}
          {((movie.budget && movie.budget > 0) || (movie.revenue && movie.revenue > 0) || (movie.keywords && movie.keywords.length > 0)) && (
            <div className="pt-2 border-t border-neutral-800 space-y-3">
              <div className="flex flex-wrap gap-4 text-xs">
                {movie.budget && movie.budget > 0 && (
                  <div>
                    <span className="text-neutral-400">Budget: </span>
                    <span className="font-semibold text-neutral-200">{formatCurrency(movie.budget)}</span>
                  </div>
                )}
                {movie.revenue && movie.revenue > 0 && (
                  <div>
                    <span className="text-neutral-400">Box Office: </span>
                    <span className="font-semibold text-emerald-400">{formatCurrency(movie.revenue)}</span>
                  </div>
                )}
              </div>

              {movie.keywords && movie.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {movie.keywords.slice(0, 8).map((kw, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Where to Watch / Streaming Section */}
          <div className="pt-3 border-t border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              Where to Watch
            </h3>

            <div className="flex flex-wrap gap-2 items-center">
              {movie.is_in_theatres && (
                <a
                  href={movie.theatre_tickets_url || `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+movie+showtimes+tickets`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/90 border border-red-600/70 text-red-200 hover:bg-red-900 transition text-xs font-bold shadow-sm"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Theatres Showtimes ↗</span>
                </a>
              )}

              {movie.streaming_providers && movie.streaming_providers.length > 0 && movie.streaming_providers[0].name !== 'Available Online' ? (
                movie.streaming_providers.map((p, idx) => {
                  const link = p.watch_url || `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+${encodeURIComponent(p.name)}`;
                  return (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-100 text-xs font-semibold transition hover:border-amber-400"
                    >
                      {p.logo_path && (
                        <img src={p.logo_path} alt="" className="w-4 h-4 rounded object-contain" />
                      )}
                      <span>{p.name}</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                  );
                })
              ) : (
                <a
                  href={`https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+online`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs transition"
                >
                  <Tv className="w-3.5 h-3.5 text-amber-400" />
                  <span>Search Streaming Providers ↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
