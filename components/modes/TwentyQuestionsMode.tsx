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
  ChevronDown,
  ChevronUp,
  Loader2,
  SlidersHorizontal,
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
  category: string;
  question: string;
  options: { label: string; tag: string; icon: string }[];
}

/** Short, plain questions — always include Don't care */
const QUESTION_BANK: QuestionDef[] = [
  {
    id: 1,
    category: 'Audience',
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
    category: 'Genre',
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
    category: 'Pace',
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
    category: 'Era',
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
    category: 'Setting',
    question: 'Where is it set?',
    options: [
      { label: 'Space', tag: 'space', icon: '🚀' },
      { label: 'Big city', tag: 'city', icon: '🏙️' },
      { label: 'Small town', tag: 'small_town', icon: '🏡' },
      { label: 'Beach / island', tag: 'summer', icon: '🏖️' },
      { label: 'Woods / cabin', tag: 'cabin', icon: '🌲' },
      { label: 'School', tag: 'school', icon: '🎒' },
      { label: 'War / battlefield', tag: 'warzone', icon: '⚔️' },
      { label: 'Fantasy world', tag: 'fantasy_world', icon: '🧙' },
      { label: "Don't care", tag: 'setting_any', icon: '🎲' },
    ],
  },
  {
    id: 6,
    category: 'Story',
    question: 'How should the story feel?',
    options: [
      { label: 'Twisty mystery', tag: 'complex', icon: '🧩' },
      { label: 'Simple & clear', tag: 'direct', icon: '🎯' },
      { label: 'Feel-good', tag: 'feelgood', icon: '☀️' },
      { label: 'Edge-of-seat', tag: 'shock', icon: '😬' },
      { label: "Don't care", tag: 'plot_any', icon: '🎲' },
    ],
  },
  {
    id: 7,
    category: 'Goal',
    question: 'Tonight I want to…',
    options: [
      { label: 'Laugh', tag: 'goal_laugh', icon: '😂' },
      { label: 'Get scared', tag: 'goal_scare', icon: '😱' },
      { label: 'Feel emotions', tag: 'emotional', icon: '❤️' },
      { label: 'Get pumped', tag: 'hype', icon: '🔥' },
      { label: 'Chill out', tag: 'relax', icon: '🛋️' },
      { label: "Don't care", tag: 'goal_any', icon: '🎲' },
    ],
  },
  {
    id: 8,
    category: 'Rating',
    question: 'Rating OK with?',
    options: [
      { label: 'G / PG', tag: 'rate_g', icon: '🟢' },
      { label: 'Up to PG-13', tag: 'rate_pg13', icon: '🟡' },
      { label: 'Just R', tag: 'rate_r_only', icon: '🟠' },
      { label: 'Up to R', tag: 'rate_r', icon: '🔶' },
      { label: 'NC-17', tag: 'rate_nc17', icon: '🔴' },
      { label: "Don't care", tag: 'rate_skip', icon: '🎲' },
    ],
  },
  {
    id: 9,
    category: 'Content',
    question: 'Content vibes?',
    options: [
      { label: 'No gore', tag: 'no_gore', icon: '🚫' },
      { label: 'Lots of gore', tag: 'lots_gore', icon: '🩸' },
      { label: 'Nothing too sad', tag: 'no_tragedy', icon: '🌤️' },
      { label: 'Super sad', tag: 'super_sad', icon: '😢' },
      { label: 'No nudity', tag: 'no_nudity', icon: '👕' },
      { label: 'Anything goes', tag: 'raw', icon: '💥' },
      { label: "Don't care", tag: 'deal_any', icon: '🎲' },
    ],
  },
  {
    id: 10,
    category: 'Mood',
    question: 'Overall mood?',
    options: [
      { label: 'Funny', tag: 'mood_funny', icon: '😄' },
      { label: 'Scary', tag: 'mood_scary', icon: '👻' },
      { label: 'Romantic', tag: 'mood_romantic', icon: '💘' },
      { label: 'Serious', tag: 'mood_serious', icon: '🎭' },
      { label: 'Light & fun', tag: 'mood_light', icon: '🎈' },
      { label: 'Dark', tag: 'mood_dark', icon: '🌑' },
      { label: "Don't care", tag: 'tone_any', icon: '🎲' },
    ],
  },
  {
    id: 11,
    category: 'Lead',
    question: 'Who is the lead?',
    options: [
      { label: 'Boy / man', tag: 'lead_male', icon: '👨' },
      { label: 'Girl / woman', tag: 'lead_female', icon: '👩' },
      { label: 'Boy & girl duo', tag: 'lead_duo_mf', icon: '👫' },
      { label: 'Friends / group', tag: 'duo', icon: '👥' },
      { label: 'Antihero', tag: 'antihero', icon: '⚖️' },
      { label: 'Regular person', tag: 'reluctant', icon: '🧑' },
      { label: 'Genius / obsessed', tag: 'obsessive', icon: '🔬' },
      { label: "Don't care", tag: 'hero_any', icon: '🎲' },
    ],
  },
];

/** After answering `afterStep`, go to the next unanswered — wrap to earlier gaps if you jumped ahead. */
function nextUnansweredStep(
  answered: Record<number, { label: string; tag: string }>,
  afterStep: number
): number | null {
  for (let i = afterStep + 1; i < QUESTION_BANK.length; i++) {
    if (answered[i] == null) return i;
  }
  for (let i = 0; i <= afterStep; i++) {
    if (answered[i] == null) return i;
  }
  return null;
}

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
const MIN_QS_BEFORE_FOUND = 5;
const INITIAL_PAGES = 12;
const ANIMATION_GENRE = 16;
const FAMILY_GENRE = 10751;

/** TMDb keyword ids — pipe = OR. Verified: space, outer space, astronaut, spacecraft, deep space */
const KW_SPACE = '9882|252634|14626|1612|209280';
const KW_FOREST = '233960|156326';
const KW_BEACH = '966|13088';
const KW_SCHOOL = '339|14544';
const KW_WAR = '14643|1701';
/** TMDb keywords tagged on titles with notable nudity / erotic content (not a perfect “how much” score) */
const KW_NUDITY = '281741|359980|256466|190370';

function mergeKeywords(existing: string | undefined, next: string): string {
  return existing ? `${existing},${next}` : next;
}

const SETTING_TAGS = [
  'space',
  'cabin',
  'summer',
  'city',
  'small_town',
  'school',
  'warzone',
  'fantasy_world',
] as const;

function isSpaceMovie(movie: Movie): boolean {
  const title = (movie.title || '').toLowerCase();
  const text = `${movie.overview || ''} ${movie.tagline || ''}`.toLowerCase();
  const blob = `${title} ${text}`;
  if (
    /\b(outer space|spaceship|spacecraft|astronaut|nasa|orbit|galaxy|interstellar|space station|starship|wormhole|deep space|zero[- ]gravity|space travel|space mission|on mars|to mars|the moon|lunar|cosmo(?:s|naut))\b/i.test(
      blob
    )
  ) {
    return true;
  }
  // Title-level space + sci-fi (Gravity, Ad Astra, etc.)
  if (/\b(space|mars|apollo|gravity|ad astra|interstellar|martian)\b/i.test(title)) return true;
  if ((movie.genres || []).includes('Science Fiction') && /\bspace\b/i.test(blob)) return true;
  return false;
}

function isCabinMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(cabin|forest|woods|wilderness|woodland)\b/i.test(text);
}

function isSummerMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(beach|island|coast|seaside|tropical|vacation)\b/i.test(text);
}

function isCityMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(new york|los angeles|chicago|london|tokyo|city|urban|metropolis|downtown)\b/i.test(text);
}

function isSmallTownMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(small town|suburb|rural|village|hometown)\b/i.test(text);
}

function isSchoolMovie(movie: Movie): boolean {
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(school|high school|college|university|campus|student|classmate)\b/i.test(text);
}

function isWarMovie(movie: Movie): boolean {
  const genres = movie.genres || [];
  if (genres.includes('War')) return true;
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(war|battlefield|soldier|combat|wwii|world war|military)\b/i.test(text);
}

function isFantasyWorldMovie(movie: Movie): boolean {
  const genres = movie.genres || [];
  if (genres.includes('Fantasy')) return true;
  const text = `${movie.title} ${movie.overview || ''}`.toLowerCase();
  return /\b(kingdom|magic|wizard|dragon|quest|enchanted|fairy)\b/i.test(text);
}

function textHas(movie: Movie, re: RegExp): boolean {
  return re.test(`${movie.title} ${movie.overview || ''} ${movie.tagline || ''}`);
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

  if (tags.includes('space') && isSpaceMovie(movie)) score += 20;
  if (tags.includes('cabin') && isCabinMovie(movie)) score += 12;
  if (tags.includes('summer') && isSummerMovie(movie)) score += 12;
  if (tags.includes('city') && isCityMovie(movie)) score += 10;
  if (tags.includes('small_town') && isSmallTownMovie(movie)) score += 10;
  if (tags.includes('school') && isSchoolMovie(movie)) score += 12;
  if (tags.includes('warzone') && isWarMovie(movie)) score += 14;
  if (tags.includes('fantasy_world') && isFantasyWorldMovie(movie)) score += 12;

  if (tags.includes('complex') && /twist|mystery|memory|puzzle/i.test(movieText)) score += 5;
  if (tags.includes('direct') && genres.includes('Action')) score += 3;
  if (tags.includes('feelgood') && !genres.includes('Horror')) score += 4;
  if (tags.includes('shock') && (genres.includes('Horror') || genres.includes('Thriller'))) score += 5;
  if (tags.includes('hype') && genres.includes('Action')) score += 5;
  if (tags.includes('emotional') && genres.includes('Drama')) score += 5;
  if (tags.includes('relax') && !genres.includes('Horror')) score += 3;
  if (tags.includes('goal_laugh') && genres.includes('Comedy')) score += 10;
  if (tags.includes('goal_scare') && genres.includes('Horror')) score += 12;

  if (tags.includes('want_animated') && isAnimated(movie)) score += 14;
  if (tags.includes('want_kids') && isKidsFriendly(movie)) score += 12;
  if (tags.includes('want_adult') && !isAnimated(movie) && !genres.includes('Family')) score += 4;

  if (tags.includes('mood_funny') && genres.includes('Comedy')) score += 10;
  if (tags.includes('mood_scary') && genres.includes('Horror')) score += 12;
  if (tags.includes('mood_romantic') && genres.includes('Romance')) score += 10;
  if (tags.includes('mood_serious') && genres.includes('Drama')) score += 8;
  if (tags.includes('mood_light') && !genres.includes('Horror') && !genres.includes('War')) score += 5;
  if (tags.includes('mood_dark') && (genres.includes('Horror') || genres.includes('Thriller') || /dark|grim/i.test(movieText))) score += 6;

  if (tags.includes('lead_female') && textHas(movie, /\b(she|her|woman|girl|daughter|mother|wife)\b/i)) score += 4;
  if (tags.includes('lead_male') && textHas(movie, /\b(he|him|man|boy|son|father|husband)\b/i)) score += 3;
  if (tags.includes('lead_duo_mf') && textHas(movie, /\b(couple|partners|he and she|boyfriend|girlfriend)\b/i)) score += 5;

  if (tags.includes('no_gore') && genres.includes('Horror')) score -= 25;
  if (tags.includes('lots_gore') && (genres.includes('Horror') || textHas(movie, /\b(gore|bloody|slaughter|grisly)\b/i))) score += 10;
  if (tags.includes('no_tragedy') && textHas(movie, /\b(tragic|grief|dies|death of|suicide)\b/i)) score -= 12;
  if (tags.includes('super_sad') && (genres.includes('Drama') || textHas(movie, /\b(tragic|grief|loss|heartbreak)\b/i))) score += 8;
  if (tags.includes('no_nudity') && textHas(movie, /\b(erotic|nude|nudity|sexual)\b/i)) score -= 15;
  if (tags.includes('rate_r_only') || tags.includes('rate_nc17')) score += 2;

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

  // Pace is soft only — list endpoints rarely include runtime

  if (tags.includes('no_gore') && genres.includes('Horror') && textHas(movie, /\b(gore|slasher|grisly|gory)\b/i)) return false;
  if (tags.includes('lots_gore') && !genres.includes('Horror') && !textHas(movie, /\b(gore|bloody|violence|slasher)\b/i)) return false;
  if (tags.includes('super_sad') && !genres.includes('Drama') && !textHas(movie, /\b(tragic|grief|loss|heartbreak|dies)\b/i)) return false;
  if (tags.includes('no_tragedy') && textHas(movie, /\b(tragic|grief|suicide|terminal illness)\b/i)) return false;
  if (tags.includes('no_nudity') && textHas(movie, /\b(erotic|nudity|nude|pornographic)\b/i)) return false;

  // Settings: keyword-backed ones (space/cabin/summer/school/war) are narrowed by TMDb
  // discover — don't also hard-kill on overview text (that used to empty the list → full-pool fallback).
  // City / small town / fantasy still need client text filters.
  if (tags.includes('city') && !isCityMovie(movie)) return false;
  if (tags.includes('small_town') && !isSmallTownMovie(movie)) return false;
  if (tags.includes('fantasy_world') && !isFantasyWorldMovie(movie)) return false;

  return true;
}

type PoolQuery = {
  genreId?: number;
  withoutGenreIds?: number[];
  runtimeLte?: number;
  runtimeGte?: number;
  yearGte?: string;
  yearLte?: string;
  withKeywords?: string;
  withoutKeywords?: string;
  certificationCountry?: string;
  certification?: string;
  certificationLte?: string;
  certificationGte?: string;
  includeAdult?: boolean;
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

  if (tags.includes('era_2020s')) {
    q.yearGte = '2020-01-01';
  } else if (tags.includes('era_2010s')) {
    q.yearGte = '2010-01-01';
    q.yearLte = '2019-12-31';
  } else if (tags.includes('era_2000s')) {
    q.yearGte = '2000-01-01';
    q.yearLte = '2009-12-31';
  } else if (tags.includes('era_90s')) {
    q.yearGte = '1990-01-01';
    q.yearLte = '1999-12-31';
  } else if (tags.includes('era_80s')) {
    q.yearGte = '1980-01-01';
    q.yearLte = '1989-12-31';
  } else if (tags.includes('era_classic')) {
    q.yearLte = '1979-12-31';
  }

  if (tags.includes('space')) {
    if (!q.genreId) q.genreId = GENRE_TMDB.scifi;
    q.withKeywords = mergeKeywords(q.withKeywords, KW_SPACE);
  }
  if (tags.includes('cabin')) q.withKeywords = mergeKeywords(q.withKeywords, KW_FOREST);
  if (tags.includes('summer')) q.withKeywords = mergeKeywords(q.withKeywords, KW_BEACH);
  if (tags.includes('school')) q.withKeywords = mergeKeywords(q.withKeywords, KW_SCHOOL);
  if (tags.includes('warzone')) {
    q.genreId = 10752; // War
    q.withKeywords = mergeKeywords(q.withKeywords, KW_WAR);
  }
  if (tags.includes('fantasy_world') && !q.genreId) q.genreId = 14; // Fantasy

  if (tags.includes('short')) q.runtimeLte = 110;
  if (tags.includes('epic')) q.runtimeGte = 140;

  // Rating — exact vs ceiling. US: G < PG < PG-13 < R < NC-17
  if (tags.includes('rate_g')) {
    q.certificationCountry = 'US';
    q.certificationLte = 'PG';
  } else if (tags.includes('rate_pg13')) {
    q.certificationCountry = 'US';
    q.certificationLte = 'PG-13';
  } else if (tags.includes('rate_r_only')) {
    q.certificationCountry = 'US';
    q.certification = 'R';
  } else if (tags.includes('rate_r')) {
    q.certificationCountry = 'US';
    q.certificationLte = 'R';
  } else if (tags.includes('rate_nc17')) {
    q.certificationCountry = 'US';
    q.certification = 'NC-17';
    q.includeAdult = true;
  }

  // Nudity: TMDb keyword tags — “no nudity” excludes tagged titles
  if (tags.includes('no_nudity')) {
    q.withoutKeywords = KW_NUDITY;
  }

  if (tags.includes('mood_funny') && !q.genreId) q.genreId = GENRE_TMDB.comedy;
  if (tags.includes('mood_scary') && !q.genreId) q.genreId = GENRE_TMDB.horror;
  if (tags.includes('mood_romantic') && !q.genreId) q.genreId = GENRE_TMDB.romance;
  if (tags.includes('goal_laugh') && !q.genreId) q.genreId = GENRE_TMDB.comedy;
  if (tags.includes('goal_scare') && !q.genreId) q.genreId = GENRE_TMDB.horror;

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
        yearGte: query.yearGte,
        yearLte: query.yearLte,
        withKeywords: query.withKeywords,
        withoutKeywords: query.withoutKeywords,
        certificationCountry: query.certificationCountry,
        certification: query.certification,
        certificationLte: query.certificationLte,
        certificationGte: query.certificationGte,
        includeAdult: query.includeAdult,
        sortBy: 'popularity.desc',
      })
    )
  );

  for (const batch of batches) {
    totalResults = Math.max(totalResults, batch.totalResults || 0);
    totalPages = Math.max(totalPages, batch.totalPages || 1);
    batch.results.forEach((m) => map.set(String(m.id), m));
  }

  // Only blend seeds when browsing broadly — never when keywords/years lock the pool
  if (
    !query.genreId &&
    !query.withoutGenreIds?.length &&
    !query.withKeywords &&
    !query.withoutKeywords &&
    !query.yearGte &&
    !query.yearLte &&
    !query.certification &&
    !query.certificationLte
  ) {
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef<PoolQuery>({});

  const currentQ = QUESTION_BANK[Math.min(currentStep, QUESTION_BANK.length - 1)];
  const answeredCount = Object.keys(answers).length;

  const recompute = useCallback((pool: Movie[], nextTags: string[]) => {
    const filtered =
      nextTags.length === 0
        ? pool
        : pool.filter((m) => hardPasses(m, nextTags));
    // NEVER fall back to the unfiltered pool when a hard setting/content tag is on —
    // that made Space look like "no change" and kept the 20k+ count.
    const hasHardNarrow = nextTags.some((t) =>
      (
        SETTING_TAGS as readonly string[]
      ).includes(t) ||
      ['no_gore', 'lots_gore', 'no_tragedy', 'super_sad', 'no_nudity', 'want_animated', 'want_kids', 'want_adult'].includes(t) ||
      t.startsWith('era_')
    );
    const working =
      filtered.length > 0 ? filtered : hasHardNarrow ? filtered : pool;
    const scored = working
      .map((movie) => ({ movie, score: scoreMovie(movie, nextTags) }))
      .sort((a, b) => b.score - a.score)
      .map((s) => s.movie);
    setRanked(scored);
    setVisibleCount(PAGE_SIZE);
    return scored;
  }, []);

  const loadPoolForTags = useCallback(
    async (tags: string[]) => {
      const query = poolQueryFromTags(tags);
      activeQueryRef.current = query;
      setIsLoadingPool(true);
      // Settings need more pages so keyword/hard filters still leave a real list
      const pagesToFetch = tags.some((t) => (SETTING_TAGS as readonly string[]).includes(t))
        ? 24
        : INITIAL_PAGES;
      const { movies, totalResults, totalPages } = await fetchDiscoverPages(query, 1, pagesToFetch);
      setMoviePool(movies);
      setMaxPages(totalPages);
      setNextPage(pagesToFetch + 1);
      const scored = recompute(movies, tags);
      // Keyword/year/cert discover totals already narrowed — use them.
      // Client-only setting text filters: show filtered length so Space isn't stuck at 20k+.
      const clientOnlySetting = tags.some((t) =>
        ['city', 'small_town', 'fantasy_world', 'no_gore', 'lots_gore', 'no_tragedy', 'super_sad', 'no_nudity'].includes(
          t
        )
      );
      const keywordLocked = Boolean(query.withKeywords);
      if (clientOnlySetting && !keywordLocked) {
        setCatalogTotal(scored.length);
      } else if (totalResults > 0) {
        setCatalogTotal(totalResults);
      } else {
        setCatalogTotal(scored.length);
      }
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

  const celebrateIfReady = (scored: Movie[], nextAnswers: Record<number, { label: string; tag: string }>) => {
    const n = Object.keys(nextAnswers).length;
    if (n < MIN_QS_BEFORE_FOUND) return false;
    if (scored.length === 0) return false;

    const hardLeft = scored.filter((m) => hardPasses(m, Object.values(nextAnswers).map((a) => a.tag)));
    // Only celebrate when truly tiny — never because we under-fetched
    const tight = hardLeft.length > 0 && hardLeft.length <= FOUND_THRESHOLD && (catalogTotal ?? 999) <= 40;
    const allAnswered = n >= QUESTION_BANK.length;

    if (tight || allAnswered) {
      const winner = (tight ? hardLeft : scored)[0];
      setFoundMovie(winner);
      setVisibleCount(Math.max(PAGE_SIZE * 2, 48));
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
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

  const jumpToStep = (step: number) => {
    setCurrentStep(Math.max(0, Math.min(QUESTION_BANK.length - 1, step)));
    setFiltersOpen(true);
  };

  const handleSelectOption = async (option: { label: string; tag: string }) => {
    const nextAnswers = { ...answers, [currentStep]: option };
    setAnswers(nextAnswers);
    const nextTags = Object.values(nextAnswers).map((a) => a.tag);

    const scored = await loadPoolForTags(nextTags);

    if (celebrateIfReady(scored, nextAnswers)) {
      return;
    }

    // Wizard: next unanswered after this one; if you jumped ahead, wrap to earlier gaps
    const nxt = nextUnansweredStep(nextAnswers, currentStep);
    if (nxt != null) {
      setCurrentStep(nxt);
      setFiltersOpen(true);
    } else {
      celebrateIfReady(scored, nextAnswers);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setFoundMovie(null);
    setVisibleCount(PAGE_SIZE);
    setFiltersOpen(true);
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

  // ── Found celebration + endlessly scrollable close matches ──
  if (foundMovie) {
    const closeMatches = visible.filter((m) => String(m.id) !== String(foundMovie.id));
    return (
      <div className="w-full h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] overflow-hidden flex flex-col gap-2 p-2 sm:p-3 animate-fade-in">
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl px-3 py-3">
          <button
            type="button"
            onClick={() => (onSelectMovie ? onSelectMovie(foundMovie) : onPlayTrailer(foundMovie))}
            className="flex items-center gap-3 group text-left min-w-0"
          >
            <div className="relative w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden border-2 border-amber-400 shrink-0 shadow-lg shadow-amber-500/20">
              {foundMovie.poster_path ? (
                <Image
                  src={foundMovie.poster_path}
                  alt={foundMovie.title}
                  fill
                  sizes="80px"
                  className="object-cover group-hover:scale-105 transition"
                  unoptimized={foundMovie.poster_path.startsWith('http')}
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> We found your movie
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white truncate">{foundMovie.title}</h2>
              <p className="text-xs text-neutral-400">
                ★ {foundMovie.vote_average?.toFixed(1) ?? '—'} · {foundMovie.release_date?.slice(0, 4)}
              </p>
            </div>
          </button>
          <div className="flex gap-2 sm:ml-auto shrink-0">
            <button
              type="button"
              onClick={() => onPlayTrailer(foundMovie)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-sm flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-current" /> Trailer
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 text-neutral-200 font-semibold text-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Again
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 rounded-xl border border-neutral-800 bg-neutral-950/90 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-800/80 shrink-0">
            <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Also close · {displayTotal.toLocaleString()}
              {displayTotal > ranked.length ? '+' : ''} in filter
            </p>
            {visibleCount < ranked.length || nextPage <= maxPages ? (
              <span className="text-[9px] text-neutral-500">
                {isLoadingMore ? 'Loading more…' : 'Scroll for more'}
              </span>
            ) : null}
          </div>
          <div
            ref={listRef}
            onScroll={onListScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5 sm:gap-3">
              {closeMatches.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => (onSelectMovie ? onSelectMovie(m) : onPlayTrailer(m))}
                  className="relative w-full aspect-[2/3] rounded-xl overflow-hidden border border-neutral-700 hover:border-amber-400 transition bg-neutral-900"
                  title={m.title}
                >
                  {m.poster_path ? (
                    <Image src={m.poster_path} alt={m.title} fill sizes="180px" className="object-cover" unoptimized />
                  ) : null}
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-black bg-black/75 text-amber-300 px-1 rounded">
                    #{i + 2}
                  </span>
                  <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pt-5 pb-1.5 text-[11px] font-semibold text-white line-clamp-2 text-left">
                    {m.title}
                  </span>
                </button>
              ))}
            </div>
            {visibleCount < ranked.length || nextPage <= maxPages ? (
              <div className="flex justify-center py-4">
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
                      : `Load more from TMDb`}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] overflow-hidden flex flex-col p-2 sm:p-3 gap-2">
      {/* Category jump bar — wizard in order, or click any to jump */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0 hidden sm:inline">
          Matchmaker
        </span>
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-max pr-1">
            {QUESTION_BANK.map((q, i) => {
              const answered = answers[i] != null;
              const active = currentStep === i;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => jumpToStep(i)}
                  title={answered ? `${q.category}: ${answers[i].label}` : q.question}
                  className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-lg border transition shrink-0 ${
                    active
                      ? 'bg-amber-500 text-neutral-950 border-amber-400'
                      : answered
                        ? 'bg-amber-500/15 text-amber-200 border-amber-500/35 hover:bg-amber-500/25'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-neutral-200'
                  }`}
                >
                  {answered && !active ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {q.category}
                    </span>
                  ) : (
                    q.category
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 shrink-0 tabular-nums">
          {answeredCount}/{QUESTION_BANK.length}
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="p-1 rounded-md text-neutral-500 hover:text-white shrink-0"
          title="Start over"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filters — collapsible so results can fill the screen */}
      <div className="shrink-0 flex flex-col bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-2.5 py-2 sm:px-3 text-left hover:bg-neutral-800/40 transition"
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-white truncate flex-1">
            {filtersOpen
              ? `${currentQ.category} · ${currentQ.question}`
              : answeredCount > 0
                ? `${answeredCount} filter${answeredCount === 1 ? '' : 's'} on · tap to ask more`
                : 'Filters · tap to start'}
          </span>
          {!filtersOpen ? (
            <span className="hidden sm:inline text-[10px] text-amber-400/90 font-semibold shrink-0 truncate max-w-[10rem]">
              {answers[currentStep]
                ? `Edit: ${currentQ.category}`
                : `Next: ${currentQ.category}`}
            </span>
          ) : null}
          {filtersOpen ? (
            <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
          )}
        </button>

        {answeredCount > 0 ? (
          <div className="flex flex-wrap gap-1 px-2.5 pb-2 sm:px-3">
            {Object.entries(answers)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([step, a]) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => jumpToStep(Number(step))}
                  className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25 transition"
                  title={`Edit ${QUESTION_BANK[Number(step)]?.category ?? ''}`}
                >
                  <span className="text-amber-400/80 mr-1">{QUESTION_BANK[Number(step)]?.category}</span>
                  {a.label}
                </button>
              ))}
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 border-t border-neutral-800/80 pt-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-[15px] sm:text-base font-extrabold text-white leading-tight">
                {currentQ.question}
              </h2>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => jumpToStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="p-1 rounded-md text-neutral-400 disabled:opacity-30"
                  aria-label="Back"
                  type="button"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const nxt = nextUnansweredStep(answers, currentStep);
                    if (nxt != null) jumpToStep(nxt);
                    else jumpToStep(Math.min(QUESTION_BANK.length - 1, currentStep + 1));
                  }}
                  className="p-1 rounded-md text-neutral-400"
                  aria-label="Next unanswered"
                  type="button"
                  title="Next unanswered"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="ml-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400 hover:text-white px-1.5 py-1 rounded-md border border-neutral-700"
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentStep]?.tag === opt.tag;
                const isDontCare =
                  opt.tag === 'any' || opt.tag.endsWith('_any') || opt.tag.endsWith('_skip');
                const spanFull = isDontCare && currentQ.options.length % 2 === 1;
                return (
                  <button
                    key={opt.tag}
                    type="button"
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
        ) : null}
      </div>

      {/* Full ranked list — fills leftover screen */}
      <div className="flex-1 min-h-0 rounded-xl border border-neutral-800 bg-neutral-950/90 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-800/80 shrink-0 gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="truncate">
              {isLoadingPool
                ? 'Loading…'
                : displayTotal >= 1000
                  ? `${displayTotal.toLocaleString()}+ matches`
                  : `${displayTotal.toLocaleString()} matches`}
              {answeredCount > 0 && !isLoadingPool ? ' · live' : ''}
            </span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {!filtersOpen ? (
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="text-[10px] font-bold text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition"
              >
                + Filter
              </button>
            ) : null}
            {visibleCount < ranked.length || nextPage <= maxPages ? (
              <span className="text-[9px] text-neutral-500 hidden sm:inline">
                {isLoadingMore ? 'Loading more…' : 'Scroll for more'}
              </span>
            ) : null}
          </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5 sm:gap-3">
              {visible.map((movie, i) => (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => (onSelectMovie ? onSelectMovie(movie) : onPlayTrailer(movie))}
                  title={movie.title}
                  className="flex flex-col gap-1.5 min-w-0 text-left group"
                >
                  <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden border border-neutral-700 group-hover:border-amber-400 transition bg-neutral-900">
                    {movie.poster_path ? (
                      <Image
                        src={movie.poster_path}
                        alt={movie.title}
                        fill
                        sizes="(max-width:640px) 45vw, (max-width:1024px) 22vw, 180px"
                        className="object-cover"
                        unoptimized={movie.poster_path.startsWith('http')}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
                        {movie.title.slice(0, 1)}
                      </span>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-black bg-black/75 text-amber-300 px-1 rounded">
                      #{i + 1}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-200 line-clamp-2 leading-tight px-0.5">
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
