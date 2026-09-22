'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  RotateCcw,
  Check,
  Play,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { Movie } from '@/lib/tmdb/types';
import { tmdb } from '@/lib/tmdb/client';

interface TwentyQuestionsModeProps {
  onPlayTrailer: (movie: Movie) => void;
  onSelectMovie?: (movie: Movie) => void;
  onLove?: (movie: Movie) => void;
  onDislike?: (movie: Movie) => void;
  onWatchlist?: (movie: Movie) => void;
  onWatched?: (movie: Movie) => void;
  lovedMovies?: Movie[];
  dislikedMovies?: Movie[];
  watchlistMovies?: Movie[];
  watchedMovies?: Movie[];
  tasteSummaryPrompt?: string;
}

interface QuestionDef {
  id: number;
  question: string;
  options: { label: string; tag: string; icon: string }[];
}

/** Short, plain questions — always include Don't care */
const QUESTION_BANK: QuestionDef[] = [
  {
    id: 1,
    question: 'Animated, kids, or adult?',
    options: [
      { label: 'Animated', tag: 'want_animated', icon: '🎨' },
      { label: 'Kids / family', tag: 'want_kids', icon: '👨‍👩‍👧' },
      { label: 'Adults (no kids stuff)', tag: 'want_adult', icon: '🔞' },
      { label: "Don't care — show everything", tag: 'audience_any', icon: '🎲' },
    ],
  },
  {
    id: 2,
    question: 'What kind of movie?',
    options: [
      { label: 'Comedy', tag: 'comedy', icon: '😂' },
      { label: 'Thriller', tag: 'thriller', icon: '🕵️' },
      { label: 'Horror', tag: 'horror', icon: '👻' },
      { label: 'Action', tag: 'action', icon: '⚡' },
      { label: 'Romance', tag: 'romance', icon: '💕' },
      { label: 'Sci-Fi / Fantasy', tag: 'scifi', icon: '🚀' },
      { label: 'Drama', tag: 'drama', icon: '🎭' },
      { label: "Don't care", tag: 'any', icon: '🎲' },
    ],
  },
  {
    id: 3,
    question: 'Pace?',
    options: [
      { label: 'Fast', tag: 'fast', icon: '🎢' },
      { label: 'Slow burn', tag: 'slow', icon: '🕯️' },
      { label: 'Short movie', tag: 'short', icon: '⏱️' },
      { label: 'Long epic', tag: 'epic', icon: '🌌' },
      { label: "Don't care", tag: 'pace_any', icon: '🎲' },
    ],
  },
  {
    id: 4,
    question: 'Which era?',
    options: [
      { label: '2020s', tag: 'era_2020s', icon: '✨' },
      { label: '2010s', tag: 'era_2010s', icon: '📱' },
      { label: '2000s', tag: 'era_2000s', icon: '💿' },
      { label: '90s', tag: 'era_90s', icon: '📼' },
      { label: '80s', tag: 'era_80s', icon: '📻' },
      { label: 'Classic', tag: 'era_classic', icon: '🎞️' },
      { label: "Don't care", tag: 'era_any', icon: '🎲' },
    ],
  },
  {
    id: 5,
    question: 'Setting vibe?',
    options: [
      { label: 'City / neon', tag: 'neon_noir', icon: '🌧️' },
      { label: 'Sunny / beach', tag: 'summer', icon: '☀️' },
      { label: 'Woods / cabin', tag: 'cabin', icon: '🌲' },
      { label: 'Space', tag: 'space', icon: '🚀' },
      { label: "Don't care", tag: 'setting_any', icon: '🎲' },
    ],
  },
  {
    id: 6,
    question: 'Plot style?',
    options: [
      { label: 'Twisty', tag: 'complex', icon: '🧩' },
      { label: 'Straightforward', tag: 'direct', icon: '🎯' },
      { label: 'Open ending', tag: 'ambiguous', icon: '💭' },
      { label: 'Feel-good', tag: 'feelgood', icon: '☀️' },
      { label: "Don't care", tag: 'plot_any', icon: '🎲' },
    ],
  },
  {
    id: 7,
    question: 'Tonight I want to…',
    options: [
      { label: 'Be shocked', tag: 'shock', icon: '🤯' },
      { label: 'Feel stuff', tag: 'emotional', icon: '❤️' },
      { label: 'Get pumped', tag: 'hype', icon: '🔥' },
      { label: 'Chill out', tag: 'relax', icon: '🛋️' },
      { label: "Don't care", tag: 'goal_any', icon: '🎲' },
    ],
  },
  {
    id: 8,
    question: 'Who are you with?',
    options: [
      { label: 'Solo', tag: 'solo', icon: '🎧' },
      { label: 'Date night', tag: 'date', icon: '🥂' },
      { label: 'Friends', tag: 'friends', icon: '🍿' },
      { label: 'Family', tag: 'family', icon: '🏠' },
      { label: "Don't care", tag: 'crowd_any', icon: '🎲' },
    ],
  },
  {
    id: 9,
    question: 'Dealbreakers?',
    options: [
      { label: 'No gore', tag: 'no_gore', icon: '🚫' },
      { label: 'Nothing too sad', tag: 'no_tragedy', icon: '🚫' },
      { label: 'No cheesy romance', tag: 'no_cliches', icon: '🚫' },
      { label: 'Anything goes', tag: 'raw', icon: '🔥' },
      { label: "Don't care", tag: 'deal_any', icon: '🎲' },
    ],
  },
  {
    id: 10,
    question: 'Tone?',
    options: [
      { label: 'Dark / sharp', tag: 'satire', icon: '🖤' },
      { label: 'Warm', tag: 'warm', icon: '🌅' },
      { label: 'Nostalgic', tag: 'nostalgia', icon: '🍂' },
      { label: 'Weird / dreamy', tag: 'surreal', icon: '🔮' },
      { label: "Don't care", tag: 'tone_any', icon: '🎲' },
    ],
  },
  {
    id: 11,
    question: 'Lead character?',
    options: [
      { label: 'Antihero', tag: 'antihero', icon: '⚖️' },
      { label: 'Regular person', tag: 'reluctant', icon: '🧑' },
      { label: 'Genius / obsessed', tag: 'obsessive', icon: '🔬' },
      { label: 'Buddy / group', tag: 'duo', icon: '🤝' },
      { label: "Don't care", tag: 'hero_any', icon: '🎲' },
    ],
  },
];

const GENRE_TMDB: Record<string, number> = {
  comedy: 35,
  thriller: 53,
  horror: 27,
  action: 28,
  romance: 10749,
  scifi: 878,
  drama: 18,
  animation: 16,
  family: 10751,
};

const PAGE_SIZE = 24;
const FOUND_THRESHOLD = 3;
const MIN_QS_BEFORE_FOUND = 4;
const INITIAL_PAGES = 12; // ~240 titles loaded; TMDb total shown separately
const ANIMATION_GENRE = 16;
const FAMILY_GENRE = 10751;

function isSpaceMovie(movie: Movie): boolean {
  const title = (movie.title || '').toLowerCase();
  const text = `${movie.overview || ''} ${movie.tagline || ''}`.toLowerCase();
  const genres = movie.genres || [];
  const blob = `${title} ${text}`;
  // Strong space signals
  if (
    /\b(outer space|spaceship|spacecraft|astronaut|nasa|orbit|galaxy|interstellar|mars|moon landing|space station|starship|wormhole|deep space|zero gravity|in space|into space|from space)\b/i.test(
      blob
    )
  ) {
    return true;
  }
  // Title says Space + sci-fi (Spaceballs, Space Oddity… not Office Space)
  if (/\bspace\b/i.test(title) && genres.includes('Science Fiction')) return true;
  // Sci-fi overview that clearly mentions space travel / planets
  if (
    genres.includes('Science Fiction') &&
    /\b(space|orbit|astronaut|galaxy|alien|mars|lunar|cosmos)\b/i.test(text)
  ) {
    return true;
  }
  return false;
}

function isCabinMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(cabin|forest|woods|wilderness|isolated|mountain|rural)\b/i.test(text);
}

function isSummerMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(summer|beach|coast|island|vacation|sunlit|seaside)\b/i.test(text);
}

function isNeonCityMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(neon|noir|cyber|cyberpunk|rain-soaked|metropolis|city nightlife)\b/i.test(text)
    || (/\bcity\b/i.test(text) && /\b(detective|crime|night)\b/i.test(text));
}

function scoreMovie(movie: Movie, tags: string[]): number {
  let score = (movie.vote_average || 5) * 1.5 + Math.min((movie.vote_count || 0) / 5000, 3);
  const movieText = `${movie.title} ${movie.genres?.join(' ') || ''} ${movie.overview || ''} ${movie.tagline || ''}`.toLowerCase();
  const releaseYear = parseInt(movie.release_date?.slice(0, 4) || '2015', 10);
  const runtime = movie.runtime || 120;
  const genres = movie.genres || [];

  if (tags.includes('comedy') && genres.includes('Comedy')) score += 12;
  if (tags.includes('thriller') && genres.some((g) => ['Thriller', 'Crime', 'Mystery'].includes(g))) score += 12;
  if (tags.includes('horror') && genres.includes('Horror')) score += 14;
  if (tags.includes('action') && genres.some((g) => ['Action', 'Adventure'].includes(g))) score += 12;
  if (tags.includes('romance') && genres.includes('Romance')) score += 12;
  if (tags.includes('scifi') && genres.some((g) => ['Science Fiction', 'Fantasy'].includes(g))) score += 12;
  if (tags.includes('drama') && genres.includes('Drama')) score += 10;
  if (tags.includes('animation') && genres.some((g) => ['Animation', 'Family'].includes(g))) score += 12;

  if (tags.includes('fast') && runtime <= 135) score += 5;
  if (tags.includes('slow') && (genres.includes('Drama') || genres.includes('Mystery'))) score += 5;
  if (tags.includes('short') && runtime > 0 && runtime <= 110) score += 8;
  if (tags.includes('epic') && runtime >= 140) score += 8;
  // Don't hard-penalize missing runtime — discover lists often omit it

  if (tags.includes('era_2020s') && releaseYear >= 2020) score += 10;
  if (tags.includes('era_2010s') && releaseYear >= 2010 && releaseYear <= 2019) score += 10;
  if (tags.includes('era_2000s') && releaseYear >= 2000 && releaseYear <= 2009) score += 10;
  if (tags.includes('era_90s') && releaseYear >= 1990 && releaseYear <= 1999) score += 10;
  if (tags.includes('era_80s') && releaseYear >= 1980 && releaseYear <= 1989) score += 10;
  if (tags.includes('era_classic') && releaseYear > 0 && releaseYear < 1980) score += 10;

  if (tags.includes('space') && isSpaceMovie(movie)) score += 16;
  if (tags.includes('neon_noir') && isNeonCityMovie(movie)) score += 8;
  if (tags.includes('cabin') && isCabinMovie(movie)) score += 8;
  if (tags.includes('summer') && isSummerMovie(movie)) score += 8;

  if (tags.includes('complex') && /twist|mystery|memory|puzzle/i.test(movieText)) score += 5;
  if (tags.includes('direct') && genres.includes('Action')) score += 3;
  if (tags.includes('feelgood') && !genres.includes('Horror')) score += 4;
  if (tags.includes('shock') && (genres.includes('Horror') || genres.includes('Thriller'))) score += 5;
  if (tags.includes('hype') && genres.includes('Action')) score += 5;
  if (tags.includes('emotional') && genres.includes('Drama')) score += 5;
  if (tags.includes('relax') && !genres.includes('Horror')) score += 3;

  if (tags.includes('want_animated') && isAnimated(movie)) score += 14;
  if (tags.includes('want_kids') && isKidsFriendly(movie)) score += 12;
  if (tags.includes('want_adult') && !isAnimated(movie) && !genres.includes('Family')) score += 4;

  if (tags.includes('family') && genres.some((g) => ['Family', 'Animation'].includes(g))) score += 6;
  if (tags.includes('date') && genres.some((g) => ['Romance', 'Comedy'].includes(g))) score += 4;

  if (tags.includes('no_gore') && genres.includes('Horror')) score -= 20;
  if (tags.includes('no_tragedy') && /tragic|grief|death of/i.test(movieText)) score -= 8;
  if (tags.includes('no_cliches') && genres.includes('Romance')) score -= 5;

  if (tags.includes('satire') && /dark|satire|cynical/i.test(movieText)) score += 3;
  if (tags.includes('warm') && genres.includes('Drama')) score += 3;
  if (tags.includes('nostalgia') && releaseYear > 0 && releaseYear < 2005) score += 3;
  if (tags.includes('surreal') && /dream|surreal|weird/i.test(movieText)) score += 4;

  return score;
}

function isAnimated(movie: Movie): boolean {
  return (movie.genres || []).includes('Animation');
}

function isKidsFriendly(movie: Movie): boolean {
  const genres = movie.genres || [];
  if (genres.includes('Horror') || genres.includes('Thriller')) return false;
  return genres.includes('Family') || genres.includes('Animation');
}

function hardPasses(movie: Movie, tags: string[]): boolean {
  const genres = movie.genres || [];
  const releaseYear = parseInt(movie.release_date?.slice(0, 4) || '0', 10);

  // Audience first — Animated / Kids / Adult are hard walls
  if (tags.includes('want_animated') && !isAnimated(movie)) return false;
  if (tags.includes('want_kids') && !isKidsFriendly(movie)) return false;
  if (tags.includes('want_adult')) {
    // Adults: never show animated or kids/family fare
    if (isAnimated(movie)) return false;
    if (genres.includes('Family')) return false;
  }

  if (tags.includes('comedy') && !genres.includes('Comedy')) return false;
  if (tags.includes('horror') && !genres.includes('Horror')) return false;
  if (tags.includes('romance') && !genres.includes('Romance')) return false;
  if (tags.includes('thriller') && !genres.some((g) => ['Thriller', 'Crime', 'Mystery'].includes(g))) return false;
  if (tags.includes('action') && !genres.some((g) => ['Action', 'Adventure'].includes(g))) return false;
  if (tags.includes('scifi') && !genres.some((g) => ['Science Fiction', 'Fantasy'].includes(g))) return false;
  if (tags.includes('drama') && !genres.includes('Drama')) return false;

  if (tags.includes('era_2020s') && !(releaseYear >= 2020)) return false;
  if (tags.includes('era_2010s') && !(releaseYear >= 2010 && releaseYear <= 2019)) return false;
  if (tags.includes('era_2000s') && !(releaseYear >= 2000 && releaseYear <= 2009)) return false;
  if (tags.includes('era_90s') && !(releaseYear >= 1990 && releaseYear <= 1999)) return false;
  if (tags.includes('era_80s') && !(releaseYear >= 1980 && releaseYear <= 1989)) return false;
  if (tags.includes('era_classic') && !(releaseYear > 0 && releaseYear < 1980)) return false;

  // Pace is soft only — list endpoints rarely include runtime, so hard-cutting
  // "short" was wiping almost everything down to a few seed titles.

  if (tags.includes('no_gore') && genres.includes('Horror')) return false;

  // Setting answers are HARD filters — Space must actually be space
  if (tags.includes('space') && !isSpaceMovie(movie)) return false;
  if (tags.includes('cabin') && !isCabinMovie(movie)) return false;
  if (tags.includes('summer') && !isSummerMovie(movie)) return false;
  if (tags.includes('neon_noir') && !isNeonCityMovie(movie)) return false;

  return true;
}

type PoolQuery = {
  genreId?: number;
  withoutGenreIds?: number[];
  runtimeLte?: number;
  runtimeGte?: number;
};

function poolQueryFromTags(tags: string[]): PoolQuery {
  const q: PoolQuery = {};
  for (const [tag, id] of Object.entries(GENRE_TMDB)) {
    if (tags.includes(tag) && tag !== 'animation' && tag !== 'family') {
      q.genreId = id;
      break;
    }
  }
  if (tags.includes('want_animated')) q.genreId = ANIMATION_GENRE;
  if (tags.includes('want_kids') && !q.genreId) q.genreId = FAMILY_GENRE;
  if (tags.includes('want_adult')) {
    q.withoutGenreIds = [ANIMATION_GENRE, FAMILY_GENRE];
  }
  if (tags.includes('space') && !q.genreId) q.genreId = GENRE_TMDB.scifi;
  if (tags.includes('short')) q.runtimeLte = 110;
  if (tags.includes('epic')) q.runtimeGte = 140;
  return q;
}

async function fetchDiscoverPages(
  query: PoolQuery,
  fromPage: number,
  pageCount: number
): Promise<{ movies: Movie[]; totalResults: number; totalPages: number }> {
  const map = new Map<string, Movie>();
  let totalResults = 0;
  let totalPages = 1;

  const pages = Array.from({ length: pageCount }, (_, i) => fromPage + i);
  const batches = await Promise.all(
    pages.map((page) =>
      tmdb.discoverMovies({
        page,
        genreId: query.genreId,
        withoutGenreIds: query.withoutGenreIds,
        runtimeLte: query.runtimeLte,
        runtimeGte: query.runtimeGte,
        sortBy: 'popularity.desc',
      })
    )
  );

  for (const batch of batches) {
    totalResults = Math.max(totalResults, batch.totalResults || 0);
    totalPages = Math.max(totalPages, batch.totalPages || 1);
    batch.results.forEach((m) => map.set(String(m.id), m));
  }

  // Only blend seeds when browsing broadly (no genre lock)
  if (!query.genreId && !query.withoutGenreIds?.length) {
    tmdb.getSeedMovies().forEach((m) => {
      if (!map.has(String(m.id))) map.set(String(m.id), m);
    });
  }

  return { movies: Array.from(map.values()), totalResults, totalPages };
}

export const TwentyQuestionsMode: React.FC<TwentyQuestionsModeProps> = ({
  onPlayTrailer,
  onSelectMovie,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { label: string; tag: string }>>({});
  const [moviePool, setMoviePool] = useState<Movie[]>([]);
  const [ranked, setRanked] = useState<Movie[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null);
  const [nextPage, setNextPage] = useState(1);
  const [maxPages, setMaxPages] = useState(1);
  const [foundMovie, setFoundMovie] = useState<Movie | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef<PoolQuery>({});

  const currentQ = QUESTION_BANK[Math.min(currentStep, QUESTION_BANK.length - 1)];
  const answeredCount = Object.keys(answers).length;

  const recompute = useCallback((pool: Movie[], nextTags: string[]) => {
    const filtered =
      nextTags.length === 0
        ? pool
        : pool.filter((m) => hardPasses(m, nextTags));
    const working = filtered.length > 0 ? filtered : pool;
    const scored = working
      .map((movie) => ({ movie, score: scoreMovie(movie, nextTags) }))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.movie);
    setRanked(scored);
    setVisibleCount(PAGE_SIZE);
    return scored;
  }, []);

  const loadPoolForTags = useCallback(
    async (tags: string[], reset = true) => {
      const query = poolQueryFromTags(tags);
      activeQueryRef.current = query;
      setIsLoadingPool(true);
      const { movies, totalResults, totalPages } = await fetchDiscoverPages(
        query,
        1,
        INITIAL_PAGES
      );
      setMoviePool(movies);
      setCatalogTotal(totalResults > 0 ? totalResults : movies.length);
      setMaxPages(totalPages);
      setNextPage(INITIAL_PAGES + 1);
      const scored = recompute(movies, tags);
      setIsLoadingPool(false);
      return scored;
    },
    [recompute]
  );

  // Initial broad pool
  useEffect(() => {
    let alive = true;
    (async () => {
      const scored = await loadPoolForTags([]);
      if (!alive) return;
      void scored;
    })();
    return () => {
      alive = false;
    };
  }, [loadPoolForTags]);

  const celebrateIfReady = (scored: Movie[], nextAnswers: Record<number, { label: string; tag: string }>, stepAfter: number) => {
    const n = Object.keys(nextAnswers).length;
    if (n < MIN_QS_BEFORE_FOUND) return false;
    if (scored.length === 0) return false;

    const hardLeft = scored.filter((m) => hardPasses(m, Object.values(nextAnswers).map((a) => a.tag)));
    // Only celebrate when truly tiny — never because we under-fetched
    const tight = hardLeft.length > 0 && hardLeft.length <= FOUND_THRESHOLD && (catalogTotal ?? 999) <= 40;
    const finishedBank = stepAfter >= QUESTION_BANK.length;

    if (tight || finishedBank) {
      const winner = (tight ? hardLeft : scored)[0];
      setFoundMovie(winner);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff', '#34d399'],
      });
      return true;
    }
    return false;
  };

  const handleSelectOption = async (option: { label: string; tag: string }) => {
    const nextAnswers = { ...answers, [currentStep]: option };
    setAnswers(nextAnswers);
    const nextTags = Object.values(nextAnswers).map((a) => a.tag);

    // Always refresh discover against the current tag combo (audience + genre + pace…)
    // so counts reflect TMDb totals, not a tiny cached page dump.
    const scored = await loadPoolForTags(nextTags);
    const nextStep = currentStep + 1;

    if (celebrateIfReady(scored, nextAnswers, nextStep)) {
      return;
    }

    if (nextStep < QUESTION_BANK.length) {
      setCurrentStep(nextStep);
    } else {
      celebrateIfReady(scored, nextAnswers, nextStep);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setFoundMovie(null);
    setVisibleCount(PAGE_SIZE);
    loadPoolForTags([]);
  };

  const loadMoreFromTmdb = async () => {
    if (isLoadingMore || nextPage > maxPages) return;
    setIsLoadingMore(true);
    const tags = Object.values(answers).map((a) => a.tag);
    const { movies } = await fetchDiscoverPages(activeQueryRef.current, nextPage, 4);
    setNextPage((p) => p + 4);
    const merged = new Map(moviePool.map((m) => [String(m.id), m]));
    movies.forEach((m) => merged.set(String(m.id), m));
    const pool = Array.from(merged.values());
    setMoviePool(pool);
    recompute(pool, tags);
    setVisibleCount((c) => c + PAGE_SIZE);
    setIsLoadingMore(false);
  };

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
      if (visibleCount < ranked.length) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, ranked.length));
      } else {
        void loadMoreFromTmdb();
      }
    }
  };

  const visible = ranked.slice(0, visibleCount);
  const displayTotal = catalogTotal && catalogTotal > ranked.length ? catalogTotal : ranked.length;

  // ── Found celebration ──
  if (foundMovie) {
    return (
      <div className="w-full max-w-lg mx-auto h-[calc(100vh-7.5rem)] flex flex-col items-center justify-center p-4 gap-4 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" /> We found your movie
        </div>
        <button
          type="button"
          onClick={() => (onSelectMovie ? onSelectMovie(foundMovie) : onPlayTrailer(foundMovie))}
          className="w-full max-w-xs flex flex-col items-center gap-3 group"
        >
          <div className="relative w-40 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-amber-400 shadow-2xl shadow-amber-500/20">
            {foundMovie.poster_path ? (
              <Image
                src={foundMovie.poster_path}
                alt={foundMovie.title}
                fill
                sizes="200px"
                className="object-cover group-hover:scale-105 transition"
                unoptimized={foundMovie.poster_path.startsWith('http')}
              />
            ) : null}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white">{foundMovie.title}</h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              ★ {foundMovie.vote_average?.toFixed(1) ?? '—'} · {foundMovie.release_date?.slice(0, 4)}
            </p>
          </div>
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPlayTrailer(foundMovie)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-sm flex items-center gap-1.5"
          >
            <Play className="w-4 h-4 fill-current" /> Trailer
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-200 font-semibold text-sm flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Again
          </button>
        </div>
        {ranked.length > 1 ? (
          <div className="w-full mt-2 max-w-md">
            <p className="text-[10px] uppercase font-bold text-neutral-500 mb-1.5 text-center">Also close</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {ranked.slice(1, 13).map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => (onSelectMovie ? onSelectMovie(m) : onPlayTrailer(m))}
                  className="relative aspect-[2/3] rounded-md overflow-hidden border border-neutral-700 hover:border-amber-400 transition"
                  title={m.title}
                >
                  {m.poster_path ? (
                    <Image src={m.poster_path} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  ) : null}
                  <span className="absolute top-0.5 left-0.5 text-[8px] font-black bg-black/70 text-amber-300 px-0.5 rounded">
                    #{i + 2}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-7.5rem)] max-h-[calc(100vh-7.5rem)] overflow-hidden flex flex-col p-2 sm:p-3 gap-2">
      {/* Thin progress — no 6/12 mode */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0">
          Matchmaker
        </span>
        <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${Math.min(100, ((currentStep + 1) / QUESTION_BANK.length) * 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-neutral-400 shrink-0">
          Q{currentStep + 1}
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="p-1 rounded-md text-neutral-500 hover:text-white"
          title="Start over"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Question — hug content */}
      <div className="shrink-0 flex flex-col bg-neutral-900/90 border border-neutral-800 rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-[15px] sm:text-base font-extrabold text-white leading-tight">
            {currentQ.question}
          </h2>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
              disabled={currentStep === 0}
              className="p-1 rounded-md text-neutral-400 disabled:opacity-30"
              aria-label="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStep((p) => Math.min(QUESTION_BANK.length - 1, p + 1))}
              disabled={currentStep >= QUESTION_BANK.length - 1}
              className="p-1 rounded-md text-neutral-400 disabled:opacity-30"
              aria-label="Skip"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentStep]?.tag === opt.tag;
            const isDontCare = opt.tag === 'any' || opt.tag.endsWith('_any');
            const spanFull = isDontCare && currentQ.options.length % 2 === 1;
            return (
              <button
                key={opt.tag}
                onClick={() => handleSelectOption(opt)}
                className={`${spanFull ? 'col-span-2' : ''} text-left py-2.5 sm:py-3 px-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition active:scale-[0.98] flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-white'
                    : isDontCare
                      ? 'border-dashed border-neutral-600 text-neutral-300 bg-neutral-950/40'
                      : 'bg-neutral-950/70 border-neutral-800 text-neutral-200'
                }`}
              >
                <span className="text-base shrink-0 leading-none">{opt.icon}</span>
                <span className="truncate leading-tight">{opt.label}</span>
                {isSelected ? <Check className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full ranked list — fills screen, scroll to load more */}
      <div className="flex-1 min-h-0 rounded-xl border border-neutral-800 bg-neutral-950/90 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-800/80 shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            {isLoadingPool
              ? 'Loading…'
              : displayTotal >= 1000
                ? `${displayTotal.toLocaleString()}+ matches`
                : `${displayTotal.toLocaleString()} matches`}
            {answeredCount > 0 && !isLoadingPool ? ' · live' : ''}
          </span>
          {visibleCount < ranked.length || nextPage <= maxPages ? (
            <span className="text-[9px] text-neutral-500">
              {isLoadingMore ? 'Loading more…' : 'Scroll for more'}
            </span>
          ) : null}
        </div>

        <div
          ref={listRef}
          onScroll={onListScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2"
        >
          {isLoadingPool && ranked.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-neutral-400 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading movies…
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {visible.map((movie, i) => (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => (onSelectMovie ? onSelectMovie(movie) : onPlayTrailer(movie))}
                  title={movie.title}
                  className="flex flex-col gap-1 min-w-0 text-left group"
                >
                  <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border border-neutral-700 group-hover:border-amber-400 transition bg-neutral-900">
                    {movie.poster_path ? (
                      <Image
                        src={movie.poster_path}
                        alt={movie.title}
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized={movie.poster_path.startsWith('http')}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
                        {movie.title.slice(0, 1)}
                      </span>
                    )}
                    <span className="absolute top-1 left-1 text-[9px] font-black bg-black/75 text-amber-300 px-1 rounded">
                      #{i + 1}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-200 truncate leading-tight px-0.5">
                    {movie.title}
                  </span>
                </button>
              ))}
            </div>
          )}
          {visibleCount < ranked.length || nextPage <= maxPages ? (
            <div className="flex justify-center py-3">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() => {
                  if (visibleCount < ranked.length) {
                    setVisibleCount((c) => Math.min(c + PAGE_SIZE, ranked.length));
                  } else {
                    void loadMoreFromTmdb();
                  }
                }}
                className="text-xs font-semibold text-amber-400 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 disabled:opacity-50"
              >
                {isLoadingMore
                  ? 'Loading…'
                  : visibleCount < ranked.length
                    ? `Show more (${ranked.length - visibleCount} loaded)`
                    : `Load more from TMDb (${displayTotal.toLocaleString()}+)`}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
