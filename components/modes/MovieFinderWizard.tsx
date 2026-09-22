'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Clapperboard,
  ChevronRight,
  RefreshCw,
  Check,
  Minus,
  XCircle,
  HelpCircle,
  Sparkles,
  Search,
  Globe2,
  Loader2
} from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';
import {
  queryLiveTMDbDiscover,
  searchLiveTMDb,
  scoreAllMovies,
  selectNextQuestion,
  createInitialFilters,
  LiveDiscoverFilters,
  WizardQuestion,
  WizardAnswer,
  ScoredMovie,
} from '@/lib/tmdb/movieFinder';

interface MovieFinderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

type Phase = 'loading' | 'asking' | 'results';

const MAX_QUESTIONS = 20;

export const MovieFinderWizard: React.FC<MovieFinderWizardProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
}) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [filters, setFilters] = useState<LiveDiscoverFilters>(createInitialFilters());
  const [allMovies, setAllMovies] = useState<Map<string, Movie>>(new Map());
  const [scoredPool, setScoredPool] = useState<ScoredMovie[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<WizardQuestion | null>(null);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(0);
  const [history, setHistory] = useState<{ q: WizardQuestion; answer: WizardAnswer }[]>([]);
  const [clueMatches, setClueMatches] = useState<Set<string>>(new Set());
  const [clueText, setClueText] = useState('');
  const [isQueryingTMDb, setIsQueryingTMDb] = useState(false);
  const [liveDbHits, setLiveDbHits] = useState(0);

  // Initialize live session on open
  useEffect(() => {
    if (!isOpen) return;

    setPhase('loading');
    setClueText('');
    const initFilters = createInitialFilters();
    setFilters(initFilters);
    setAskedIds(new Set());
    setQuestionCount(0);
    setHistory([]);
    setClueMatches(new Set());

    // Initial Live TMDB query to populate initial pool
    queryLiveTMDbDiscover(initFilters, 3).then((movies) => {
      const map = new Map<string, Movie>();
      movies.forEach((m) => map.set(String(m.id), m));
      setAllMovies(map);
      setLiveDbHits(map.size);

      const scored = scoreAllMovies(Array.from(map.values()), []);
      setScoredPool(scored);

      const firstQ = selectNextQuestion(scored, new Set());
      setCurrentQuestion(firstQ);
      setPhase('asking');
    });
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Handle user answer with Live TMDb Discover query
  const handleAnswer = useCallback(
    async (answer: WizardAnswer) => {
      if (!currentQuestion) return;

      setIsQueryingTMDb(true);

      // 1. Build updated live TMDb Discover filters
      const nextFilters: LiveDiscoverFilters = {
        with_genres: new Set(filters.with_genres),
        without_genres: new Set(filters.without_genres),
        with_keywords: new Set(filters.with_keywords),
        without_keywords: new Set(filters.without_keywords),
        primary_release_date_gte: filters.primary_release_date_gte,
        primary_release_date_lte: filters.primary_release_date_lte,
        vote_count_gte: filters.vote_count_gte,
        vote_average_gte: filters.vote_average_gte,
        with_original_language: filters.with_original_language,
      };

      if (answer === 'yes' && currentQuestion.onYes) {
        const u = currentQuestion.onYes;
        if (u.with_genres) u.with_genres.split(',').forEach((g) => nextFilters.with_genres.add(g));
        if (u.without_genres) u.without_genres.split(',').forEach((g) => nextFilters.without_genres.add(g));
        if (u.with_keywords) u.with_keywords.split('|').forEach((k) => nextFilters.with_keywords.add(k));
        if (u.primary_release_date_gte) nextFilters.primary_release_date_gte = u.primary_release_date_gte;
        if (u.primary_release_date_lte) nextFilters.primary_release_date_lte = u.primary_release_date_lte;
        if (u.vote_count_gte) nextFilters.vote_count_gte = u.vote_count_gte;
        if (u.vote_average_gte) nextFilters.vote_average_gte = u.vote_average_gte;
      } else if (answer === 'no' && currentQuestion.onNo) {
        const u = currentQuestion.onNo;
        if (u.without_genres) u.without_genres.split(',').forEach((g) => nextFilters.without_genres.add(g));
        if (u.without_keywords) u.without_keywords.split(',').forEach((k) => nextFilters.without_keywords.add(k));
        if (u.primary_release_date_gte) nextFilters.primary_release_date_gte = u.primary_release_date_gte;
        if (u.primary_release_date_lte) nextFilters.primary_release_date_lte = u.primary_release_date_lte;
      }

      setFilters(nextFilters);

      const newHistory = [...history, { q: currentQuestion, answer }];
      const newAsked = new Set(askedIds);
      newAsked.add(currentQuestion.id);
      const newCount = questionCount + 1;

      setHistory(newHistory);
      setAskedIds(newAsked);
      setQuestionCount(newCount);

      // 2. Query Live TMDb across all 1,000,000+ movies
      const liveDiscovered = await queryLiveTMDbDiscover(nextFilters, 2);

      // 3. Merge newly discovered live movies into candidate pool
      const updatedMap = new Map(allMovies);
      liveDiscovered.forEach((m) => updatedMap.set(String(m.id), m));
      setAllMovies(updatedMap);
      setLiveDbHits(updatedMap.size);

      // 4. Score all movies against entire history
      const scored = scoreAllMovies(Array.from(updatedMap.values()), newHistory, clueMatches);
      setScoredPool(scored);
      setIsQueryingTMDb(false);

      // 5. Check if ready to reveal
      const topScore = scored[0]?.score || 0;
      const secondScore = scored[1]?.score || 0;
      const confidentLead = newCount >= 8 && topScore - secondScore >= 6.0;

      if (newCount >= MAX_QUESTIONS || confidentLead) {
        setPhase('results');
        setCurrentQuestion(null);
      } else {
        const nextQ = selectNextQuestion(scored, newAsked);
        setCurrentQuestion(nextQ || null);
        if (!nextQ) setPhase('results');
      }
    },
    [currentQuestion, filters, history, askedIds, questionCount, allMovies, clueMatches]
  );

  // Apply a clue directly across TMDb's live database (actor, character, or plot word)
  const handleApplyClue = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = clueText.trim();
    if (!clean) return;

    setIsQueryingTMDb(true);
    const searchResults = await searchLiveTMDb(clean);

    const updatedMap = new Map(allMovies);
    const newClueIds = new Set(clueMatches);

    searchResults.forEach((m) => {
      const idStr = String(m.id);
      updatedMap.set(idStr, m);
      newClueIds.add(idStr);
    });

    setAllMovies(updatedMap);
    setClueMatches(newClueIds);
    setLiveDbHits(updatedMap.size);

    const scored = scoreAllMovies(Array.from(updatedMap.values()), history, newClueIds);
    setScoredPool(scored);
    setClueText('');
    setIsQueryingTMDb(false);
  };

  const handleReset = () => {
    setPhase('loading');
    const initFilters = createInitialFilters();
    setFilters(initFilters);
    setAskedIds(new Set());
    setQuestionCount(0);
    setHistory([]);
    setClueMatches(new Set());
    setClueText('');

    queryLiveTMDbDiscover(initFilters, 3).then((movies) => {
      const map = new Map<string, Movie>();
      movies.forEach((m) => map.set(String(m.id), m));
      setAllMovies(map);
      setLiveDbHits(map.size);

      const scored = scoreAllMovies(Array.from(map.values()), []);
      setScoredPool(scored);

      const firstQ = selectNextQuestion(scored, new Set());
      setCurrentQuestion(firstQ);
      setPhase('asking');
    });
  };

  if (!isOpen) return null;

  const progressPct = questionCount / MAX_QUESTIONS;
  const topCandidates = scoredPool.slice(0, 10).map((s) => s.movie);
  const finalResults = scoredPool.slice(0, 10).map((s) => s.movie);

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col items-center animate-fade-in overflow-hidden">
      {/* Header Bar */}
      <div className="w-full max-w-4xl px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
            <Clapperboard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base sm:text-lg tracking-tight">Movie Finder</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Globe2 className="w-3 h-3" /> Live TMDb (1M+ Movies)
              </span>
            </div>
            <p className="text-neutral-500 text-xs hidden sm:block">
              {phase === 'asking' && `Question ${questionCount + 1} of up to ${MAX_QUESTIONS} — Querying live database`}
              {phase === 'results' && 'Top candidate matches from TMDb'}
              {phase === 'loading' && 'Connecting to TMDb global film directory...'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Movie Finder"
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── LOADING PHASE ── */}
      {phase === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <Globe2 className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-white font-bold text-lg sm:text-xl">Connecting to TMDb Live...</p>
          <p className="text-neutral-400 text-sm">Searching across 1,000,000+ indexed cinema titles</p>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Calibrating live decision tree...</span>
          </div>
        </div>
      )}

      {/* ── ASKING PHASE ── */}
      {phase === 'asking' && currentQuestion && (
        <div className="flex-1 flex flex-col items-center w-full max-w-4xl px-4 overflow-hidden">
          {/* Progress bar */}
          <div className="w-full my-3 shrink-0">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5 font-medium">
              <span>Question {questionCount} of 20</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                {isQueryingTMDb ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Searching live TMDb...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{liveDbHits} live candidate matches</span>
                  </>
                )}
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(progressPct * 100, 5)}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="w-full max-w-2xl bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 my-auto shrink-0 text-center shadow-2xl backdrop-blur-md">
            <p className="text-amber-400/90 text-xs font-bold uppercase tracking-widest mb-3">
              Think of your movie...
            </p>
            <h2 className="text-white text-xl sm:text-3xl font-extrabold leading-snug mb-2 tracking-tight">
              {currentQuestion.question}
            </h2>
            {currentQuestion.hint && (
              <p className="text-neutral-400 text-sm mt-2">{currentQuestion.hint}</p>
            )}

            {/* Answer Buttons (No, Sometimes, Not Sure, Yes) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6">
              {/* NO */}
              <button
                disabled={isQueryingTMDb}
                onClick={() => handleAnswer('no')}
                className="flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl bg-red-950/60 border border-red-600/50 hover:border-red-500 hover:bg-red-900/60 text-red-300 hover:text-white transition active:scale-95 font-bold text-sm sm:text-base shadow disabled:opacity-50"
              >
                <XCircle className="w-5 h-5 text-red-400" />
                <span>No</span>
              </button>

              {/* SOMETIMES */}
              <button
                disabled={isQueryingTMDb}
                onClick={() => handleAnswer('sometimes')}
                className="flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 hover:border-amber-400 hover:bg-amber-900/60 text-amber-300 hover:text-white transition active:scale-95 font-bold text-sm sm:text-base shadow disabled:opacity-50"
              >
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>Sometimes</span>
              </button>

              {/* NOT SURE */}
              <button
                disabled={isQueryingTMDb}
                onClick={() => handleAnswer('skip')}
                className="flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl bg-neutral-800/80 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 font-semibold text-sm shadow disabled:opacity-50"
              >
                <Minus className="w-5 h-5 text-neutral-400" />
                <span>Not sure</span>
              </button>

              {/* YES */}
              <button
                disabled={isQueryingTMDb}
                onClick={() => handleAnswer('yes')}
                className="flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-900/60 text-emerald-300 hover:text-white transition active:scale-95 font-bold text-sm sm:text-base shadow disabled:opacity-50"
              >
                <Check className="w-5 h-5 text-emerald-400" />
                <span>Yes</span>
              </button>
            </div>
          </div>

          {/* Optional Clue Bar: Query live TMDb by actor, keyword, or character */}
          <form
            onSubmit={handleApplyClue}
            className="w-full max-w-xl flex items-center gap-2 mb-3 shrink-0"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clueText}
                onChange={(e) => setClueText(e.target.value)}
                placeholder="Remember an actor, word, or character? (Live search TMDB)"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            {clueText && (
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shrink-0"
              >
                Search Clue
              </button>
            )}
          </form>

          {/* Live Top Candidate Thumbnails with Click-to-Finish */}
          {topCandidates.length > 0 && (
            <div className="w-full shrink-0 mt-auto pb-3">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-neutral-400 text-xs font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Top live matches from TMDB — click anytime to finish:
                </span>
                <span className="text-neutral-500 text-[11px]">
                  Top {topCandidates.length}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
                {topCandidates.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMovie?.(m);
                      onClose();
                    }}
                    className="group relative flex-shrink-0 w-16 sm:w-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 hover:border-amber-400 hover:scale-105 transition-all shadow-lg active:scale-95 text-left"
                    title={`"${m.title}" (${m.release_date?.slice(0, 4)}) — Click if this is it!`}
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
                      <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-[9px] text-amber-400 font-bold">
                        #{idx + 1}
                      </div>
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS PHASE ── */}
      {phase === 'results' && (
        <div className="flex-1 flex flex-col items-center w-full max-w-4xl px-4 overflow-y-auto pb-6">
          <div className="text-center my-4 shrink-0">
            <h2 className="text-white text-2xl sm:text-3xl font-extrabold mb-1">
              🎬 Is it one of these movies?
            </h2>
            <p className="text-neutral-400 text-sm">
              Identified across live TMDb database after {questionCount} questions
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full mb-6">
            {finalResults.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => {
                  onSelectMovie?.(m);
                  onClose();
                }}
                className="group flex flex-col rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-amber-500/80 transition active:scale-95 text-left shadow-lg"
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
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 border border-white/10 text-[10px] text-amber-400 font-bold">
                    #{idx + 1} Match
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-[10px] text-amber-400 font-bold">
                      ★ {m.vote_average?.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {m.release_date?.slice(0, 4)}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 bg-neutral-900">
                  <p className="text-white text-xs font-bold line-clamp-1 leading-tight group-hover:text-amber-400">
                    {m.title}
                  </p>
                  <p className="text-neutral-500 text-[10px] mt-0.5 truncate">
                    {m.genres?.slice(0, 2).join(' • ') || 'Cinema'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition shadow"
            >
              <RefreshCw className="w-4 h-4" /> Try Another Movie
            </button>
            <button
              onClick={() => {
                const nextQ = selectNextQuestion(scoredPool, askedIds);
                if (nextQ) {
                  setCurrentQuestion(nextQ);
                  setPhase('asking');
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-semibold text-sm transition"
            >
              Keep Answering <ChevronRight className="w-4 h-4" />
            </button>
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
