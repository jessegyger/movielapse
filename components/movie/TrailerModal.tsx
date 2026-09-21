'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, Tv } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';

interface TrailerModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ movie, isOpen, onClose }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide">
              {movie.title}
              <span className="ml-2 text-sm text-neutral-400 font-normal">
                ({movie.release_date?.slice(0, 4) || 'Trailer'})
              </span>
            </h3>
            {movie.tagline && (
              <p className="text-xs text-neutral-400 italic line-clamp-1">{movie.tagline}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close trailer"
            className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800/80 hover:bg-neutral-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {movie.trailer_key ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1`}
              title={`${movie.title} Official Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-400">
              <p className="text-base font-medium text-white mb-2">Trailer preview unavailable directly</p>
              <p className="text-sm text-neutral-400 max-w-md mb-4">
                Watch official clips and trailers for &quot;{movie.title}&quot; directly on YouTube:
              </p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' official trailer')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
              >
                Watch on YouTube <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Action Link Bar */}
        <div className="px-4 py-2 bg-neutral-900/90 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span className="text-[11px] text-neutral-400">
            If video shows &quot;Unavailable&quot; due to studio embed restrictions:
          </span>
          <a
            href={
              movie.trailer_key
                ? `https://www.youtube.com/watch?v=${movie.trailer_key}`
                : `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' official trailer')}`
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg transition text-[11px] font-medium"
          >
            Open in YouTube App / Tab <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Where to Watch / Streaming Availability */}
        {movie.streaming_providers && movie.streaming_providers.length > 0 && (
          <div className="px-6 py-3 bg-neutral-950/90 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">Where to Watch in your region:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {movie.streaming_providers.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200"
                >
                  {p.logo_path && (
                    <img src={p.logo_path} alt="" className="w-4 h-4 rounded object-contain" />
                  )}
                  <span className="font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-4 bg-neutral-950 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400 border-t border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-semibold">
              ★ {movie.vote_average.toFixed(1)}
            </span>
            <span>{movie.genres?.slice(0, 3).join(' • ')}</span>
            {movie.director && <span>Dir: {movie.director}</span>}
          </div>
          <div className="text-neutral-500">Press ESC or click outside to return</div>
        </div>
      </div>
    </div>
  );
};
