'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Clapperboard,
  RefreshCw,
  Check,
  Minus,
  XCircle,
  HelpCircle,
  Search,
  Globe2,
  Loader2,
  ChevronDown,
  Building2,
  Calendar,
  Sparkles,
  SlidersHorizontal
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
  POPULAR_STUDIOS,
} from '@/lib/tmdb/movieFinder';

interface MovieFinderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

const MAX_QUESTIONS = 20;

const OPTIONAL_ERA_CLUES = [
  { label: 'Before 2010', lte: '2009-12-31' },
  { label: 'After 2000', gte: '2001-01-01' },
  { label: '2010s', gte: '2010-01-01', lte: '2019-12-31' },
  { label: '2000s', gte: '2000-01-01', lte: '2009-12-31' },
  { label: '1990s', gte: '1990-01-01', lte: '1999-12-31' },
  { label: '1980s', gte: '1980-01-01', lte: '1989-12-31' },
  { label: 'Pre-1980', lte: '1979-12-31' },
];

export const MovieFinderWizard: React.FC<MovieFinderWizardProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
}) => {
  const [filters, setFilters] = useState<LiveDiscoverFilters>(createInitialFilters());
  const [allMovies, setAllMovies] = useState<Map<string, Movie>>(new Map());
  const [scoredPool, setScoredPool] = useState<ScoredMovie[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<WizardQuestion | null>(null);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(0);
  const [history, setHistory] = useState<{ q: WizardQuestion; answer: WizardAnswer }[]>([]);
  const [clueMatches, setClueMatches] = useState<Set<string>>(new Set());
  const [hasAnsweredEra, setHasAnsweredEra] = useState<boolean>(false);

  // Optional clue inputs (user can use these or completely ignore them)
  const [showOptionalHelpers, setShowOptionalHelpers] = useState(true);
  const [selectedOptionalStudio, setSelectedOptionalStudio] = useState<string>('');
  const [selectedOptionalEra, setSelectedOptionalEra] = useState<string>('');
  const [clueText, setClueText] = useState('');
  const [filterWithinText, setFilterWithinText] = useState('');
  const [isQueryingTMDb, setIsQueryingTMDb] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Prevent background body scroll leak
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Initial live TMDb query when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setClueText('');
    setFilterWithinText('');
    setSelectedOptionalStudio('');
    setSelectedOptionalEra('');
    setHasAnsweredEra(false);
    setCurrentPage(1);

    const initFilters = createInitialFilters();
    setFilters(initFilters);
    setAskedIds(new Set());
    setQuestionCount(0);
    setHistory([]);
    setClueMatches(new Set());
    setIsQueryingTMDb(true);

    queryLiveTMDbDiscover(initFilters, 3, 1).then((movies) => {
      const map = new Map<string, Movie>();
      movies.forEach((m) => map.set(String(m.id), m));
      setAllMovies(map);

      const scored = scoreAllMovies(Array.from(map.values()), []);
      setScoredPool(scored);

      const firstQ = selectNextQuestion(scored, new Set(), false);
      setCurrentQuestion(firstQ);
      setIsQueryingTMDb(false);
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

  // Execute Live TMDb discover query with updated filters and active set of asked IDs
  const executeLiveQueryWithFilters = useCallback(
    async (
      updatedFilters: LiveDiscoverFilters,
      updatedHistory: { q: WizardQuestion; answer: WizardAnswer }[],
      updatedAskedIds: Set<string>,
      updatedClueMatches: Set<string>,
      newCount: number,
      eraAnswered: boolean
    ) => {
      setIsQueryingTMDb(true);
      setCurrentPage(1);

      const liveDiscovered = await queryLiveTMDbDiscover(updatedFilters, 2, 1);

      const updatedMap = new Map(allMovies);
      liveDiscovered.forEach((m) => updatedMap.set(String(m.id), m));
      setAllMovies(updatedMap);

      const scored = scoreAllMovies(Array.from(updatedMap.values()), updatedHistory, updatedClueMatches);
      setScoredPool(scored);
      setIsQueryingTMDb(false);

      // Advance to next question using updatedAskedIds (resolves double-click bug)
      if (newCount < MAX_QUESTIONS) {
        const nextQ = selectNextQuestion(scored, updatedAskedIds, eraAnswered);
        setCurrentQuestion(nextQ || null);
      } else {
        setCurrentQuestion(null);
      }
    },
    [allMovies]
  );

  // 100% Yes / Sometimes / Not sure / No answers for all questions
  const handleAnswer = useCallback(
    async (answer: WizardAnswer) => {
      if (!currentQuestion) return;

      const nextFilters: LiveDiscoverFilters = {
        with_genres: new Set(filters.with_genres),
        without_genres: new Set(filters.without_genres),
        with_keywords: new Set(filters.with_keywords),
        without_keywords: new Set(filters.without_keywords),
        with_companies: filters.with_companies,
        primary_release_date_gte: filters.primary_release_date_gte,
        primary_release_date_lte: filters.primary_release_date_lte,
        vote_count_gte: filters.vote_count_gte,
        vote_average_gte: filters.vote_average_gte,
        with_original_language: filters.with_original_language,
      };

      let eraAnswered = hasAnsweredEra;

      if (answer === 'yes' && currentQuestion.onYes) {
        const u = currentQuestion.onYes;
        if (u.with_genres) u.with_genres.split(',').forEach((g) => nextFilters.with_genres.add(g));
        if (u.without_genres) u.without_genres.split(',').forEach((g) => nextFilters.without_genres.add(g));
        if (u.with_keywords) u.with_keywords.split('|').forEach((k) => nextFilters.with_keywords.add(k));
        if (u.with_companies) nextFilters.with_companies = u.with_companies;
        if (u.primary_release_date_gte) nextFilters.primary_release_date_gte = u.primary_release_date_gte;
        if (u.primary_release_date_lte) nextFilters.primary_release_date_lte = u.primary_release_date_lte;
        if (u.vote_count_gte) nextFilters.vote_count_gte = u.vote_count_gte;
        if (u.vote_average_gte) nextFilters.vote_average_gte = u.vote_average_gte;
        if (currentQuestion.isEra) eraAnswered = true;
      } else if (answer === 'no' && currentQuestion.onNo) {
        const u = currentQuestion.onNo;
        if (u.without_genres) u.without_genres.split(',').forEach((g) => nextFilters.without_genres.add(g));
        if (u.without_keywords) u.without_keywords.split(',').forEach((k) => nextFilters.without_keywords.add(k));
        if (u.primary_release_date_gte) nextFilters.primary_release_date_gte = u.primary_release_date_gte;
        if (u.primary_release_date_lte) nextFilters.primary_release_date_lte = u.primary_release_date_lte;
        if (currentQuestion.isEra) eraAnswered = true;
      } else if (answer === 'skip' && currentQuestion.isEra) {
        // If user says "Not sure" to an era, never ask about eras again
        eraAnswered = true;
      }

      setFilters(nextFilters);
      setHasAnsweredEra(eraAnswered);

      const newHistory = [...history, { q: currentQuestion, answer }];
      const newAsked = new Set(askedIds);
      newAsked.add(currentQuestion.id);
      const newCount = questionCount + 1;

      setHistory(newHistory);
      setAskedIds(newAsked);
      setQuestionCount(newCount);

      // Execute live query immediately (no double-click needed!)
      executeLiveQueryWithFilters(nextFilters, newHistory, newAsked, clueMatches, newCount, eraAnswered);
    },
    [currentQuestion, filters, hasAnsweredEra, history, askedIds, questionCount, clueMatches, executeLiveQueryWithFilters]
  );

  // Optional Extra Info: Click a studio chip if desired
  const handleSelectOptionalStudio = (companyId: string, label: string) => {
    setSelectedOptionalStudio(label);
    const nextFilters: LiveDiscoverFilters = {
      ...filters,
      with_companies: companyId || undefined,
    };
    setFilters(nextFilters);
    executeLiveQueryWithFilters(nextFilters, history, askedIds, clueMatches, questionCount, hasAnsweredEra);
  };

  // Optional Extra Info: Click an era chip if desired
  const handleSelectOptionalEra = (opt: { label: string; gte?: string; lte?: string }) => {
    setSelectedOptionalEra(opt.label);
    const nextFilters: LiveDiscoverFilters = {
      ...filters,
      primary_release_date_gte: opt.gte,
      primary_release_date_lte: opt.lte,
    };
    setFilters(nextFilters);
    setHasAnsweredEra(true);
    executeLiveQueryWithFilters(nextFilters, history, askedIds, clueMatches, questionCount, true);
  };

  // Optional Extra Info: Search live TMDb by actor, keyword, or character
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

    const scored = scoreAllMovies(Array.from(updatedMap.values()), history, newClueIds);
    setScoredPool(scored);
    setClueText('');
    setIsQueryingTMDb(false);
  };

  // Load More movies from TMDb (pagination)
  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    const more = await queryLiveTMDbDiscover(filters, 2, nextPage);
    const updatedMap = new Map(allMovies);
    more.forEach((m) => updatedMap.set(String(m.id), m));
    setAllMovies(updatedMap);

    const scored = scoreAllMovies(Array.from(updatedMap.values()), history, clueMatches);
    setScoredPool(scored);
    setIsLoadingMore(false);
  };

  const handleReset = () => {
    setClueText('');
    setFilterWithinText('');
    setSelectedOptionalStudio('');
    setSelectedOptionalEra('');
    setHasAnsweredEra(false);
    setCurrentPage(1);

    const initFilters = createInitialFilters();
    setFilters(initFilters);
    setAskedIds(new Set());
    setQuestionCount(0);
    setHistory([]);
    setClueMatches(new Set());
    setIsQueryingTMDb(true);

    queryLiveTMDbDiscover(initFilters, 3, 1).then((movies) => {
      const map = new Map<string, Movie>();
      movies.forEach((m) => map.set(String(m.id), m));
      setAllMovies(map);

      const scored = scoreAllMovies(Array.from(map.values()), []);
      setScoredPool(scored);

      const firstQ = selectNextQuestion(scored, new Set(), false);
      setCurrentQuestion(firstQ);
      setIsQueryingTMDb(false);
    });
  };

  // ── ACTIVE NARROWING: Only display movies that positively match answers! ──
  const qualifyingScored = useMemo(() => {
    if (questionCount === 0 && !selectedOptionalStudio && !selectedOptionalEra && clueMatches.size === 0) {
      return scoredPool;
    }
    // Keep movies with positive score (score >= 0.5)
    const threshold = 0.5;
    const filtered = scoredPool.filter((s) => s.score >= threshold);
    return filtered.length > 0 ? filtered : scoredPool.slice(0, 8);
  }, [scoredPool, questionCount, selectedOptionalStudio, selectedOptionalEra, clueMatches]);

  // Filter within current results for quick title testing
  const displayedCandidates = useMemo(() => {
    const list = qualifyingScored.map((s) => s.movie);
    if (!filterWithinText.trim()) return list;
    const q = filterWithinText.toLowerCase().trim();
    return list.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.overview || '').toLowerCase().includes(q) ||
        (m.release_date || '').includes(q)
    );
  }, [qualifyingScored, filterWithinText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col items-center animate-fade-in overflow-hidden overscroll-contain">
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
            <Clapperboard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base sm:text-lg tracking-tight">Movie Finder</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Globe2 className="w-3 h-3" /> Live TMDb
              </span>
            </div>
            <p className="text-neutral-500 text-[11px] hidden sm:block">
              Answer Yes or No to narrow down all 1,000,000+ movies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            title="Reset wizard and start over"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-amber-500/40 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Start Over</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Close Movie Finder"
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 w-full max-w-5xl overflow-y-auto px-4 py-4 space-y-4 overscroll-contain">
        {/* ── 100% YES OR NO QUESTION CARD (PRIMARY INTERFACE) ── */}
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-7 text-center shadow-xl relative overflow-hidden">
          {/* Header & Match Counter */}
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
            <span className="font-bold text-amber-400 uppercase tracking-widest text-[11px]">
              Question {Math.min(questionCount + 1, MAX_QUESTIONS)} of {MAX_QUESTIONS}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              {isQueryingTMDb ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span className="text-amber-400">Narrowing TMDb...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold">
                    {displayedCandidates.length} matching movies
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Current Question Text */}
          {questionCount < MAX_QUESTIONS && currentQuestion ? (
            <div className="space-y-2 max-w-xl mx-auto py-2">
              <h2 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight">
                {currentQuestion.question}
              </h2>
              {currentQuestion.hint && (
                <p className="text-neutral-400 text-xs sm:text-sm">{currentQuestion.hint}</p>
              )}

              {/* 4 Answers: YES on Left, NO on the FAR RIGHT */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
                {/* 1. YES (Green) */}
                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('yes')}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/60 hover:border-emerald-400 hover:bg-emerald-900/80 text-emerald-300 hover:text-white transition active:scale-95 font-bold text-sm shadow disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Yes</span>
                </button>

                {/* 2. SOMETIMES (Amber) */}
                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('sometimes')}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-950/70 border border-amber-500/60 hover:border-amber-400 hover:bg-amber-900/80 text-amber-300 hover:text-white transition active:scale-95 font-bold text-sm shadow disabled:opacity-50"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Sometimes</span>
                </button>

                {/* 3. NOT SURE (Gray) */}
                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('skip')}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-800/90 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 font-semibold text-sm shadow disabled:opacity-50"
                >
                  <Minus className="w-4 h-4 text-neutral-400" />
                  <span>Not sure</span>
                </button>

                {/* 4. NO (Red on the FAR RIGHT) */}
                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('no')}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-950/70 border border-red-600/60 hover:border-red-500 hover:bg-red-900/80 text-red-300 hover:text-white transition active:scale-95 font-bold text-sm shadow disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span>No</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <h2 className="text-white text-xl sm:text-2xl font-extrabold">
                🎯 20 Questions Complete!
              </h2>
              <p className="text-neutral-400 text-sm">
                We narrowed down to the closest matching movies below. Click yours to select it!
              </p>
            </div>
          )}
        </div>

        {/* ── OPTIONAL "GIVE EXTRA CLUES" AREA (NOT PRIMARY, PURELY OPTIONAL) ── */}
        <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-2xl p-3 sm:p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Optional Extra Clues (Know a hint? Click or type below):</span>
            </span>
            <button
              onClick={() => setShowOptionalHelpers(!showOptionalHelpers)}
              className="text-[11px] text-amber-400 hover:underline"
            >
              {showOptionalHelpers ? 'Hide Clues' : 'Show Clues'}
            </button>
          </div>

          {showOptionalHelpers && (
            <div className="space-y-2.5 pt-1 border-t border-neutral-800/70">
              {/* Optional Studio chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-semibold text-neutral-500 shrink-0 mr-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-amber-400" /> Studio:
                </span>
                {POPULAR_STUDIOS.filter((s) => s.id !== 'all').map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectOptionalStudio(s.companyId, s.label)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition shrink-0 border ${
                      selectedOptionalStudio === s.label
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Optional Era chips (includes broad "Before 2010", "After 2000") */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-semibold text-neutral-500 shrink-0 mr-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" /> Year:
                </span>
                {OPTIONAL_ERA_CLUES.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => handleSelectOptionalEra(d)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition shrink-0 border ${
                      selectedOptionalEra === d.label
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Optional keyword / actor search input */}
              <form onSubmit={handleApplyClue} className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clueText}
                    onChange={(e) => setClueText(e.target.value)}
                    placeholder="Know a specific actor, character, or clue? (e.g. Robin Williams, magic lamp)"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shrink-0 shadow"
                >
                  Add Clue
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── LIVE MATCHED MOVIES BROWSER (Actively narrowing down!) ── */}
        <div className="space-y-3 pt-2">
          {/* Subheader with title filter for instant testing */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-white font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>Matching Candidates</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  {displayedCandidates.length} movies
                </span>
              </h3>
              <p className="text-neutral-400 text-xs mt-0.5">
                Narrowing with each Yes / No answer — click any movie anytime to select it!
              </p>
            </div>

            {/* Quick search input within the current matches */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterWithinText}
                onChange={(e) => setFilterWithinText(e.target.value)}
                placeholder="Filter these candidates by title..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              {filterWithinText && (
                <button
                  onClick={() => setFilterWithinText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Grid of ALL matching movies */}
          {displayedCandidates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {displayedCandidates.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMovie?.(m);
                    onClose();
                  }}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-amber-400 hover:scale-[1.02] transition-all duration-200 active:scale-95 text-left shadow-md relative"
                >
                  <div className="relative w-full aspect-[2/3] bg-neutral-950 overflow-hidden">
                    {m.poster_path ? (
                      <img
                        src={m.poster_path}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs p-2 text-center">
                        🎬 {m.title}
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 border border-white/10 text-[10px] text-amber-400 font-bold">
                      #{idx + 1}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px]">
                      <span className="text-amber-400 font-bold">★ {m.vote_average?.toFixed(1) || '7.5'}</span>
                      <span className="text-neutral-400">{m.release_date?.slice(0, 4)}</span>
                    </div>

                    {/* Hover indicator: That's it! */}
                    <div className="absolute inset-0 bg-amber-500/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-black text-xs shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        That&apos;s It!
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-neutral-900">
                    <p className="text-white text-xs font-bold truncate group-hover:text-amber-400 leading-tight">
                      {m.title}
                    </p>
                    <p className="text-neutral-500 text-[10px] truncate mt-0.5">
                      {m.genres?.slice(0, 2).join(' • ') || 'Cinema'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-400 bg-neutral-900/40 rounded-2xl border border-neutral-800">
              <p className="font-semibold text-white">No candidates meet all answers.</p>
              <p className="text-xs text-neutral-500 mt-1">
                Try clicking &quot;Start Over&quot; or clearing your filter above!
              </p>
            </div>
          )}

          {/* Load More from TMDb Button */}
          {displayedCandidates.length > 0 && (
            <div className="flex justify-center pt-2 pb-6">
              <button
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition shadow"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Loading more from TMDb...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-amber-400" />
                    <span>Load More Movies from TMDb</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
