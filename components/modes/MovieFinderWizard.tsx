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
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';
import {
  queryLiveTMDbDiscover,
  searchLiveTMDb,
  scoreAllMovies,
  selectSmartNextQuestion,
  createInitialFilters,
  LiveDiscoverFilters,
  WizardQuestion,
  WizardAnswer,
  ScoredMovie,
  fetchTopActorsForCandidates,
  generateDynamicQuestion,
  getNarrowingInsight,
  markRelatedAskedIds,
  filterPoolByHistory,
  hasHardDiscoverFilters,
  ActorCandidate,
  POPULAR_STUDIOS,
  MUTUAL_EXCLUSIONS,
  EQUIVALENT_QUESTIONS,
} from '@/lib/tmdb/movieFinder';

interface MovieFinderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

const MAX_STANDARD_QUESTIONS = 20;

const COMPACT_STUDIO_PILLS = [
  { label: '🏰 Disney/Pixar', companyId: '2|3' },
  { label: '💥 Marvel', companyId: '420' },
  { label: '🐼 DreamWorks', companyId: '521' },
  { label: '🍃 Ghibli', companyId: '10342' },
  { label: '🛡️ Warner', companyId: '174' },
];

const COMPACT_ERA_PILLS = [
  { label: '< 2010', lte: '2009-12-31' },
  { label: '> 2000', gte: '2001-01-01' },
  { label: '90s', gte: '1990-01-01', lte: '1999-12-31' },
  { label: '80s', gte: '1980-01-01', lte: '1989-12-31' },
  { label: 'Classic', lte: '1979-12-31' },
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
  const [rejectedActorIds, setRejectedActorIds] = useState<Set<number>>(new Set());
  const [hasAnsweredEra, setHasAnsweredEra] = useState<boolean>(false);

  // Active filter indicator pills
  const [activeStudioPill, setActiveStudioPill] = useState<string>('');
  const [activeEraPill, setActiveEraPill] = useState<string>('');

  // Dynamic actor faces from remaining candidates
  const [candidateActors, setCandidateActors] = useState<ActorCandidate[]>([]);

  // Search & Clue inputs
  const [miniClueText, setMiniClueText] = useState('');
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

    setMiniClueText('');
    setFilterWithinText('');
    setActiveStudioPill('');
    setActiveEraPill('');
    setHasAnsweredEra(false);
    setRejectedActorIds(new Set());
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

      const firstQ = selectSmartNextQuestion(scored, new Set(), false, 0);
      setCurrentQuestion(firstQ);
      setIsQueryingTMDb(false);

      fetchTopActorsForCandidates(movies.slice(0, 10)).then(setCandidateActors);
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

  // ── ACTIVE NARROWING: Dynamically narrows candidate pool down to top matches! ──
  const qualifyingScored = useMemo(() => {
    // Hard drop movies that contradict Yes/No answers (Akinator constraints)
    const constrainedMovies = filterPoolByHistory(
      scoredPool.map((s) => s.movie),
      history
    );
    const constrainedIds = new Set(constrainedMovies.map((m) => String(m.id)));
    const basePool =
      constrainedMovies.length > 0
        ? scoredPool.filter((s) => constrainedIds.has(String(s.movie.id)))
        : scoredPool;

    if (questionCount === 0 && !activeStudioPill && !activeEraPill && clueMatches.size === 0) {
      return basePool;
    }
    if (basePool.length === 0) return [];

    const topScore = basePool[0]?.score ?? 0;
    
    // Adaptive narrowing: as questions progress, candidates must stay within a percentage of the leader
    let leaderRatio = 0.70;
    let minBase = 1.0;
    if (questionCount >= 20) {
      leaderRatio = 0.35;
      minBase = 8.0;
    } else if (questionCount >= 10) {
      leaderRatio = 0.45;
      minBase = 5.5;
    } else if (questionCount >= 4) {
      leaderRatio = 0.55;
      minBase = 3.0;
    }

    const threshold = Math.max(minBase, topScore * leaderRatio);
    const filtered = basePool.filter((s) => s.score >= threshold);

    let maxToShow = 100;
    if (questionCount >= 20) maxToShow = 15;
    else if (questionCount >= 12) maxToShow = 30;
    else if (questionCount >= 6) maxToShow = 50;

    if (filtered.length > 0) {
      return filtered.slice(0, maxToShow);
    }
    return basePool.slice(0, Math.min(8, maxToShow));
  }, [scoredPool, questionCount, activeStudioPill, activeEraPill, clueMatches, history]);

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

  // Refresh candidate actors (compact)
  useEffect(() => {
    if (displayedCandidates.length > 1 && displayedCandidates.length <= 40) {
      fetchTopActorsForCandidates(displayedCandidates.slice(0, 10)).then((actors) => {
        // Filter out any actors that were previously rejected
        setCandidateActors(actors.filter((a) => !rejectedActorIds.has(a.id)));
      });
    } else if (displayedCandidates.length <= 1) {
      setCandidateActors([]);
    }
  }, [displayedCandidates.length, rejectedActorIds]);

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

      const liveDiscovered = await queryLiveTMDbDiscover(updatedFilters, 3, 1);
      const hard = hasHardDiscoverFilters(updatedFilters);

      let workingMap: Map<string, Movie>;
      if (hard && liveDiscovered.length > 0) {
        // REPLACE the pool when studio/genre/era filters are on (Disney pill must actually change results)
        workingMap = new Map();
        liveDiscovered.forEach((m) => workingMap.set(String(m.id), m));
        // Keep user clue hits even if outside this discover page
        updatedClueMatches.forEach((id) => {
          const existing = allMovies.get(id);
          if (existing) workingMap.set(id, existing);
        });
      } else if (hard && liveDiscovered.length === 0) {
        // Discover returned nothing — keep prior pool but still rescore against history
        workingMap = new Map(allMovies);
      } else {
        // Soft merge when still exploring broadly
        workingMap = new Map(allMovies);
        liveDiscovered.forEach((m) => workingMap.set(String(m.id), m));
      }

      setAllMovies(workingMap);

      const constrained = filterPoolByHistory(Array.from(workingMap.values()), updatedHistory);
      const scored = scoreAllMovies(
        constrained.length > 0 ? constrained : Array.from(workingMap.values()),
        updatedHistory,
        updatedClueMatches
      );
      setScoredPool(scored);
      setIsQueryingTMDb(false);

      let nextQ = selectSmartNextQuestion(
        scored,
        updatedAskedIds,
        eraAnswered,
        newCount,
        updatedHistory
      );

      if (!nextQ) {
        const topScore = scored[0]?.score ?? 0;
        const dynamicThreshold = Math.max(3.0, topScore * 0.4);
        const topRemaining = scored.filter((s) => s.score >= dynamicThreshold).map((s) => s.movie);
        const pool = topRemaining.length >= 2 ? topRemaining : scored.slice(0, 15).map((s) => s.movie);
        nextQ = generateDynamicQuestion(pool, updatedAskedIds, candidateActors);
        if (nextQ) {
          nextQ = {
            ...nextQ,
            focusHint: getNarrowingInsight(pool, newCount).hint,
          };
        }
      }

      setCurrentQuestion(nextQ || null);
    },
    [allMovies, candidateActors]
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

      const newAsked = new Set(askedIds);
      markRelatedAskedIds(currentQuestion.id, newAsked);

      // ── Smart Question Implication ──
      const CLUSTER_EXCLUSION_ALIAS: Record<string, string> = {
        cluster_genre_animation: 'animated',
        cluster_genre_comedy: 'comedy',
        cluster_genre_horror: 'horror',
        cluster_genre_action: 'action',
        cluster_genre_thriller: 'thriller',
        cluster_genre_romance: 'romance',
        cluster_genre_science_fiction: 'scifi',
        cluster_genre_fantasy: 'fantasy_magic',
        cluster_genre_crime: 'crime',
        cluster_genre_mystery: 'detective',
        cluster_genre_war: 'war',
        cluster_genre_family: 'theme_family_children',
        cluster_genre_music: 'musical',
      };
      const exclusionLookupIds = [
        currentQuestion.id,
        CLUSTER_EXCLUSION_ALIAS[currentQuestion.id],
      ].filter(Boolean) as string[];

      if (answer === 'yes') {
        for (const key of exclusionLookupIds) {
          if (MUTUAL_EXCLUSIONS[key]) {
            MUTUAL_EXCLUSIONS[key].forEach((id) => newAsked.add(id));
          }
          if (EQUIVALENT_QUESTIONS[key]) {
            EQUIVALENT_QUESTIONS[key].forEach((id) => newAsked.add(id));
          }
        }
      } else if (answer === 'skip' || answer === 'no' || answer === 'sometimes') {
        for (const key of exclusionLookupIds) {
          if (EQUIVALENT_QUESTIONS[key]) {
            EQUIVALENT_QUESTIONS[key].forEach((id) => newAsked.add(id));
          }
        }
      }

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
        eraAnswered = true;
      }

      setFilters(nextFilters);
      setHasAnsweredEra(eraAnswered);

      const newHistory = [...history, { q: currentQuestion, answer }];
      const newCount = questionCount + 1;

      setHistory(newHistory);
      setAskedIds(newAsked);
      setQuestionCount(newCount);

      // Execute live query immediately (no double-click!)
      executeLiveQueryWithFilters(nextFilters, newHistory, newAsked, clueMatches, newCount, eraAnswered);
    },
    [currentQuestion, filters, hasAnsweredEra, history, askedIds, questionCount, clueMatches, executeLiveQueryWithFilters]
  );

  // ── CLICK ON ACTOR PICTURE: Instantly selects actor and narrows candidates! ──
  const handleSelectActorFace = (actor: ActorCandidate) => {
    const actorQ: WizardQuestion = {
      id: `actor_face_${actor.id}`,
      question: `Stars ${actor.name}`,
      match: (m) => (actor.movieIds.has(Number(m.id)) ? 1.0 : 0.0),
    };

    const newClueIds = new Set(clueMatches);
    actor.movieIds.forEach((id) => newClueIds.add(String(id)));
    setClueMatches(newClueIds);

    const newHistory = [...history, { q: actorQ, answer: 'yes' as WizardAnswer }];
    const newAsked = new Set(askedIds);
    newAsked.add(actorQ.id);
    const newCount = questionCount + 1;

    setHistory(newHistory);
    setAskedIds(newAsked);
    setQuestionCount(newCount);

    const scored = scoreAllMovies(Array.from(allMovies.values()), newHistory, newClueIds);
    setScoredPool(scored);

    let nextQ = selectSmartNextQuestion(scored, newAsked, hasAnsweredEra, newCount, newHistory);
    if (!nextQ) {
      const filtered = filterPoolByHistory(
        scored.filter((s) => s.score >= 0.5).map((s) => s.movie),
        newHistory
      );
      nextQ = generateDynamicQuestion(filtered, newAsked, candidateActors);
      if (nextQ) {
        nextQ = { ...nextQ, focusHint: getNarrowingInsight(filtered, newCount).hint };
      }
    }
    setCurrentQuestion(nextQ || null);
  };

  // ── NONE OF THESE ACTORS: Completely eliminates movies with these actors and clears photos! ──
  const handleRejectAllActors = () => {
    const rejectedIds = new Set(rejectedActorIds);
    candidateActors.forEach((a) => rejectedIds.add(a.id));
    setRejectedActorIds(rejectedIds);

    // Identify all movie IDs starring any of these rejected actors
    const rejectedMovieIds = new Set<number>();
    candidateActors.forEach((a) => {
      a.movieIds.forEach((mId) => rejectedMovieIds.add(mId));
    });

    // Create a strict filter question penalizing movies that have any of these actors
    const rejectQ: WizardQuestion = {
      id: `reject_actors_batch_${questionCount}`,
      question: 'Does not star any of these actors',
      match: (m) => (rejectedMovieIds.has(Number(m.id)) ? 0.0 : 1.0),
    };

    const newHistory = [...history, { q: rejectQ, answer: 'yes' as WizardAnswer }];
    const newAsked = new Set(askedIds);
    newAsked.add(rejectQ.id);

    setHistory(newHistory);
    setAskedIds(newAsked);
    setCandidateActors([]); // Clear actor row immediately

    // Re-score immediately: movies with rejected actors will be penalized and pruned
    const scored = scoreAllMovies(Array.from(allMovies.values()), newHistory, clueMatches);
    setScoredPool(scored);

    let nextQ = selectSmartNextQuestion(scored, newAsked, hasAnsweredEra, questionCount + 1, newHistory);
    if (!nextQ) {
      const filtered = filterPoolByHistory(
        scored.filter((s) => s.score >= 0.5).map((s) => s.movie),
        newHistory
      );
      nextQ = generateDynamicQuestion(filtered, newAsked, []);
      if (nextQ) {
        nextQ = { ...nextQ, focusHint: getNarrowingInsight(filtered, questionCount + 1).hint };
      }
    }
    setCurrentQuestion(nextQ || null);
  };

  // Optional Studio Pill (Right above Yes/No buttons)
  const handleToggleStudioPill = (companyId: string, label: string) => {
    if (activeStudioPill === label) {
      setActiveStudioPill('');
      const nextFilters = { ...filters, with_companies: undefined };
      setFilters(nextFilters);
      executeLiveQueryWithFilters(nextFilters, history, askedIds, clueMatches, questionCount, hasAnsweredEra);
    } else {
      setActiveStudioPill(label);
      const nextFilters = { ...filters, with_companies: companyId };
      setFilters(nextFilters);
      // Mark studio-related questions so we don't re-ask Disney after tapping the pill
      const newAsked = new Set(askedIds);
      if (companyId === '2|3') {
        markRelatedAskedIds('disney_pixar', newAsked);
        MUTUAL_EXCLUSIONS.disney_pixar?.forEach((id) => newAsked.add(id));
      }
      setAskedIds(newAsked);
      executeLiveQueryWithFilters(nextFilters, history, newAsked, clueMatches, questionCount, hasAnsweredEra);
    }
  };

  // Optional Era Pill (Right above Yes/No buttons)
  const handleToggleEraPill = (opt: { label: string; gte?: string; lte?: string }) => {
    if (activeEraPill === opt.label) {
      setActiveEraPill('');
      const nextFilters = { ...filters, primary_release_date_gte: undefined, primary_release_date_lte: undefined };
      setFilters(nextFilters);
      executeLiveQueryWithFilters(nextFilters, history, askedIds, clueMatches, questionCount, hasAnsweredEra);
    } else {
      setActiveEraPill(opt.label);
      const nextFilters = { ...filters, primary_release_date_gte: opt.gte, primary_release_date_lte: opt.lte };
      setFilters(nextFilters);
      setHasAnsweredEra(true);
      executeLiveQueryWithFilters(nextFilters, history, askedIds, clueMatches, questionCount, true);
    }
  };

  // Mini Clue Input inside the question card
  const handleApplyMiniClue = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = miniClueText.trim();
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
    setMiniClueText('');
    setIsQueryingTMDb(false);
  };

  // Trigger On-The-Fly Question Generator
  const handleKeepNarrowingOnTheFly = () => {
    const topRemaining = qualifyingScored.map((s) => s.movie);
    const dynamicQ = generateDynamicQuestion(topRemaining, askedIds, candidateActors);
    if (dynamicQ) {
      setCurrentQuestion(dynamicQ);
    }
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
    setMiniClueText('');
    setFilterWithinText('');
    setActiveStudioPill('');
    setActiveEraPill('');
    setHasAnsweredEra(false);
    setRejectedActorIds(new Set());
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

      const firstQ = selectSmartNextQuestion(scored, new Set(), false, 0);
      setCurrentQuestion(firstQ);
      setIsQueryingTMDb(false);
      fetchTopActorsForCandidates(movies.slice(0, 10)).then(setCandidateActors);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col items-center animate-fade-in overflow-hidden overscroll-contain">
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950/90">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
            <Clapperboard className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-sm sm:text-base tracking-tight">Movie Finder</span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Globe2 className="w-2.5 h-2.5" /> Live TMDb
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            title="Reset wizard and start over"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-amber-500/40 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Start Over</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Close Movie Finder"
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 w-full max-w-5xl overflow-y-auto px-3 sm:px-4 py-2.5 space-y-2.5 overscroll-contain">
        {/* ── QUESTION CARD (COMPACT VERTICAL SPACE) ── */}
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-3.5 sm:p-5 text-center shadow-lg relative">
          {/* Header & Match Counter */}
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
            <span className="font-bold text-amber-400 uppercase tracking-widest text-[10px]">
              Question {questionCount + 1}
              {questionCount < MAX_STANDARD_QUESTIONS ? ` of ${MAX_STANDARD_QUESTIONS}` : ' (On-The-Fly)'}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium">
              {isQueryingTMDb ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                  <span className="text-amber-400">Narrowing...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold">
                    {displayedCandidates.length} matches
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Current Question Text */}
          {currentQuestion ? (
            <div className="max-w-xl mx-auto flex flex-col">
              {/* Fixed-height question zone so Yes/No buttons never jump */}
              <div className="min-h-[5.5rem] sm:min-h-[6.25rem] flex flex-col items-center justify-center py-1">
                {currentQuestion.actorPhoto ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
                    <div className="relative shrink-0">
                      <img
                        src={currentQuestion.actorPhoto}
                        alt={currentQuestion.actorName || 'Actor'}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xl shadow-amber-500/10 ring-4 ring-amber-500/20"
                      />
                      <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-neutral-900 border border-amber-500/50 text-[10px] font-bold text-amber-400">
                        Actor
                      </div>
                    </div>
                    <div className="text-center sm:text-left space-y-0.5 min-w-0">
                      <h2 className="text-white text-base sm:text-xl font-extrabold tracking-tight leading-snug line-clamp-3">
                        {currentQuestion.question}
                      </h2>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-white text-lg sm:text-xl font-extrabold tracking-tight leading-snug line-clamp-3 px-1">
                    {currentQuestion.question}
                  </h2>
                )}
              </div>

              {/* ── COMPACT HELPER PILLS DIRECTLY ABOVE YES/NO BUTTONS ── */}
              <div className="pt-2 pb-1 space-y-1.5 border-t border-neutral-800/60">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar justify-center flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1">Hunch?</span>
                  {COMPACT_STUDIO_PILLS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleToggleStudioPill(s.companyId, s.label)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition shrink-0 border ${
                        activeStudioPill === s.label
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                          : 'bg-neutral-950/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  {COMPACT_ERA_PILLS.map((e) => (
                    <button
                      key={e.label}
                      onClick={() => handleToggleEraPill(e)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition shrink-0 border ${
                        activeEraPill === e.label
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                          : 'bg-neutral-950/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>

                {/* Inline Quick Clue Input */}
                <form onSubmit={handleApplyMiniClue} className="flex items-center justify-center gap-1.5 max-w-md mx-auto">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={miniClueText}
                      onChange={(e) => setMiniClueText(e.target.value)}
                      placeholder="Type actor, character, or plot clue..."
                      className="w-full pl-7 pr-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {miniClueText && (
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shrink-0 shadow"
                    >
                      Add
                    </button>
                  )}
                </form>
              </div>

              {/* 4 Answers — always at the same vertical spot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 shrink-0">
                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('yes')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-950/70 border border-emerald-500/60 hover:border-emerald-400 hover:bg-emerald-900/80 text-emerald-300 hover:text-white transition active:scale-95 font-bold text-xs sm:text-sm shadow disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Yes</span>
                </button>

                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('sometimes')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-950/70 border border-amber-500/60 hover:border-amber-400 hover:bg-amber-900/80 text-amber-300 hover:text-white transition active:scale-95 font-bold text-xs sm:text-sm shadow disabled:opacity-50"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sometimes</span>
                </button>

                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('skip')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-800/90 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 font-semibold text-xs sm:text-sm shadow disabled:opacity-50"
                >
                  <Minus className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Not sure</span>
                </button>

                <button
                  disabled={isQueryingTMDb}
                  onClick={() => handleAnswer('no')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-950/70 border border-red-600/60 hover:border-red-500 hover:bg-red-900/80 text-red-300 hover:text-white transition active:scale-95 font-bold text-xs sm:text-sm shadow disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>No</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-1 space-y-2">
              <h2 className="text-white text-base sm:text-lg font-extrabold">
                🎯 Narrowed down to the top matches!
              </h2>
              <p className="text-neutral-400 text-xs">
                Browse candidates below, or ask another on-the-fly question!
              </p>
              <div className="flex justify-center pt-0.5">
                <button
                  onClick={handleKeepNarrowingOnTheFly}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Another Question</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── COMPACT ACTOR FACES ROW (MINIMAL VERTICAL SPACE) ── */}
        {candidateActors.length > 0 && displayedCandidates.length > 1 && (
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-neutral-400 shrink-0">Recognize actor?</span>
            <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
              {candidateActors.map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => handleSelectActorFace(actor)}
                  className="group flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 hover:border-amber-400 hover:bg-neutral-900 transition shrink-0 shadow-sm"
                  title={`Click if ${actor.name} is in your movie!`}
                >
                  <img
                    src={actor.profile_path}
                    alt={actor.name}
                    className="w-6 h-6 rounded-full object-cover border border-neutral-700 group-hover:border-amber-400"
                  />
                  <span className="text-[11px] font-semibold text-neutral-300 group-hover:text-amber-400 whitespace-nowrap">
                    {actor.name}
                  </span>
                </button>
              ))}
            </div>
            {/* Working "None of these" button */}
            <button
              onClick={handleRejectAllActors}
              className="text-[11px] text-neutral-400 hover:text-red-400 shrink-0 font-medium px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 transition"
              title="Eliminates all movies starring any of these actors"
            >
              None of these ✕
            </button>
          </div>
        )}

        {/* ── LIVE MATCHED MOVIES BROWSER (FULL SCREEN SPACE FOR MOVIES) ── */}
        <div className="space-y-2 pt-1">
          {/* Subheader with title filter for instant testing */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-extrabold text-xs sm:text-sm">
                Matching Candidates
              </h3>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                {displayedCandidates.length}
              </span>
              <span className="text-neutral-500 text-[11px] hidden sm:inline">
                (Click any movie to select!)
              </span>
            </div>

            {/* Quick search input within the current matches */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3 h-3 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterWithinText}
                onChange={(e) => setFilterWithinText(e.target.value)}
                placeholder="Filter results by title..."
                className="w-full pl-7 pr-6 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
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

          {/* Grid of matching movies */}
          {displayedCandidates.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {displayedCandidates.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMovie?.(m);
                    onClose();
                  }}
                  className="group flex flex-col rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-amber-400 hover:scale-[1.02] transition-all duration-200 active:scale-95 text-left shadow-md relative"
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
                    <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 border border-white/10 text-[9px] text-amber-400 font-bold">
                      #{idx + 1}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
                    <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px]">
                      <span className="text-amber-400 font-bold">★ {m.vote_average?.toFixed(1) || '7.5'}</span>
                      <span className="text-neutral-400">{m.release_date?.slice(0, 4)}</span>
                    </div>

                    {/* Hover indicator: That's it! */}
                    <div className="absolute inset-0 bg-amber-500/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-[10px] shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        That&apos;s It!
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 bg-neutral-900">
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
            <div className="py-8 text-center text-neutral-400 bg-neutral-900/40 rounded-xl border border-neutral-800">
              <p className="font-semibold text-white text-sm">No candidates meet all current answers.</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Try clicking &quot;Start Over&quot; or clearing one of your answers above!
              </p>
            </div>
          )}

          {/* Load More from TMDb Button */}
          {displayedCandidates.length > 0 && (
            <div className="flex justify-center pt-2 pb-5">
              <button
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition shadow"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Loading more from TMDb...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Load More from TMDb</span>
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
