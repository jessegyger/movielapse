'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Clapperboard, ChevronRight, RefreshCw, Check, Minus, XCircle } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';
import {
  fetchWizardCatalog,
  selectNextQuestion,
  applyAnswer,
  WizardQuestion,
} from '@/lib/tmdb/movieFinder';

interface MovieFinderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

type Phase = 'loading' | 'asking' | 'results';

const MAX_QUESTIONS = 20;
const SHOW_RESULTS_AT = 6; // Show results panel when ≤ this many remain

export const MovieFinderWizard: React.FC<MovieFinderWizardProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
}) => {
  const [catalog, setCatalog] = useState<Movie[]>([]);
  const [remaining, setRemaining] = useState<Movie[]>([]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<WizardQuestion | null>(null);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(0);
  const [history, setHistory] = useState<{ q: WizardQuestion; answer: 'yes' | 'no' | 'skip' }[]>([]);

  // Load catalog when wizard opens
  useEffect(() => {
    if (!isOpen) return;
    setPhase('loading');
    setLoadProgress(0);

    fetchWizardCatalog((count) => setLoadProgress(count)).then((movies) => {
      setCatalog(movies);
      setRemaining(movies);
      setAskedIds(new Set());
      setQuestionCount(0);
      setHistory([]);
      const firstQ = selectNextQuestion(movies, new Set());
      setCurrentQuestion(firstQ);
      setPhase('asking');
    });
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleAnswer = useCallback((answer: 'yes' | 'no' | 'skip') => {
    if (!currentQuestion) return;

    let newRemaining = remaining;
    if (answer !== 'skip') {
      newRemaining = applyAnswer(remaining, currentQuestion, answer);
      // Safety net: never wipe out everything
      if (newRemaining.length === 0) newRemaining = remaining;
    }

    const newAsked = new Set(askedIds);
    newAsked.add(currentQuestion.id);
    const newCount = questionCount + 1;

    setHistory((h) => [...h, { q: currentQuestion, answer }]);
    setRemaining(newRemaining);
    setAskedIds(newAsked);
    setQuestionCount(newCount);

    const shouldReveal = newRemaining.length <= SHOW_RESULTS_AT || newCount >= MAX_QUESTIONS;

    if (shouldReveal) {
      setPhase('results');
      setCurrentQuestion(null);
    } else {
      const nextQ = selectNextQuestion(newRemaining, newAsked);
      setCurrentQuestion(nextQ || null);
      if (!nextQ) setPhase('results');
    }
  }, [currentQuestion, remaining, askedIds, questionCount]);

  const handleReset = () => {
    setRemaining(catalog);
    setAskedIds(new Set());
    setQuestionCount(0);
    setHistory([]);
    const firstQ = selectNextQuestion(catalog, new Set());
    setCurrentQuestion(firstQ);
    setPhase('asking');
  };

  if (!isOpen) return null;

  const progressPct = questionCount / MAX_QUESTIONS;
  const topResults = remaining.slice(0, 12); // show max 12 candidate posters during asking
  const finalResults = remaining.slice(0, 10);

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-lg flex flex-col items-center animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-4xl px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-amber-400" />
          <span className="font-black text-white tracking-tight">Movie Finder</span>
          <span className="text-neutral-500 text-xs font-medium ml-1">
            {phase === 'asking' && `— Question ${questionCount + 1} of up to ${MAX_QUESTIONS}`}
            {phase === 'results' && '— Found your candidates!'}
            {phase === 'loading' && '— Loading movie database...'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <Clapperboard className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-white font-semibold text-lg">Loading movie database...</p>
          <p className="text-neutral-400 text-sm">{loadProgress} movies loaded</p>
          <div className="w-64 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((loadProgress / 600) * 100, 95)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── ASKING PHASE ── */}
      {phase === 'asking' && currentQuestion && (
        <div className="flex-1 flex flex-col items-center w-full max-w-4xl px-4 overflow-hidden">
          {/* Progress bar + remaining count */}
          <div className="w-full mb-5 shrink-0">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span>{questionCount} questions asked</span>
              <span className="text-amber-400 font-bold">{remaining.length.toLocaleString()} movies remaining</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 mb-6 shrink-0 text-center shadow-2xl">
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Think of the movie you have in mind...
            </p>
            <h2 className="text-white text-xl sm:text-2xl font-bold leading-snug mb-2">
              {currentQuestion.question}
            </h2>
            {currentQuestion.hint && (
              <p className="text-neutral-500 text-sm mt-1">{currentQuestion.hint}</p>
            )}
          </div>

          {/* Answer buttons */}
          <div className="flex items-center gap-3 sm:gap-4 mb-6 shrink-0">
            <button
              onClick={() => handleAnswer('no')}
              className="flex flex-col items-center gap-1.5 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-red-950/70 border-2 border-red-600/60 text-red-300 hover:bg-red-900/80 hover:border-red-500 hover:text-white transition active:scale-95 font-bold text-sm sm:text-base"
            >
              <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
              <span>No</span>
            </button>

            <button
              onClick={() => handleAnswer('skip')}
              className="flex flex-col items-center gap-1.5 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl bg-neutral-800/80 border-2 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:border-neutral-600 hover:text-white transition active:scale-95 font-semibold text-xs sm:text-sm"
            >
              <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Not sure</span>
            </button>

            <button
              onClick={() => handleAnswer('yes')}
              className="flex flex-col items-center gap-1.5 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400 hover:text-white transition active:scale-95 font-bold text-sm sm:text-base"
            >
              <Check className="w-6 h-6 sm:w-7 sm:h-7" />
              <span>Yes</span>
            </button>
          </div>

          {/* Live candidate poster grid with Instant-Pick capability */}
          {topResults.length > 0 && (
            <div className="w-full shrink-0 mt-auto pb-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-neutral-400 text-xs font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Spot your movie? Click it anytime to finish:
                </span>
                <span className="text-neutral-500 text-[11px]">
                  {remaining.length} in pool
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
                {topResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMovie?.(m);
                      onClose();
                    }}
                    className="group relative flex-shrink-0 w-16 sm:w-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 hover:border-amber-400 hover:scale-105 transition-all shadow-lg active:scale-95 text-left"
                    title={`"${m.title}" (${m.release_date?.slice(0, 4)}) - Click if this is it!`}
                  >
                    <div className="relative w-full aspect-[2/3] bg-neutral-950">
                      {m.poster_path ? (
                        <img
                          src={m.poster_path}
                          alt={m.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-[10px] p-1 text-center">
                          {m.title?.slice(0, 10)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/25 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-[9px] font-black text-neutral-950 bg-amber-400 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                          That&apos;s it!
                        </span>
                      </div>
                    </div>
                    <div className="p-1 bg-neutral-950/90">
                      <p className="text-[10px] font-bold text-white truncate group-hover:text-amber-400">
                        {m.title}
                      </p>
                      <p className="text-[9px] text-neutral-400">
                        {m.release_date?.slice(0, 4)}
                      </p>
                    </div>
                  </button>
                ))}
                {remaining.length > 12 && (
                  <div className="flex-shrink-0 w-16 sm:w-20 aspect-[2/3] rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center text-neutral-400 text-xs font-bold p-2 text-center">
                    <span>+{remaining.length - 12}</span>
                    <span className="text-[9px] font-normal text-neutral-500">more</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS PHASE ── */}
      {phase === 'results' && (
        <div className="flex-1 flex flex-col items-center w-full max-w-4xl px-4 overflow-y-auto pb-6">
          <div className="text-center mb-6 shrink-0">
            <h2 className="text-white text-2xl font-extrabold mb-1">
              {finalResults.length === 0
                ? "Hmm, couldn't narrow it down..."
                : finalResults.length === 1
                ? '🎯 Is this your movie?'
                : `🎬 Is it one of these ${Math.min(finalResults.length, 10)} movies?`}
            </h2>
            <p className="text-neutral-400 text-sm">
              {questionCount} question{questionCount !== 1 ? 's' : ''} asked
              {remaining.length > 10 ? ` · ${remaining.length} candidates` : ''}
            </p>
          </div>

          {finalResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full mb-6">
              {finalResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMovie?.(m);
                    onClose();
                  }}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 transition active:scale-95 text-left"
                >
                  <div className="relative w-full aspect-[2/3] overflow-hidden bg-neutral-950">
                    {m.poster_path ? (
                      <img
                        src={m.poster_path}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-700 text-xs p-2 text-center">
                        🎬 {m.title}
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="text-[10px] text-amber-400 font-bold">
                        ★ {m.vote_average?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-white text-xs font-semibold line-clamp-1 leading-tight">
                      {m.title}
                    </p>
                    <p className="text-neutral-500 text-[10px] mt-0.5">
                      {m.release_date?.slice(0, 4)}
                      {m.genres?.[0] ? ` · ${m.genres[0]}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-400">
              <p>No matches found with those answers.</p>
              <p className="text-sm mt-1">Try again with different answers — memory is fuzzy!</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition"
            >
              <RefreshCw className="w-4 h-4" /> Start Over
            </button>
            {remaining.length > 10 && (
              <button
                onClick={() => {
                  // Continue asking with the current pool
                  const nextQ = selectNextQuestion(remaining, askedIds);
                  if (nextQ) {
                    setCurrentQuestion(nextQ);
                    setPhase('asking');
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-semibold text-sm transition"
              >
                Keep Narrowing <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white font-semibold text-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
