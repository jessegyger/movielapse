'use client';

import { Movie } from './types';
import { tmdb, DEFAULT_TMDB_API_KEY } from './client';

export type WizardAnswer = 'yes' | 'sometimes' | 'no' | 'skip';

export interface DiscoverParamUpdate {
  with_genres?: string;
  without_genres?: string;
  with_keywords?: string;
  without_keywords?: string;
  with_companies?: string;
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
  vote_count_gte?: number;
  vote_average_gte?: number;
  with_original_language?: string;
}

export interface WizardQuestion {
  id: string;
  question: string;
  hint?: string;
  isEra?: boolean;
  actorPhoto?: string;
  actorName?: string;
  match: (m: Movie) => number;
  onYes?: DiscoverParamUpdate;
  onNo?: DiscoverParamUpdate;
}

export interface ScoredMovie {
  movie: Movie;
  score: number;
}

export interface LiveDiscoverFilters {
  with_genres: Set<string>;
  without_genres: Set<string>;
  with_keywords: Set<string>;
  without_keywords: Set<string>;
  with_companies?: string;
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
  vote_count_gte?: number;
  vote_average_gte?: number;
  with_original_language?: string;
}

export function createInitialFilters(): LiveDiscoverFilters {
  return {
    with_genres: new Set(),
    without_genres: new Set(),
    with_keywords: new Set(),
    without_keywords: new Set(),
    vote_count_gte: 15,
  };
}

export interface StudioOption {
  id: string;
  label: string;
  companyId: string;
}

export const POPULAR_STUDIOS: StudioOption[] = [
  { id: 'all', label: 'All Studios', companyId: '' },
  { id: 'disney', label: 'Disney / Pixar', companyId: '2|3' },
  { id: 'marvel', label: 'Marvel', companyId: '420' },
  { id: 'dreamworks', label: 'DreamWorks', companyId: '521' },
  { id: 'ghibli', label: 'Studio Ghibli', companyId: '10342' },
  { id: 'warner', label: 'Warner Bros', companyId: '174' },
  { id: 'a24', label: 'A24', companyId: '41077' },
];

export interface DecadeOption {
  id: string;
  label: string;
  gte?: string;
  lte?: string;
}

export const DECADE_OPTIONS: DecadeOption[] = [
  { id: 'all', label: 'Any Year' },
  { id: '2020s', label: '2020s', gte: '2020-01-01' },
  { id: '2010s', label: '2010s', gte: '2010-01-01', lte: '2019-12-31' },
  { id: '2000s', label: '2000s', gte: '2000-01-01', lte: '2009-12-31' },
  { id: '90s', label: '1990s', gte: '1990-01-01', lte: '1999-12-31' },
  { id: '80s', label: '1980s', gte: '1980-01-01', lte: '1989-12-31' },
  { id: 'classics', label: 'Pre-1980', lte: '1979-12-31' },
];

// ── Match helpers returning values between 0.0 and 1.0 ───────────────────────

const genreWeight = (m: Movie, ...genres: string[]): number => {
  if (!m.genres || m.genres.length === 0) return 0;
  const matchIdx = m.genres.findIndex((mg) =>
    genres.some((g) => mg.toLowerCase().includes(g.toLowerCase()))
  );
  if (matchIdx === 0) return 1.0;
  if (matchIdx > 0) return 0.7;
  return 0;
};

const eraWeight = (m: Movie, from: number, to: number): number => {
  const y = Number(m.release_date?.slice(0, 4) || 0);
  if (y >= from && y <= to) return 1.0;
  if (Math.abs(y - from) <= 2 || Math.abs(y - to) <= 2) return 0.4;
  return 0;
};

const textMatch = (m: Movie, ...keywords: string[]): number => {
  const text = `${m.title || ''} ${m.overview || ''} ${m.tagline || ''}`.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) hits++;
  }
  if (hits >= 2) return 1.0;
  if (hits === 1) return 0.7;
  return 0;
};

// ── Clear, single-focus question bank (No confusing "this or that") ───────────

export const QUESTION_BANK: WizardQuestion[] = [
  // Eras (flagged as isEra: true so answering or picking an era skips the rest)
  {
    id: 'era_modern',
    question: 'Was it released after the year 2000?',
    hint: 'Released in the 21st century',
    isEra: true,
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 0);
      if (y > 2000) return 1.0;
      if (y >= 1998) return 0.4;
      return 0;
    },
    onYes: { primary_release_date_gte: '2001-01-01' },
    onNo: { primary_release_date_lte: '2000-12-31' },
  },
  {
    id: 'era_2010s',
    question: 'Was it released in the 2010s or later?',
    hint: '2010 to present day',
    isEra: true,
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 0);
      if (y >= 2010) return 1.0;
      if (y >= 2007) return 0.4;
      return 0;
    },
    onYes: { primary_release_date_gte: '2010-01-01' },
    onNo: { primary_release_date_lte: '2009-12-31' },
  },
  {
    id: 'era_90s',
    question: 'Was it released in the 1990s?',
    hint: '1990 to 1999',
    isEra: true,
    match: (m) => eraWeight(m, 1990, 1999),
    onYes: { primary_release_date_gte: '1990-01-01', primary_release_date_lte: '1999-12-31' },
  },
  {
    id: 'era_80s',
    question: 'Was it released in the 1980s?',
    hint: '1980 to 1989',
    isEra: true,
    match: (m) => eraWeight(m, 1980, 1989),
    onYes: { primary_release_date_gte: '1980-01-01', primary_release_date_lte: '1989-12-31' },
  },
  {
    id: 'era_classic',
    question: 'Is it an older classic film made before 1980?',
    hint: '1970s or earlier',
    isEra: true,
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 9999);
      if (y < 1980) return 1.0;
      if (y <= 1983) return 0.4;
      return 0;
    },
    onYes: { primary_release_date_lte: '1979-12-31' },
    onNo: { primary_release_date_gte: '1980-01-01' },
  },

  // Studio / Style
  {
    id: 'disney_pixar',
    question: 'Is it a Walt Disney or Pixar movie?',
    hint: 'Disney classics, Pixar animations, Disney live action',
    match: (m) => {
      const t = `${m.title || ''} ${m.overview || ''}`.toLowerCase();
      if (t.includes('disney') || t.includes('pixar')) return 1.0;
      return 0;
    },
    onYes: { with_companies: '2|3' },
  },
  {
    id: 'animated',
    question: 'Is it an animated movie?',
    hint: 'Hand-drawn, CGI, 3D animated, or anime',
    match: (m) => genreWeight(m, 'Animation'),
    onYes: { with_genres: '16' },
    onNo: { without_genres: '16' },
  },
  {
    id: 'musical',
    question: 'Is it a musical with singing and songs?',
    hint: 'Characters sing songs that drive the story',
    match: (m) => genreWeight(m, 'Music'),
    onYes: { with_genres: '10402' },
  },
  {
    id: 'superhero',
    question: 'Does it feature superheroes?',
    hint: 'Avengers, Batman, Spider-Man, Superman, X-Men, etc.',
    match: (m) => {
      const t = `${m.title || ''} ${m.overview || ''}`.toLowerCase();
      if (/\b(spider-man|batman|superman|iron man|avengers|marvel|dc comics|thor|captain america|x-men|joker)\b/.test(t)) return 1.0;
      return textMatch(m, 'superhero', 'super power');
    },
    onYes: { with_keywords: '9715|18073' },
  },
  {
    id: 'comedy',
    question: 'Is it primarily a comedy intended to make you laugh?',
    match: (m) => genreWeight(m, 'Comedy'),
    onYes: { with_genres: '35' },
    onNo: { without_genres: '35' },
  },
  {
    id: 'horror',
    question: 'Is it a horror movie designed to scare you?',
    match: (m) => genreWeight(m, 'Horror'),
    onYes: { with_genres: '27' },
    onNo: { without_genres: '27' },
  },
  {
    id: 'action',
    question: 'Is it an action movie with fights or chases?',
    match: (m) => genreWeight(m, 'Action'),
    onYes: { with_genres: '28' },
    onNo: { without_genres: '28' },
  },
  {
    id: 'scifi',
    question: 'Is it a science fiction movie?',
    hint: 'Futuristic technology, sci-fi themes',
    match: (m) => genreWeight(m, 'Sci-Fi', 'Science Fiction'),
    onYes: { with_genres: '878' },
    onNo: { without_genres: '878' },
  },
  {
    id: 'fantasy_magic',
    question: 'Does it involve magic or a fantasy world?',
    hint: 'Wizards, spells, magical realms, mythical creatures',
    match: (m) => genreWeight(m, 'Fantasy'),
    onYes: { with_genres: '14' },
    onNo: { without_genres: '14' },
  },
  {
    id: 'romance',
    question: 'Is there a central romantic love story?',
    match: (m) => genreWeight(m, 'Romance'),
    onYes: { with_genres: '10749' },
    onNo: { without_genres: '10749' },
  },
  {
    id: 'thriller',
    question: 'Is it a suspenseful thriller?',
    match: (m) => genreWeight(m, 'Thriller'),
    onYes: { with_genres: '53' },
    onNo: { without_genres: '53' },
  },
  {
    id: 'crime',
    question: 'Does it revolve around criminals, gangsters, or police?',
    match: (m) => genreWeight(m, 'Crime'),
    onYes: { with_genres: '80' },
  },
  {
    id: 'war',
    question: 'Is it set during a military war with soldiers?',
    match: (m) => genreWeight(m, 'War'),
    onYes: { with_genres: '10752' },
    onNo: { without_genres: '10752' },
  },
  {
    id: 'detective',
    question: 'Does it center on solving a murder or mystery?',
    hint: 'Whodunit, detective investigation',
    match: (m) => genreWeight(m, 'Mystery'),
    onYes: { with_genres: '9648' },
  },

  // Setting and Plot Devices
  {
    id: 'outer_space',
    question: 'Does the story take place in outer space?',
    hint: 'Spaceships, other planets, astronauts, galaxies',
    match: (m) => textMatch(m, 'space', 'spaceship', 'planet', 'galaxy', 'astronaut', 'orbit'),
    onYes: { with_keywords: '9882|3801' },
  },
  {
    id: 'time_travel',
    question: 'Does it involve time travel or a time loop?',
    match: (m) => textMatch(m, 'time travel', 'time loop', 'timeline', 'wormhole'),
    onYes: { with_keywords: '4379' },
  },
  {
    id: 'heist',
    question: 'Does it involve a heist, bank robbery, or major theft?',
    match: (m) => textMatch(m, 'heist', 'robbery', 'bank', 'steal', 'vault'),
    onYes: { with_keywords: '10051|9717' },
  },
  {
    id: 'spy',
    question: 'Does it feature secret agents, spies, or assassins?',
    match: (m) => textMatch(m, 'spy', 'agent', 'assassin', 'hitman', 'cia', 'mi6'),
    onYes: { with_keywords: '470|9713' },
  },
  {
    id: 'animal_protagonist',
    question: 'Is the main character an animal?',
    hint: 'Dog, cat, lion, fish, bear, etc.',
    match: (m) => textMatch(m, 'dog', 'puppy', 'cat', 'lion', 'fish', 'bear', 'animal', 'wolf'),
    onYes: { with_keywords: '2085|209212' },
  },
  {
    id: 'robots_ai',
    question: 'Does it feature robots or artificial intelligence?',
    match: (m) => textMatch(m, 'robot', 'artificial intelligence', 'cyborg', 'android'),
    onYes: { with_keywords: '310|14544' },
  },
  {
    id: 'monsters_zombies',
    question: 'Does it feature zombies, vampires, or monsters?',
    match: (m) => textMatch(m, 'zombie', 'vampire', 'monster', 'creature', 'undead'),
    onYes: { with_keywords: '12377|3133' },
  },
  {
    id: 'survival',
    question: 'Is it a survival story — stranded or trapped alone?',
    hint: 'Island, plane crash, shipwreck, wild wilderness',
    match: (m) => textMatch(m, 'stranded', 'survival', 'plane crash', 'shipwreck', 'deserted'),
    onYes: { with_keywords: '10085|10705' },
  },
  {
    id: 'racing_cars',
    question: 'Are fast cars or driving a main focus of the movie?',
    match: (m) => textMatch(m, 'racing', 'fast car', 'street race', 'driver', 'speed'),
    onYes: { with_keywords: '830|10087' },
  },
  {
    id: 'sports',
    question: 'Is the movie about an athlete or sports team?',
    match: (m) => textMatch(m, 'boxing', 'boxer', 'coach', 'championship', 'football', 'baseball', 'basketball'),
  },
  {
    id: 'based_on_true',
    question: 'Is it based on a true story or real historical events?',
    match: (m) => genreWeight(m, 'History', 'Biography'),
    onYes: { with_genres: '36' },
  },
  {
    id: 'high_rated',
    question: 'Is it critically acclaimed — high ratings or major awards?',
    match: (m) => (m.vote_average >= 7.8 ? 1.0 : 0.2),
    onYes: { vote_average_gte: 7.7, vote_count_gte: 200 },
  },
];

// ── Live TMDb Discover Fetcher (Queries all 1,000,000+ Movies) ────────────────

export async function queryLiveTMDbDiscover(
  filters: LiveDiscoverFilters,
  pages: number = 2,
  startPage: number = 1
): Promise<Movie[]> {
  const apiKey = tmdb.getApiKey() || DEFAULT_TMDB_API_KEY;
  const baseUrl = 'https://api.themoviedb.org/3/discover/movie';

  let query = `api_key=${apiKey}&sort_by=popularity.desc&include_adult=false`;

  if (filters.primary_release_date_gte) {
    query += `&primary_release_date.gte=${filters.primary_release_date_gte}`;
  }
  if (filters.primary_release_date_lte) {
    query += `&primary_release_date.lte=${filters.primary_release_date_lte}`;
  }
  if (filters.with_genres.size > 0) {
    query += `&with_genres=${Array.from(filters.with_genres).join(',')}`;
  }
  if (filters.without_genres.size > 0) {
    query += `&without_genres=${Array.from(filters.without_genres).join(',')}`;
  }
  if (filters.with_keywords.size > 0) {
    query += `&with_keywords=${Array.from(filters.with_keywords).join('|')}`;
  }
  if (filters.without_keywords.size > 0) {
    query += `&without_keywords=${Array.from(filters.without_keywords).join(',')}`;
  }
  if (filters.with_companies) {
    query += `&with_companies=${filters.with_companies}`;
  }
  if (filters.vote_count_gte) {
    query += `&vote_count.gte=${filters.vote_count_gte}`;
  }
  if (filters.vote_average_gte) {
    query += `&vote_average.gte=${filters.vote_average_gte}`;
  }
  if (filters.with_original_language) {
    query += `&with_original_language=${filters.with_original_language}`;
  }

  const pageList = Array.from({ length: pages }, (_, i) => startPage + i);
  const requests = pageList.map(async (p) => {
    try {
      const res = await fetch(`${baseUrl}?${query}&page=${p}`);
      if (res.ok) {
        const data = await res.json();
        return (data.results || []).map((m: any) => tmdb.formatTMDbMovie(m));
      }
    } catch (err) {
      console.warn('TMDb live discover query error', err);
    }
    return [] as Movie[];
  });

  const results = await Promise.all(requests);
  return results.flat().filter((m) => m && m.poster_path && m.title);
}

// ── Live TMDb Search for Actor, Character, or Plot Keyword ───────────────────

export async function searchLiveTMDb(query: string): Promise<Movie[]> {
  const clean = query.trim();
  if (!clean) return [];
  const apiKey = tmdb.getApiKey() || DEFAULT_TMDB_API_KEY;
  try {
    const [movieRes, personRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(clean)}&include_adult=false`),
      fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(clean)}&include_adult=false`),
    ]);
    const movies: Movie[] = [];
    if (movieRes.ok) {
      const mData = await movieRes.json();
      (mData.results || []).slice(0, 20).forEach((m: any) => {
        if (m.poster_path) movies.push(tmdb.formatTMDbMovie(m));
      });
    }
    if (personRes.ok) {
      const pData = await personRes.json();
      const person = pData.results?.[0];
      if (person) {
        const credits = await fetch(`https://api.themoviedb.org/3/person/${person.id}/movie_credits?api_key=${apiKey}`);
        if (credits.ok) {
          const cData = await credits.json();
          const pMovies = (cData.cast || []).concat(cData.crew || [])
            .filter((item: any) => item.poster_path)
            .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 20);
          pMovies.forEach((m: any) => movies.push(tmdb.formatTMDbMovie(m)));
        }
      }
    }
    return movies;
  } catch (err) {
    console.warn('searchLiveTMDb error', err);
    return [];
  }
}

// ── Probabilistic Scoring Across Candidate Pool ──────────────────────────────

export function scoreAllMovies(
  movies: Movie[],
  history: { q: WizardQuestion; answer: WizardAnswer }[],
  clueMatches: Set<string> = new Set()
): ScoredMovie[] {
  return movies.map((m) => {
    let score = Math.min((m.vote_count || 0) / 4000, 2.5);

    if (clueMatches.has(String(m.id))) {
      score += 20.0; // massive priority boost if user clue matches
    }

    for (const { q, answer } of history) {
      const match = q.match(m);
      switch (answer) {
        case 'yes':
          if (match >= 0.7) score += 4.5;
          else if (match >= 0.3) score += 1.5;
          else score -= 4.0; // strong penalty for mismatching a 'yes' answer
          break;
        case 'sometimes':
          if (match >= 0.2 && match <= 0.8) score += 2.5;
          else if (match > 0.8) score += 1.2;
          else score -= 0.5;
          break;
        case 'no':
          if (match <= 0.2) score += 2.5;
          else if (match <= 0.5) score += 0.5;
          else score -= 5.0; // strong penalty for mismatching a 'no' answer
          break;
        case 'skip':
          break;
      }
    }

    return { movie: m, score };
  }).sort((a, b) => b.score - a.score);
}

// ── Next Question Selector ───────────────────────────────────────────────────

export function selectNextQuestion(
  scoredPool: ScoredMovie[],
  askedIds: Set<string>,
  hasAnsweredEra: boolean = false
): WizardQuestion | null {
  const available = QUESTION_BANK.filter((q) => {
    if (askedIds.has(q.id)) return false;
    // If the user already answered or selected an era, never ask another era question
    if (hasAnsweredEra && q.isEra) return false;
    return true;
  });

  if (available.length === 0) return null;

  const topContenders = scoredPool.slice(0, 30).map((s) => s.movie);
  if (topContenders.length === 0) return available[0];

  let best: WizardQuestion | null = null;
  let bestScore = -1;

  for (const q of available) {
    const matchingCount = topContenders.filter((m) => q.match(m) >= 0.3).length;
    // CRITICAL FIX: Only ask questions where a meaningful percentage of remaining movies match.
    // If nobody matches (e.g. 0 movies have gangsters), NEVER ask about it!
    if (matchingCount < 1 || matchingCount >= topContenders.length) {
      continue;
    }

    const avg = matchingCount / topContenders.length;
    const score = 1.0 - Math.abs(avg - 0.5) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return best;
}

// ── Actor Picture Identification & Dynamic On-The-Fly Questions ─────────────

export interface ActorCandidate {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  movieCount: number;
  movieIds: Set<number>;
}

const creditsCache = new Map<number, { cast: any[]; crew: any[] }>();

export async function fetchTopActorsForCandidates(
  movies: Movie[],
  maxActors: number = 8
): Promise<ActorCandidate[]> {
  const apiKey = tmdb.getApiKey() || DEFAULT_TMDB_API_KEY;
  const topMovies = movies.slice(0, 15);
  const actorMap = new Map<number, ActorCandidate>();

  const fetchCredits = async (m: Movie) => {
    const numId = Number(m.id);
    if (!numId) return;
    let data = creditsCache.get(numId);
    if (!data) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${numId}/credits?api_key=${apiKey}`
        );
        if (res.ok) {
          data = await res.json();
          creditsCache.set(numId, data!);
        }
      } catch (err) {
        console.warn('Credits fetch error', err);
      }
    }
    if (data && data.cast && Array.isArray(data.cast)) {
      data.cast.slice(0, 5).forEach((actor: any) => {
        if (!actor.id || !actor.name || !actor.profile_path) return;
        const existing = actorMap.get(actor.id);
        if (existing) {
          existing.movieCount += 1;
          existing.movieIds.add(numId);
        } else {
          actorMap.set(actor.id, {
            id: actor.id,
            name: actor.name,
            character: actor.character,
            profile_path: `https://image.tmdb.org/t/p/w185${actor.profile_path}`,
            movieCount: 1,
            movieIds: new Set([numId]),
          });
        }
      });
    }
  };

  await Promise.all(topMovies.map(fetchCredits));

  return Array.from(actorMap.values())
    .filter((a) => a.profile_path && a.movieCount >= 1)
    .sort((a, b) => b.movieCount - a.movieCount)
    .slice(0, maxActors);
}

/**
 * Common storyline themes to check dynamically from movie overviews and genres
 */
const DYNAMIC_THEME_CANDIDATES: { id: string; question: string; hint?: string; test: (m: Movie) => boolean }[] = [
  {
    id: 'theme_animated',
    question: 'Is the movie completely animated?',
    hint: '3D animated, CGI, hand-drawn, or cartoon',
    test: (m) => m.genres?.some((g) => g.toLowerCase().includes('animation')) || false,
  },
  {
    id: 'theme_disney',
    question: 'Is it produced by Disney or Pixar?',
    hint: 'Walt Disney Pictures, Disney Animation, or Pixar',
    test: (m) => {
      const t = `${m.title} ${m.overview || ''}`.toLowerCase();
      return t.includes('disney') || t.includes('pixar');
    },
  },
  {
    id: 'theme_royal_kingdom',
    question: 'Does it involve princesses, princes, royalty, or a fantasy kingdom?',
    hint: 'Castles, monarchy, crowns, royal lineage',
    test: (m) => /\b(princess|prince|queen|king|kingdom|castle|royal|throne)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_animals',
    question: 'Are talking animals or animal characters central to the story?',
    hint: 'Animals that talk or embark on a journey',
    test: (m) => /\b(animal|dog|puppy|cat|lion|bear|fish|deer|rabbit|mouse|fox|wolf|elephant|jungle)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_magic_spells',
    question: 'Does it feature magic, curses, spells, or mythical powers?',
    hint: 'Sorcery, enchanted objects, magical transformations',
    test: (m) => /\b(magic|magical|curse|cursed|spell|witch|wizard|fairy|genie|enchanted)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_singing_songs',
    question: 'Do characters frequently break into song or is music a main theme?',
    hint: 'Musical numbers, memorable singing sequences',
    test: (m) => m.genres?.some((g) => g.toLowerCase().includes('music')) || /\b(musical|sing|singing|song|soundtrack)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_family_children',
    question: 'Is it centered around family, siblings, or parents and children?',
    hint: 'Parenthood, brother/sister relationship, or family bonds',
    test: (m) => /\b(family|father|mother|sister|brother|daughter|son|parents)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_ocean_water',
    question: 'Is it set on the ocean, underwater, or in a tropical island setting?',
    hint: 'Sea, sailing, islands, marine life',
    test: (m) => /\b(ocean|sea|island|water|underwater|ship|sailing|boat|tropic)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_forest_jungle',
    question: 'Is much of the journey set in a deep forest, woods, or wilderness?',
    hint: 'Woodland adventures, trees, enchanted woods',
    test: (m) => /\b(forest|woods|jungle|wilderness|woodland)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_quest_journey',
    question: 'Does the plot involve leaving home on an epic quest or rescue mission?',
    hint: 'Journey to save someone, find a lost treasure, or journey across the world',
    test: (m) => /\b(quest|journey|rescue|save|voyage|mission|trek|expedition|homeward)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_school_young',
    question: 'Is the protagonist a kid, student, or teenager in school or growing up?',
    hint: 'Coming-of-age, youthful protagonist',
    test: (m) => /\b(kid|boy|girl|child|school|student|teen|teenager|young)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_villain_powers',
    question: 'Is there a prominent evil villain trying to conquer, steal, or rule?',
    hint: 'Evil queen, villainous conqueror, wicked scheme',
    test: (m) => /\b(villain|evil|wicked|conquer|ruler|tyrant|destroy|scheme)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_space_futuristic',
    question: 'Is it set in outer space or a futuristic world?',
    hint: 'Spaceships, high-tech planets, future era',
    test: (m) => /\b(space|spaceship|planet|alien|future|futuristic|galaxy)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_romance_love',
    question: 'Does the story have a major love story or romantic couple at its core?',
    hint: 'Falling in love, romantic pursuit',
    test: (m) => m.genres?.some((g) => g.toLowerCase().includes('romance')) || /\b(love|romance|romantic|marry|wedding|couple)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
  {
    id: 'theme_humor_comedy',
    question: 'Is humor and lighthearted comedy a big part of the movie?',
    hint: 'Lots of jokes, physical comedy, or hilarious sidekicks',
    test: (m) => m.genres?.some((g) => g.toLowerCase().includes('comedy')) || /\b(funny|comedy|humor|sidekick|hilarious)\b/i.test(`${m.title} ${m.overview || ''}`),
  },
];

/**
 * Dynamically generates a targeted question on the fly directly from the
 * remaining movies.
 * 
 * Order of Priority:
 * 1. Storyline / Theme / Plot questions that cleanly split remaining movies (30% - 70%)
 * 2. Release era median halving
 * 3. Runtime halving
 * 4. As a LAST RESORT: Actor questions (with actor photo & name attached so it can be displayed prominently)
 */
export function generateDynamicQuestion(
  remaining: Movie[],
  askedIds: Set<string>,
  topActors: ActorCandidate[] = []
): WizardQuestion | null {
  if (remaining.length <= 1) return null;

  // 1. First priority: Storyline / Content / Theme questions that divide the candidates
  let bestThemeQ: WizardQuestion | null = null;
  let bestThemeScore = -1;

  for (const item of DYNAMIC_THEME_CANDIDATES) {
    if (askedIds.has(item.id)) continue;
    const matches = remaining.filter((m) => item.test(m)).length;
    // Only ask if it cleanly divides between 20% and 80% of remaining candidates
    if (matches >= 1 && matches < remaining.length) {
      const ratio = matches / remaining.length;
      const balanceScore = 1.0 - Math.abs(ratio - 0.5) * 2; // peaks at 50/50 split
      if (balanceScore > bestThemeScore) {
        bestThemeScore = balanceScore;
        bestThemeQ = {
          id: item.id,
          question: item.question,
          hint: item.hint,
          match: (m) => (item.test(m) ? 1.0 : 0.0),
        };
      }
    }
  }

  // If we found a good theme question, return it before any actor question!
  if (bestThemeQ) {
    return bestThemeQ;
  }

  // 2. Second priority: Median Year Halving
  const years = remaining
    .map((m) => Number(m.release_date?.slice(0, 4) || 0))
    .filter((y) => y > 1920)
    .sort((a, b) => a - b);

  if (years.length >= 2) {
    const medianYear = years[Math.floor(years.length / 2)];
    const qId = `dyn_year_${medianYear}`;
    if (!askedIds.has(qId)) {
      const beforeCount = remaining.filter(
        (m) => Number(m.release_date?.slice(0, 4) || 0) <= medianYear
      ).length;
      if (beforeCount > 0 && beforeCount < remaining.length) {
        return {
          id: qId,
          question: `Was it released in ${medianYear} or earlier?`,
          hint: `Helps divide the remaining candidates by release year`,
          match: (m) =>
            Number(m.release_date?.slice(0, 4) || 0) <= medianYear ? 1.0 : 0.0,
        };
      }
    }
  }

  // 3. Third priority: Runtime Halving
  const runtimes = remaining
    .map((m) => m.runtime || 105)
    .sort((a, b) => a - b);
  if (runtimes.length >= 4) {
    const medianRuntime = runtimes[Math.floor(runtimes.length / 2)];
    const qId = `dyn_runtime_${medianRuntime}`;
    if (!askedIds.has(qId) && medianRuntime > 70) {
      return {
        id: qId,
        question: `Is it longer than ${medianRuntime} minutes?`,
        match: (m) => ((m.runtime || 105) > medianRuntime ? 1.0 : 0.0),
      };
    }
  }

  // 4. Last resort: Specific Actor (only when storyline & era questions are exhausted)
  // Always attach actorPhoto and actorName so UI can display a large headshot beside the question!
  for (const actor of topActors) {
    const qId = `dyn_actor_${actor.id}`;
    if (!askedIds.has(qId) && actor.movieIds.size > 0 && actor.movieIds.size < remaining.length) {
      return {
        id: qId,
        question: `Does it star ${actor.name}?`,
        hint: actor.character ? `Character role: ${actor.character}` : 'Recognize this actor?',
        actorPhoto: actor.profile_path,
        actorName: actor.name,
        match: (m) => (actor.movieIds.has(Number(m.id)) ? 1.0 : 0.0),
      };
    }
  }

  return null;
}
