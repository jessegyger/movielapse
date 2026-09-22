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
  /** Short "thinking out loud" line shown under the question */
  focusHint?: string;
  isEra?: boolean;
  actorPhoto?: string;
  actorName?: string;
  match: (m: Movie) => number;
  onYes?: DiscoverParamUpdate;
  onNo?: DiscoverParamUpdate;
}

export interface NarrowingInsight {
  hint: string;
  dominantLabels: string[];
  candidateCount: number;
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

// ── Smart Question Implication Matrices ───────────────────────────────────────

/** After a YES, never ask these (incompatible or redundant). */
export const MUTUAL_EXCLUSIONS: Record<string, string[]> = {
  // Kids/Family/Animated -> Skip heavy genres
  animated: ['horror', 'crime', 'war', 'thriller', 'theme_animated', 'theme_villain_powers', 'monsters_zombies'],
  disney_pixar: ['horror', 'crime', 'war', 'thriller', 'theme_disney', 'theme_villain_powers', 'monsters_zombies'],
  theme_animated: ['horror', 'crime', 'war', 'thriller', 'animated', 'theme_villain_powers', 'monsters_zombies'],
  theme_disney: ['horror', 'crime', 'war', 'thriller', 'disney_pixar', 'theme_villain_powers', 'monsters_zombies'],
  theme_family_children: ['horror', 'crime', 'war', 'thriller', 'monsters_zombies'],
  theme_school_young: ['horror', 'war', 'outer_space', 'theme_space_futuristic'],

  // Heavy Genres -> Skip Kids/Family/Light
  horror: ['animated', 'disney_pixar', 'theme_animated', 'theme_disney', 'theme_family_children', 'musical', 'theme_singing_songs', 'comedy', 'theme_humor_comedy', 'sports', 'romance', 'theme_romance_love', 'theme_school_young', 'theme_animals', 'animal_protagonist', 'theme_royal_kingdom', 'cluster_tone_feelgood'],
  crime: ['animated', 'disney_pixar', 'theme_animated', 'theme_disney', 'theme_family_children', 'musical', 'theme_singing_songs', 'theme_animals', 'fantasy_magic', 'theme_royal_kingdom', 'animal_protagonist'],
  war: ['animated', 'disney_pixar', 'theme_animated', 'theme_disney', 'theme_family_children', 'musical', 'theme_singing_songs', 'theme_animals', 'comedy', 'theme_humor_comedy', 'romance', 'theme_romance_love', 'animal_protagonist', 'theme_school_young'],
  thriller: ['animated', 'disney_pixar', 'theme_animated', 'theme_disney', 'theme_family_children', 'musical', 'theme_singing_songs', 'comedy', 'theme_humor_comedy', 'theme_animals', 'animal_protagonist'],

  // Setting conflicts — space is NOT woods/ocean/school, etc.
  outer_space: [
    'theme_space_futuristic',
    'theme_forest_jungle',
    'theme_ocean_water',
    'theme_school_young',
    'theme_royal_kingdom',
    'sports',
    'racing_cars',
    'western',
    'cluster_genre_western',
  ],
  theme_space_futuristic: [
    'outer_space',
    'theme_forest_jungle',
    'theme_ocean_water',
    'theme_school_young',
    'theme_royal_kingdom',
    'sports',
    'racing_cars',
    'western',
  ],
  theme_forest_jungle: [
    'outer_space',
    'theme_space_futuristic',
    'theme_ocean_water',
    'scifi',
    'cluster_genre_science_fiction',
  ],
  theme_ocean_water: [
    'outer_space',
    'theme_space_futuristic',
    'theme_forest_jungle',
  ],
  theme_royal_kingdom: ['outer_space', 'theme_space_futuristic', 'crime', 'war'],

  // Direct conceptual overlaps
  musical: ['theme_singing_songs'],
  theme_singing_songs: ['musical'],
  fantasy_magic: ['theme_magic_spells'],
  theme_magic_spells: ['fantasy_magic'],
  romance: ['theme_romance_love'],
  theme_romance_love: ['romance'],
  comedy: ['theme_humor_comedy'],
  theme_humor_comedy: ['comedy'],
  animal_protagonist: ['theme_animals'],
  theme_animals: ['animal_protagonist'],
  scifi: ['theme_forest_jungle', 'western', 'theme_school_young'],
  cluster_genre_science_fiction: ['theme_forest_jungle', 'theme_ocean_water', 'outer_space', 'theme_space_futuristic', 'western'],
};

export const EQUIVALENT_QUESTIONS: Record<string, string[]> = {
  animated: ['theme_animated'],
  theme_animated: ['animated'],
  disney_pixar: ['theme_disney'],
  theme_disney: ['disney_pixar'],
  musical: ['theme_singing_songs'],
  theme_singing_songs: ['musical'],
  fantasy_magic: ['theme_magic_spells'],
  theme_magic_spells: ['fantasy_magic'],
  outer_space: ['theme_space_futuristic'],
  theme_space_futuristic: ['outer_space'],
  romance: ['theme_romance_love'],
  theme_romance_love: ['romance'],
  comedy: ['theme_humor_comedy'],
  theme_humor_comedy: ['comedy'],
  animal_protagonist: ['theme_animals'],
  theme_animals: ['animal_protagonist'],
};

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
    id: 'era_pre2010',
    question: 'Was it released before the year 2010?',
    hint: '2009 or earlier',
    isEra: true,
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 0);
      if (y < 2010) return 1.0;
      if (y <= 2012) return 0.4;
      return 0;
    },
    onYes: { primary_release_date_lte: '2009-12-31' },
    onNo: { primary_release_date_gte: '2010-01-01' },
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
      if (m.genres?.some(g => g.toLowerCase().includes('family') || g.toLowerCase().includes('animation'))) {
        return 0.5; 
      }
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
  {
    id: 'female_lead',
    question: 'Is the main protagonist / lead role a woman (or girl)?',
    hint: 'The primary lead character is female',
    match: (m) => femaleLeadWeight(m),
  },
];

/** Rough lead-gender heuristic from cast / overview (good enough for early splits). */
const FEMALE_FIRST_NAMES = new Set([
  'amy', 'ana', 'anne', 'annie', 'audrey', 'ava', 'bella', 'blair', 'brie',
  'cate', 'catherine', 'charlize', 'chloe', 'dakota', 'drew', 'elaine', 'elizabeth',
  'ella', 'ellen', 'emily', 'emma', 'florence', 'gal', 'gillian', 'greta', 'gwen',
  'hailee', 'harley', 'helena', 'holly', 'ida', 'irene', 'jane', 'jennifer', 'jenny',
  'jessica', 'joanna', 'jodie', 'julia', 'julianne', 'kate', 'katherine', 'katie',
  'keira', 'kerry', 'kim', 'kirsten', 'kristen', 'laura', 'lauren', 'lena', 'lily',
  'linda', 'lindsay', 'lisa', 'lucy', 'lupita', 'maggie', 'margot', 'maria', 'marie',
  'marion', 'mary', 'maya', 'meryl', 'mia', 'michelle', 'milla', 'molly', 'monica',
  'naomie', 'natalie', 'nicole', 'olivia', 'penelope', 'rachel', 'rebecca', 'renee',
  'rooney', 'rose', 'saoirse', 'sandra', 'sarah', 'scarlett', 'selena', 'sharon',
  'sigourney', 'sofia', 'sophia', 'susan', 'tilda', 'uma', 'victoria', 'viola',
  'whitney', 'winona', 'willow', 'zendaya', 'zoe', 'zoë',
]);

function firstName(full: string): string {
  const cleaned = full.trim().split(/\s+/)[0]?.replace(/[^a-zA-Zà-üÀ-Ü'-]/g, '') || '';
  return cleaned.toLowerCase();
}

function femaleLeadWeight(m: Movie): number {
  const cast = m.cast || [];
  if (cast.length > 0) {
    const lead = firstName(cast[0]);
    if (FEMALE_FIRST_NAMES.has(lead)) return 1.0;
    if (/^(zendaya|rihanna|beyoncé|cher|madonna)$/i.test(cast[0].trim())) return 1.0;
    return 0.05;
  }
  const text = `${m.title} ${m.overview || ''}`.toLowerCase();
  if (
    /\b(she|her|woman|girl|mother|daughter|princess|queen)\b/.test(text) &&
    !/\b(he |him |his |man |boy |father|son|king|prince)\b/.test(text.slice(0, 120))
  ) {
    return 0.6;
  }
  return 0.2;
}

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

/**
 * Hard Akinator constraints: after Yes/No, drop movies that clearly contradict.
 * "Sometimes" / "Not sure" stay soft and do not eliminate.
 */
export function filterPoolByHistory(
  movies: Movie[],
  history: { q: WizardQuestion; answer: WizardAnswer }[]
): Movie[] {
  if (history.length === 0) return movies;
  return movies.filter((m) => {
    for (const { q, answer } of history) {
      const match = q.match(m);
      if (answer === 'yes' && match < 0.28) return false;
      if (answer === 'no' && match >= 0.65) return false;
    }
    return true;
  });
}

export function hasHardDiscoverFilters(filters: LiveDiscoverFilters): boolean {
  return Boolean(
    filters.with_companies ||
      filters.with_genres.size > 0 ||
      filters.without_genres.size > 0 ||
      filters.with_keywords.size > 0 ||
      filters.primary_release_date_gte ||
      filters.primary_release_date_lte ||
      (filters.vote_average_gte && filters.vote_average_gte > 0)
  );
}

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
          if (match >= 0.7) score += 6.0;
          else if (match >= 0.3) score += 2.0;
          else score -= 12.0; // hard contradiction
          break;
        case 'sometimes':
          if (match >= 0.2 && match <= 0.8) score += 2.5;
          else if (match > 0.8) score += 1.2;
          else score -= 0.5;
          break;
        case 'no':
          if (match <= 0.2) score += 3.0;
          else if (match <= 0.5) score += 0.5;
          else score -= 12.0; // hard contradiction
          break;
        case 'skip':
          break;
      }
    }

    return { movie: m, score };
  }).sort((a, b) => b.score - a.score);
}

// ── Free cluster brain: questions from what's actually left ───────────────────

const GENRE_TMDB_IDS: Record<string, string> = {
  Action: '28',
  Adventure: '12',
  Animation: '16',
  Comedy: '35',
  Crime: '80',
  Documentary: '99',
  Drama: '18',
  Family: '10751',
  Fantasy: '14',
  History: '36',
  Horror: '27',
  Music: '10402',
  Mystery: '9648',
  Romance: '10749',
  'Science Fiction': '878',
  Thriller: '53',
  War: '10752',
  Western: '37',
};

/** Fact questions about the movie you're thinking of — worded for Akinator-style guessing */
const GENRE_CLUSTER_COPY: Record<
  string,
  { question: string; hint: string; label: string }
> = {
  Animation: {
    label: 'animated',
    question: 'Is the movie you are thinking of animated?',
    hint: 'Hand-drawn, CGI, stop-motion, or anime',
  },
  Comedy: {
    label: 'comedies',
    question: 'Is it primarily a comedy?',
    hint: 'Made mainly to make you laugh',
  },
  Horror: {
    label: 'horror',
    question: 'Is it a horror movie?',
    hint: 'Designed to scare or unsettle',
  },
  Action: {
    label: 'action',
    question: 'Is it an action movie with fights, chases, or set pieces?',
    hint: 'Kinetic spectacle over quiet drama',
  },
  Thriller: {
    label: 'thrillers',
    question: 'Is it a suspense thriller?',
    hint: 'Tension, dread, and plot pressure',
  },
  Romance: {
    label: 'romance',
    question: 'Is a romantic relationship the emotional center of the story?',
    hint: 'Love story front and center',
  },
  'Science Fiction': {
    label: 'sci-fi',
    question: 'Is it a science fiction movie?',
    hint: 'Futuristic tech, speculative worlds, sci-fi ideas',
  },
  Fantasy: {
    label: 'fantasy',
    question: 'Does it take place in a fantasy world with magic or myths?',
    hint: 'Wizards, creatures, enchanted settings',
  },
  Crime: {
    label: 'crime',
    question: 'Does it revolve around crime, cops, or the underworld?',
    hint: 'Heists, gangsters, or criminal investigation',
  },
  Mystery: {
    label: 'mysteries',
    question: 'Is solving a mystery or whodunit the main hook?',
    hint: 'Clues, secrets, detective energy',
  },
  War: {
    label: 'war films',
    question: 'Is it set during a military war with soldiers?',
    hint: 'Combat, wartime stakes',
  },
  Family: {
    label: 'family films',
    question: 'Is it a family / all-ages movie?',
    hint: 'Aimed at kids or multi-generational audiences',
  },
  Adventure: {
    label: 'adventure',
    question: 'Is it a big adventure or quest film?',
    hint: 'Journeys, exploration, discovery',
  },
  Drama: {
    label: 'dramas',
    question: 'Is it primarily a character drama?',
    hint: 'Emotion and relationships over spectacle',
  },
  Music: {
    label: 'musicals',
    question: 'Do characters break into song, or is music central to the story?',
    hint: 'Musical numbers or music-world stories',
  },
  History: {
    label: 'historical',
    question: 'Is it based on real history or a true historical period?',
    hint: 'Period piece rooted in real events',
  },
  Western: {
    label: 'westerns',
    question: 'Is it a western — frontier, cowboys, dusty towns?',
    hint: 'Classic or modern western',
  },
  Documentary: {
    label: 'documentaries',
    question: 'Is it a documentary rather than fiction?',
    hint: 'Non-fiction',
  },
};

interface ClusterFork {
  id: string;
  balance: number; // 1 = perfect 50/50
  question: WizardQuestion;
  label: string;
}

function balanceScore(matchCount: number, total: number): number {
  if (total < 2 || matchCount < 1 || matchCount >= total) return -1;
  const ratio = matchCount / total;
  // Prefer clean mid-splits; lightly penalize extreme 15/85 forks
  if (ratio < 0.18 || ratio > 0.82) return -1;
  return 1.0 - Math.abs(ratio - 0.5) * 2;
}

function topContenderMovies(scoredPool: ScoredMovie[], limit = 36): Movie[] {
  return scoredPool.slice(0, limit).map((s) => s.movie);
}

function genrePresence(m: Movie, genre: string): boolean {
  return (m.genres || []).some((g) => g.toLowerCase() === genre.toLowerCase());
}

/**
 * Describe what the current pool "feels like" so the UI can show thinking.
 * Purely local — no model required.
 */
export function getNarrowingInsight(
  movies: Movie[],
  questionCount: number = 0
): NarrowingInsight {
  if (movies.length === 0) {
    return { hint: 'Waiting for matches…', dominantLabels: [], candidateCount: 0 };
  }

  const genreCounts = new Map<string, number>();
  let yearSum = 0;
  let yearN = 0;
  for (const m of movies) {
    for (const g of m.genres || []) {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    }
    const y = Number(m.release_date?.slice(0, 4) || 0);
    if (y > 1920) {
      yearSum += y;
      yearN += 1;
    }
  }

  const dominant = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c >= Math.max(2, movies.length * 0.22))
    .slice(0, 2)
    .map(([g]) => g);

  const avgYear = yearN ? Math.round(yearSum / yearN) : 0;
  const eraBit =
    avgYear >= 2018 ? 'recent' : avgYear >= 2000 ? '2000s–2010s' : avgYear >= 1980 ? 'late-20th-century' : avgYear > 0 ? 'older' : '';

  const labels = dominant.map((g) => GENRE_CLUSTER_COPY[g]?.label || g.toLowerCase());
  let hint: string;
  if (questionCount === 0) {
    hint = `Guessing from ${movies.length} live matches`;
  } else if (labels.length >= 2) {
    hint = `Candidates lean ${labels[0]} & ${labels[1]}${eraBit ? ` · ${eraBit}` : ''} · ${movies.length} left`;
  } else if (labels.length === 1) {
    hint = `Honing in on ${labels[0]}${eraBit ? ` · ${eraBit}` : ''} · ${movies.length} left`;
  } else {
    hint = `Still narrowing the title · ${movies.length} matches`;
  }

  return { hint, dominantLabels: labels, candidateCount: movies.length };
}

/**
 * Build yes/no forks from the actual shape of remaining candidates.
 * Questions are worded as if we’re looking at the shortlist — feels deliberate, not scripted.
 */
export function generateClusterQuestion(
  remaining: Movie[],
  askedIds: Set<string>,
  hasAnsweredEra: boolean = false
): WizardQuestion | null {
  if (remaining.length < 3) return null;

  const forks: ClusterFork[] = [];
  const n = remaining.length;

  // 1) Genre forks grounded in pool composition
  const genreCounts = new Map<string, number>();
  for (const m of remaining) {
    for (const g of m.genres || []) {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    }
  }

  for (const [genre, count] of genreCounts) {
    const copy = GENRE_CLUSTER_COPY[genre];
    if (!copy) continue;
    const id = `cluster_genre_${genre.toLowerCase().replace(/\s+/g, '_')}`;
    if (askedIds.has(id) || askedIds.has(genre.toLowerCase().replace(/\s+/g, '_'))) continue;
    // Skip if an equivalent bank question was already answered
    const bankAliases: Record<string, string[]> = {
      Animation: ['animated', 'theme_animated'],
      Comedy: ['comedy', 'theme_humor_comedy'],
      Horror: ['horror'],
      Action: ['action'],
      Thriller: ['thriller'],
      Romance: ['romance', 'theme_romance_love'],
      'Science Fiction': ['scifi', 'theme_space_futuristic'],
      Fantasy: ['fantasy_magic', 'theme_magic_spells'],
      Crime: ['crime'],
      Mystery: ['detective'],
      War: ['war'],
      Family: ['theme_family_children'],
      Music: ['musical', 'theme_singing_songs'],
    };
    if ((bankAliases[genre] || []).some((a) => askedIds.has(a))) continue;

    const bal = balanceScore(count, n);
    if (bal < 0) continue;

    const tmdbId = GENRE_TMDB_IDS[genre];
    forks.push({
      id,
      balance: bal + (genre === 'Drama' ? -0.08 : 0), // drama is too common — prefer sharper genres
      label: copy.label,
      question: {
        id,
        question: copy.question,
        hint: copy.hint,
        focusHint: `~${Math.round((count / n) * 100)}% of remaining lean ${copy.label}`,
        match: (m) => (genrePresence(m, genre) ? 1.0 : 0.0),
        onYes: tmdbId ? { with_genres: tmdbId } : undefined,
        onNo: tmdbId ? { without_genres: tmdbId } : undefined,
      },
    });
  }

  // 2) Era median fork (only if era not locked yet)
  if (!hasAnsweredEra) {
    const years = remaining
      .map((m) => Number(m.release_date?.slice(0, 4) || 0))
      .filter((y) => y > 1920)
      .sort((a, b) => a - b);
    if (years.length >= 4) {
      const median = years[Math.floor(years.length / 2)];
      const id = `cluster_era_median_${median}`;
      if (!askedIds.has(id) && ![...askedIds].some((x) => x.startsWith('era_'))) {
        const before = remaining.filter((m) => Number(m.release_date?.slice(0, 4) || 0) <= median).length;
        const bal = balanceScore(before, n);
        if (bal >= 0) {
          forks.push({
            id,
            balance: bal * 0.95,
            label: 'era',
            question: {
              id,
              question: `Was the movie released in ${median} or earlier?`,
              hint: 'Helps divide remaining candidates by year',
              focusHint: `Era split around ${median}`,
              isEra: true,
              match: (m) => (Number(m.release_date?.slice(0, 4) || 0) <= median ? 1.0 : 0.0),
              onYes: { primary_release_date_lte: `${median}-12-31` },
              onNo: { primary_release_date_gte: `${median + 1}-01-01` },
            },
          });
        }
      }
    }
  }

  // 3) Soft tone / plot axes from overview text (facts about the movie)
  const toneAxes: {
    id: string;
    label: string;
    question: string;
    hint: string;
    test: (m: Movie) => boolean;
  }[] = [
    {
      id: 'cluster_tone_dark',
      label: 'dark tone',
      question: 'Is the movie dark, intense, or heavy in tone?',
      hint: 'Bleak, brutal, tragic, or noir — not light comfort',
      test: (m) =>
        /\b(dark|bleak|brutal|revenge|murder|kill|violent|tragic|dystopia|noir)\b/i.test(
          `${m.title} ${m.overview || ''}`
        ) ||
        (m.genres || []).some((g) => ['Horror', 'Thriller', 'Crime', 'War'].includes(g)),
    },
    {
      id: 'cluster_tone_feelgood',
      label: 'feel-good',
      question: 'Is it a warm, feel-good, or uplifting movie?',
      hint: 'Heartwarming or hopeful rather than punishing',
      test: (m) =>
        /\b(heartwarming|uplifting|feel-good|friendship|family|inspiring|hope)\b/i.test(
          `${m.title} ${m.overview || ''}`
        ) ||
        (m.genres || []).some((g) => ['Comedy', 'Family', 'Animation', 'Romance'].includes(g)),
    },
    {
      id: 'cluster_plot_twist',
      label: 'mind-benders',
      question: 'Does it have big twists, puzzles, or mind-bending reality?',
      hint: 'Puzzle-box plots and reality-bending turns',
      test: (m) =>
        /\b(twist|memory|dream|simulation|identity|timeline|reality|mind|puzzle)\b/i.test(
          `${m.title} ${m.overview || ''}`
        ),
    },
    {
      id: 'cluster_based_true',
      label: 'true stories',
      question: 'Is it based on a true story or real events?',
      hint: 'Biographical or historically rooted',
      test: (m) =>
        (m.genres || []).some((g) => ['History', 'Documentary'].includes(g)) ||
        /\b(true story|based on|real events|biography)\b/i.test(`${m.title} ${m.overview || ''}`),
    },
    {
      id: 'cluster_famous',
      label: 'well-known',
      question: 'Is it a widely known / famous movie most people have heard of?',
      hint: 'Crowd-famous title vs deeper cut',
      test: (m) => (m.vote_count || 0) >= 5000,
    },
  ];

  for (const axis of toneAxes) {
    if (askedIds.has(axis.id)) continue;
    const matches = remaining.filter(axis.test).length;
    const bal = balanceScore(matches, n);
    if (bal < 0) continue;
    forks.push({
      id: axis.id,
      balance: bal * 0.92,
      label: axis.label,
      question: {
        id: axis.id,
        question: axis.question,
        hint: axis.hint,
        focusHint: `~${Math.round((matches / n) * 100)}% of remaining fit “${axis.label}”`,
        match: (m) => (axis.test(m) ? 1.0 : 0.0),
      },
    });
  }

  // 4) Runtime fork when lengths clearly diverge
  const runtimes = remaining.map((m) => m.runtime || 0).filter((r) => r > 40);
  if (runtimes.length >= 6) {
    const sorted = [...runtimes].sort((a, b) => a - b);
    const medianRt = sorted[Math.floor(sorted.length / 2)];
    const id = `cluster_runtime_${medianRt}`;
    if (!askedIds.has(id) && medianRt >= 90 && medianRt <= 160) {
      const longer = remaining.filter((m) => (m.runtime || 105) > medianRt).length;
      const bal = balanceScore(longer, n);
      if (bal >= 0.35) {
        forks.push({
          id,
          balance: bal * 0.7,
          label: 'runtime',
          question: {
            id,
            question: `Is the runtime longer than about ${medianRt} minutes?`,
            hint: 'Helps separate shorter films from longer ones',
            focusHint: `Runtime split near ${medianRt}m`,
            match: (m) => ((m.runtime || 105) > medianRt ? 1.0 : 0.0),
          },
        });
      }
    }
  }

  if (forks.length === 0) return null;
  forks.sort((a, b) => b.balance - a.balance);
  return forks[0].question;
}

export function selectNextQuestion(
  scoredPool: ScoredMovie[],
  askedIds: Set<string>,
  hasAnsweredEra: boolean = false
): WizardQuestion | null {
  const available = QUESTION_BANK.filter((q) => {
    if (askedIds.has(q.id)) return false;
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
    if (matchingCount < 1 || matchingCount >= topContenders.length) continue;

    const avg = matchingCount / topContenders.length;
    const score = 1.0 - Math.abs(avg - 0.5) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return best;
}

/** Classic 20Q priority — ask ONLY if it still splits the remaining pool. */
const ERA_QUESTION_IDS = ['era_modern', 'era_pre2010', 'era_90s', 'era_80s', 'era_classic'];
const ANIMATION_QUESTION_IDS = ['animated', 'cluster_genre_animation', 'theme_animated'];
const CORE_GENRE_IDS = [
  'comedy', 'horror', 'action', 'scifi', 'thriller', 'romance', 'crime', 'fantasy_magic',
  'war', 'detective', 'musical', 'cluster_genre_comedy', 'cluster_genre_horror',
  'cluster_genre_action', 'cluster_genre_science_fiction', 'cluster_genre_thriller',
  'cluster_genre_romance', 'cluster_genre_crime', 'cluster_genre_fantasy',
  'cluster_genre_war', 'cluster_genre_mystery', 'cluster_genre_music',
];

function pickBestSplit(
  pool: Movie[],
  candidates: WizardQuestion[],
  askedIds: Set<string>,
  minBalance = 0.15
): WizardQuestion | null {
  let best: WizardQuestion | null = null;
  let bestBal = -1;
  for (const q of candidates) {
    if (askedIds.has(q.id)) continue;
    const hits = pool.filter((m) => q.match(m) >= 0.45).length;
    const bal = balanceScore(hits, pool.length);
    if (bal < minBalance) continue;
    if (bal > bestBal) {
      bestBal = bal;
      best = q;
    }
  }
  return best;
}

function bankByIds(ids: string[]): WizardQuestion[] {
  return QUESTION_BANK.filter((q) => ids.includes(q.id));
}

/**
 * Classic electronic-20Q style picker (information gain + phased features).
 *
 * Phase order (only ask a question if it still divides remaining candidates):
 *  1. Year / era
 *  2. Animated vs live-action
 *  3. Core genre
 *  4. Female lead
 *  5. Setting/plot forks that still divide what's left
 */
export function selectSmartNextQuestion(
  scoredPool: ScoredMovie[],
  askedIds: Set<string>,
  hasAnsweredEra: boolean = false,
  questionCount: number = 0,
  history: { q: WizardQuestion; answer: WizardAnswer }[] = []
): WizardQuestion | null {
  const constrained = filterPoolByHistory(
    scoredPool.map((s) => s.movie),
    history
  );
  const constrainedScored =
    constrained.length > 0
      ? scoredPool.filter((s) => constrained.some((m) => String(m.id) === String(s.movie.id)))
      : scoredPool;

  const pool = topContenderMovies(
    constrainedScored,
    Math.min(50, Math.max(12, constrainedScored.length))
  );
  if (pool.length === 0) return null;

  const insight = getNarrowingInsight(pool, questionCount);
  const withHint = (q: WizardQuestion | null): WizardQuestion | null =>
    q ? { ...q, focusHint: q.focusHint || insight.hint } : null;

  const eraDone =
    hasAnsweredEra ||
    [...askedIds].some(
      (id) =>
        ERA_QUESTION_IDS.includes(id) ||
        id.startsWith('cluster_era_') ||
        id.startsWith('dyn_year_')
    );
  const animDone = ANIMATION_QUESTION_IDS.some((id) => askedIds.has(id));
  const genreAnswers = CORE_GENRE_IDS.filter((id) => askedIds.has(id)).length;
  const leadDone = askedIds.has('female_lead');

  // Phase 1: YEAR
  if (!eraDone) {
    const preferredOrder = ['era_modern', 'era_pre2010', 'era_90s', 'era_80s', 'era_classic'];
    for (const id of preferredOrder) {
      if (askedIds.has(id)) continue;
      const q = QUESTION_BANK.find((x) => x.id === id);
      if (!q) continue;
      const hits = pool.filter((m) => q.match(m) >= 0.45).length;
      const bal = balanceScore(hits, pool.length);
      if (bal >= 0.12) return withHint(q);
    }
  }

  // Phase 2: ANIMATED? — ask whenever ANY remaining titles are animated (even if rare).
  // Classic 20Q: a rare "yes" pins the title; a "no" cheaply drops cartoons.
  if (!animDone) {
    const animQ = QUESTION_BANK.find((x) => x.id === 'animated');
    if (animQ && !askedIds.has(animQ.id)) {
      const hits = pool.filter((m) => animQ.match(m) >= 0.45).length;
      if (hits >= 1 && hits < pool.length) return withHint(animQ);
    }
  }

  // Phase 3: CORE GENRE (up to 2)
  if (genreAnswers < 2) {
    const genreBank = bankByIds([
      'comedy', 'horror', 'action', 'scifi', 'thriller', 'romance', 'crime',
      'fantasy_magic', 'war', 'detective', 'musical',
    ]);
    const genreQ = pickBestSplit(pool, genreBank, askedIds, 0.18);
    if (genreQ) return withHint(genreQ);

    const clusterGenre = generateClusterQuestion(pool, askedIds, true);
    if (clusterGenre && clusterGenre.id.startsWith('cluster_genre_')) {
      return withHint(clusterGenre);
    }
  }

  // Phase 4: FEMALE LEAD
  if (!leadDone) {
    const leadQ = pickBestSplit(pool, bankByIds(['female_lead']), askedIds, 0.1);
    if (leadQ) return withHint(leadQ);
  }

  // Phase 5: remaining discriminative forks
  const clustered = generateClusterQuestion(pool, askedIds, true);
  if (clustered) return withHint(clustered);

  return withHint(selectNextQuestion(constrainedScored, askedIds, true));
}

/** When any question is answered, mark its conceptual twins so we never re-ask. */
export function markRelatedAskedIds(questionId: string, asked: Set<string>): void {
  asked.add(questionId);

  const CLUSTER_TO_BANK: Record<string, string[]> = {
    cluster_genre_animation: ['animated', 'theme_animated', 'disney_pixar', 'theme_disney'],
    cluster_genre_comedy: ['comedy', 'theme_humor_comedy'],
    cluster_genre_horror: ['horror'],
    cluster_genre_action: ['action'],
    cluster_genre_thriller: ['thriller'],
    cluster_genre_romance: ['romance', 'theme_romance_love'],
    cluster_genre_science_fiction: ['scifi', 'theme_space_futuristic', 'outer_space'],
    cluster_genre_fantasy: ['fantasy_magic', 'theme_magic_spells'],
    cluster_genre_crime: ['crime'],
    cluster_genre_mystery: ['detective'],
    cluster_genre_war: ['war'],
    cluster_genre_family: ['theme_family_children'],
    cluster_genre_music: ['musical', 'theme_singing_songs'],
    cluster_genre_history: ['based_on_true'],
    cluster_based_true: ['based_on_true'],
  };

  const BANK_TO_CLUSTER: Record<string, string[]> = {
    animated: ['cluster_genre_animation', 'theme_animated'],
    theme_animated: ['cluster_genre_animation', 'animated'],
    comedy: ['cluster_genre_comedy', 'theme_humor_comedy'],
    theme_humor_comedy: ['cluster_genre_comedy', 'comedy'],
    horror: ['cluster_genre_horror'],
    action: ['cluster_genre_action'],
    thriller: ['cluster_genre_thriller'],
    romance: ['cluster_genre_romance', 'theme_romance_love'],
    theme_romance_love: ['cluster_genre_romance', 'romance'],
    scifi: ['cluster_genre_science_fiction'],
    fantasy_magic: ['cluster_genre_fantasy'],
    crime: ['cluster_genre_crime'],
    detective: ['cluster_genre_mystery'],
    war: ['cluster_genre_war'],
    musical: ['cluster_genre_music', 'theme_singing_songs'],
    based_on_true: ['cluster_based_true', 'cluster_genre_history'],
  };

  (CLUSTER_TO_BANK[questionId] || []).forEach((id) => asked.add(id));
  (BANK_TO_CLUSTER[questionId] || []).forEach((id) => asked.add(id));

  if (questionId.startsWith('cluster_era_') || questionId.startsWith('era_') || questionId.startsWith('dyn_year_')) {
    asked.add('era_modern');
    asked.add('era_pre2010');
    asked.add('era_90s');
    asked.add('era_80s');
    asked.add('era_classic');
  }
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
