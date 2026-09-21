'use client';

import React from 'react';
import Image from 'next/image';
import { Eye, Heart, ThumbsDown, Bookmark, HelpCircle, ArrowRight, Sparkles, CheckCircle2, Zap, RotateCcw, Meh } from 'lucide-react';
import { Movie, WebLLMProgress } from '@/lib/tmdb/types';

interface TasteProfilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  movies: Movie[];
  ratedIds: (number | string)[];
  webllmProgress: WebLLMProgress;
  onWatched: (movie: Movie) => void;
  onLove: (movie: Movie) => void;
  onOkay: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatchlist: (movie: Movie) => void;
  onCantRemember: (movieId: number | string) => void;
  onSkip: (movieId: number | string) => void;
  ratedCount: number;
  onInstantReady?: () => void;
  onRetryDownload?: () => void;
}

export const TasteProfilerModal: React.FC<TasteProfilerModalProps> = ({
  isOpen,
  onClose,
  movies,
  ratedIds,
  webllmProgress,
  onWatched,
  onLove,
  onOkay,
  onDislike,
  onWatchlist,
  onCantRemember,
  onSkip,
  ratedCount,
  onInstantReady,
  onRetryDownload,
}) => {
  if (!isOpen) return null;

  // Filter out any movie the user has already touched (watched, loved, disliked, skipped, etc.)
  const unratedMovies = movies.filter((m) => {
    const idStr = String(m.id);
    return !ratedIds.map(String).includes(idStr);
  });

  const currentMovie = unratedMovies[0];
  const percent = Math.round((webllmProgress.progress || 0) * 100);

  const handleAction = (action: 'watched' | 'love' | 'okay' | 'dislike' | 'watchlist' | 'cant_remember' | 'skip') => {
    if (!currentMovie) return;

    if (action === 'watched') onWatched(currentMovie);
    else if (action === 'love') onLove(currentMovie);
    else if (action === 'okay') onOkay(currentMovie);
    else if (action === 'dislike') onDislike(currentMovie);
    else if (action === 'watchlist') onWatchlist(currentMovie);
    else if (action === 'cant_remember') onCantRemember(currentMovie.id);
    else if (action === 'skip') onSkip(currentMovie.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[98dvh] bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Top Progress & Status Banner */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {webllmProgress.isLoaded
                ? (webllmProgress.usingFallback ? "Instant Cinephile AI Active" : "WebGPU Local AI Active")
                : "Initializing AI Engine"}
            </span>
            <span className="text-neutral-400 font-mono">
              {webllmProgress.isLoaded ? "100%" : `${percent}%`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-neutral-800 h-1.5 sm:h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                webllmProgress.isLoaded
                  ? 'bg-emerald-500 w-full'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: webllmProgress.isLoaded ? '100%' : `${Math.max(percent, 8)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1.5 text-[11px] text-neutral-400">
            <span className="truncate max-w-[240px] sm:max-w-[320px]">
              {webllmProgress.text || 'Ready'}
            </span>

            <div className="flex items-center gap-2">
              {webllmProgress.usingFallback && onRetryDownload && (
                <button
                  onClick={onRetryDownload}
                  className="text-neutral-400 hover:text-white flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Retry WebGPU
                </button>
              )}
              {onInstantReady && !webllmProgress.isLoaded && (
                <button
                  onClick={onInstantReady}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 ml-1 shrink-0"
                >
                  <Zap className="w-3 h-3" /> Start Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Taste Tagger */}
        <div className="p-2.5 sm:p-5 flex flex-col items-center text-center">
          <div className="mb-1.5 sm:mb-2">
            <h2 className="text-base sm:text-2xl font-black text-white tracking-tight">
              Have You Watched This Movie?
            </h2>
            <p className="hidden sm:block text-xs text-neutral-400 mt-0.5 max-w-md">
              Tap Watched or Haven&apos;t Seen to train your personal AI sommelier.
            </p>
          </div>

          {currentMovie ? (
            <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl p-2.5 sm:p-4 flex flex-col items-center">
              {/* Poster */}
              <div className="relative w-28 h-40 sm:w-36 sm:h-52 rounded-lg sm:rounded-xl overflow-hidden bg-neutral-800 shadow-md mb-2 sm:mb-2.5">
                <Image
                  src={currentMovie.poster_path}
                  alt={currentMovie.title}
                  fill
                  sizes="(max-width: 640px) 112px, 144px"
                  className="object-cover"
                  priority
                  unoptimized={currentMovie.poster_path.startsWith('http')}
                />
                <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[10px] text-amber-400 font-bold">
                  ★ {currentMovie.vote_average.toFixed(1)}
                </div>
              </div>

              <h3 className="font-extrabold text-white text-sm sm:text-base leading-tight line-clamp-1">
                {currentMovie.title}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {currentMovie.release_date?.slice(0, 4)} • {currentMovie.genres?.slice(0, 2).join(', ')}
              </p>

              {/* ROW 1: Loved | WATCHED (Big Center) | Hated */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full mt-2.5 sm:mt-3 items-center">
                {/* Left: Loved */}
                <button
                  onClick={() => handleAction('love')}
                  className="col-span-1 py-2 sm:py-3 px-1 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 transition flex flex-col items-center justify-center text-[10px] font-bold active:scale-95 group"
                  title="Loved it!"
                >
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current group-hover:scale-110 transition-transform" />
                  <span className="mt-0.5">Loved</span>
                </button>

                {/* Center: BIG WATCHED BUTTON */}
                <button
                  onClick={() => handleAction('watched')}
                  className="col-span-3 py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-blue-600/30 transition transform active:scale-95"
                >
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>WATCHED</span>
                </button>

                {/* Right: Hated */}
                <button
                  onClick={() => handleAction('dislike')}
                  className="col-span-1 py-2 sm:py-3 px-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition flex flex-col items-center justify-center text-[10px] font-semibold active:scale-95 group"
                  title="Hated / Disliked"
                >
                  <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                  <span className="mt-0.5">Hated</span>
                </button>
              </div>

              {/* ROW 2: Watchlist | HAVEN'T SEEN IT (Big Center) | Can't Remember */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full mt-1.5 sm:mt-2 items-center">
                {/* Left: Watchlist */}
                <button
                  onClick={() => handleAction('watchlist')}
                  className="col-span-1 py-2 px-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition flex flex-col items-center justify-center text-[10px] font-semibold active:scale-95"
                  title="Save to Watchlist"
                >
                  <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="mt-0.5 text-[9px]">Queue</span>
                </button>

                {/* Center: BIG HAVEN'T SEEN IT BUTTON */}
                <button
                  onClick={() => handleAction('skip')}
                  className="col-span-3 py-2 sm:py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-neutral-700 transition transform active:scale-95"
                >
                  <span>HAVEN&apos;T SEEN IT</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
                </button>

                {/* Right: Can't Remember */}
                <button
                  onClick={() => handleAction('cant_remember')}
                  className="col-span-1 py-2 px-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition flex flex-col items-center justify-center text-[10px] font-medium active:scale-95"
                  title="Can't Remember"
                >
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500" />
                  <span className="mt-0.5 text-[9px]">Unsure</span>
                </button>
              </div>

              {/* Sub-tag: It Was Okay */}
              <button
                onClick={() => handleAction('okay')}
                className="mt-1.5 text-[10px] sm:text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1 py-0.5 px-2 rounded-lg hover:bg-amber-500/10 transition"
              >
                <Meh className="w-3 h-3" />
                <span>Watched it, but it was just okay / decent</span>
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">All Caught Up!</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                You have reviewed all available seed movies. Your taste profile is active!
              </p>
            </div>
          )}

          {/* Rated counter */}
          <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-neutral-400">
            {ratedCount > 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {ratedCount} films recorded in taste profile
              </span>
            ) : (
              <span className="text-[11px]">Rate a few favorites to unlock personalized recommendations</span>
            )}
          </div>
        </div>

        {/* Enter App Footer */}
        <div className="p-3 sm:p-4 bg-neutral-950/95 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {unratedMovies.length} unrated remaining
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95"
          >
            Enter MovieLapse <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
