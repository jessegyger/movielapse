'use client';

import { Movie } from './types';
import { tmdb } from './client';

export type WizardAnswer = 'yes' | 'sometimes' | 'no' | 'skip';

export interface WizardQuestion {
  id: string;
  question: string;
  hint?: string;
  // Returns match degree from 0.0 (definite no) to 1.0 (definite yes)
  match: (m: Movie) => number;
}

export interface ScoredMovie {
  movie: Movie;
  score: number;
}

// ── Match helpers returning values between 0.0 and 1.0 ───────────────────────

const genreWeight = (m: Movie, ...genres: string[]): number => {
  if (!m.genres || m.genres.length === 0) return 0;
  const matchIdx = m.genres.findIndex((mg) =>
    genres.some((g) => mg.toLowerCase().includes(g.toLowerCase()))
  );
  if (matchIdx === 0) return 1.0; // primary genre
  if (matchIdx > 0) return 0.7;  // secondary genre
  return 0;
};

const eraWeight = (m: Movie, from: number, to: number): number => {
  const y = Number(m.release_date?.slice(0, 4) || 0);
  if (y >= from && y <= to) return 1.0;
  // Soft boundary: if within 2 years of the era, still give 0.4 so misremembering by 1 year doesn't break it
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

// ── Extensive Question Bank with fuzzy match scoring ──────────────────────────

export const QUESTION_BANK: WizardQuestion[] = [
  // Eras
  {
    id: 'era_modern',
    question: 'Was it released after the year 2000?',
    hint: '2001 or later',
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 0);
      if (y > 2000) return 1.0;
      if (y >= 1998) return 0.4;
      return 0;
    },
  },
  {
    id: 'era_2010s',
    question: 'Was it released in the 2010s or 2020s?',
    hint: '2010 to present',
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 0);
      if (y >= 2010) return 1.0;
      if (y >= 2007) return 0.4;
      return 0;
    },
  },
  {
    id: 'era_90s',
    question: 'Was it released in the 1990s?',
    hint: '1990–1999',
    match: (m) => eraWeight(m, 1990, 1999),
  },
  {
    id: 'era_80s',
    question: 'Was it released in the 1980s?',
    hint: '1980–1989',
    match: (m) => eraWeight(m, 1980, 1989),
  },
  {
    id: 'era_classic',
    question: 'Is it older — released before 1980?',
    hint: 'Classic cinema, pre-1980',
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 9999);
      if (y < 1980) return 1.0;
      if (y <= 1983) return 0.4;
      return 0;
    },
  },

  // Dominant Genre & Tone
  {
    id: 'animated',
    question: 'Is it animated — cartoon, CGI, or anime?',
    hint: 'Disney, Pixar, Ghibli, DreamWorks, anime...',
    match: (m) => genreWeight(m, 'Animation'),
  },
  {
    id: 'comedy',
    question: 'Is it funny — does it make you laugh?',
    hint: 'Comedy, dark comedy, comedy-adventure',
    match: (m) => {
      const gw = genreWeight(m, 'Comedy');
      if (gw > 0) return gw;
      return textMatch(m, 'hilarious', 'funny', 'humorous', 'comedy');
    },
  },
  {
    id: 'action',
    question: 'Is it an action movie with fights, chases, or shootouts?',
    match: (m) => {
      const gw = genreWeight(m, 'Action', 'Adventure');
      if (gw > 0) return gw;
      return textMatch(m, 'fight', 'chase', 'gun', 'battle', 'warrior', 'martial arts');
    },
  },
  {
    id: 'scifi',
    question: 'Is it science fiction — space, robots, time travel, or future tech?',
    match: (m) => {
      const gw = genreWeight(m, 'Sci-Fi', 'Science Fiction');
      if (gw > 0) return gw;
      return textMatch(m, 'future', 'space', 'robot', 'alien', 'cyber', 'technology');
    },
  },
  {
    id: 'horror',
    question: 'Is it a horror or scary movie?',
    hint: 'Jump scares, monsters, psychological dread',
    match: (m) => {
      const gw = genreWeight(m, 'Horror');
      if (gw > 0) return gw;
      return textMatch(m, 'haunt', 'killer', 'scary', 'demon', 'terror');
    },
  },
  {
    id: 'thriller',
    question: 'Is it a suspenseful thriller or mystery?',
    hint: 'Tense, edge-of-your-seat, unexpected twists',
    match: (m) => genreWeight(m, 'Thriller', 'Mystery'),
  },
  {
    id: 'romance',
    question: 'Is there a prominent love story or romantic relationship?',
    match: (m) => {
      const gw = genreWeight(m, 'Romance');
      if (gw > 0) return gw;
      return textMatch(m, 'love', 'relationship', 'romance', 'couple', 'marriage');
    },
  },
  {
    id: 'drama',
    question: 'Is it a serious drama — emotional, character-driven?',
    match: (m) => {
      const isD = genreWeight(m, 'Drama');
      const isAct = genreWeight(m, 'Action', 'Horror');
      if (isD > 0 && isAct === 0) return 1.0;
      if (isD > 0) return 0.5;
      return 0;
    },
  },
  {
    id: 'fantasy',
    question: 'Does it involve magic, mythical creatures, or a fantasy world?',
    hint: 'Lord of the Rings, Harry Potter, wizards, mythical quests...',
    match: (m) => {
      const gw = genreWeight(m, 'Fantasy');
      if (gw > 0) return gw;
      return textMatch(m, 'magic', 'wizard', 'witch', 'dragon', 'spell', 'kingdom');
    },
  },
  {
    id: 'crime',
    question: 'Does it involve crime — heists, gangsters, the mob, or detectives?',
    match: (m) => genreWeight(m, 'Crime'),
  },
  {
    id: 'war',
    question: 'Is it set during a war with soldiers and military battles?',
    match: (m) => {
      const gw = genreWeight(m, 'War');
      if (gw > 0) return gw;
      return textMatch(m, 'world war', 'soldier', 'army', 'combat', 'troops', 'military');
    },
  },
  {
    id: 'superhero',
    question: 'Does it feature superheroes or comic book characters?',
    hint: 'Marvel, DC, X-Men, Avengers, Batman, Spider-Man...',
    match: (m) => {
      const t = `${m.title || ''} ${m.overview || ''}`.toLowerCase();
      if (/\b(spider-man|batman|superman|iron man|avengers|marvel|dc comics|thor|captain america|x-men|joker)\b/.test(t)) return 1.0;
      return textMatch(m, 'superhero', 'super power', 'mutant');
    },
  },
  {
    id: 'based_on_true',
    question: 'Is it based on a true story or real historical events?',
    match: (m) => {
      const gw = genreWeight(m, 'History', 'Biography');
      if (gw > 0) return 1.0;
      return textMatch(m, 'true story', 'based on', 'biography', 'real life', 'historic');
    },
  },

  // Specific high-signal plot devices
  {
    id: 'time_travel',
    question: 'Does it involve time travel or a repeating time loop?',
    hint: 'Back to the Future, Groundhog Day, Interstellar, Edge of Tomorrow...',
    match: (m) => textMatch(m, 'time travel', 'time loop', 'timeline', 'wormhole', 'relativity', 'loop'),
  },
  {
    id: 'heist',
    question: 'Is it a heist, robbery, or bank job movie?',
    hint: "Ocean's Eleven, Inception, Heat, Baby Driver, The Italian Job...",
    match: (m) => textMatch(m, 'heist', 'robbery', 'bank', 'steal', 'thief', 'vault', 'con artist'),
  },
  {
    id: 'spy',
    question: 'Does it feature spies, secret agents, or professional assassins?',
    hint: 'James Bond, Jason Bourne, Mission Impossible, John Wick, Kingsman...',
    match: (m) => textMatch(m, 'spy', 'agent', 'assassin', 'hitman', 'cia', 'mi6', 'espionage'),
  },
  {
    id: 'space',
    question: 'Does it take place in space, on spaceships, or another planet?',
    hint: 'Star Wars, Interstellar, Alien, Dune, Gravity, The Martian...',
    match: (m) => textMatch(m, 'space', 'spaceship', 'planet', 'galaxy', 'astronaut', 'orbit', 'alien'),
  },
  {
    id: 'ai_robots',
    question: 'Does it involve artificial intelligence, robots, cyborgs, or virtual reality?',
    hint: 'The Matrix, Terminator, Ex Machina, Blade Runner, I Robot...',
    match: (m) => textMatch(m, 'robot', 'artificial intelligence', 'cyborg', 'matrix', 'android', 'simulation'),
  },
  {
    id: 'survival',
    question: 'Is it a survival story — stranded on an island, plane crash, or trapped in the wild?',
    hint: 'Cast Away, The Martian, 127 Hours, The Revenant, Life of Pi...',
    match: (m) => textMatch(m, 'stranded', 'survival', 'plane crash', 'shipwreck', 'deserted', 'lost in', 'trapped'),
  },
  {
    id: 'detective',
    question: 'Does it follow a detective or investigator solving a murder mystery?',
    hint: 'Knives Out, Se7en, Zodiac, Sherlock Holmes, Shutter Island...',
    match: (m) => textMatch(m, 'detective', 'murder', 'investigat', 'serial killer', 'whodunit', 'clue'),
  },
  {
    id: 'monsters_zombies',
    question: 'Does it feature zombies, vampires, werewolves, or monsters?',
    hint: 'World War Z, 28 Days Later, Dracula, Twilight, Godzilla...',
    match: (m) => textMatch(m, 'zombie', 'vampire', 'monster', 'creature', 'undead', 'infection', 'godzilla'),
  },
  {
    id: 'cars_racing',
    question: 'Are fast cars, street racing, or driving a major focus?',
    hint: 'Fast and Furious, Baby Driver, Mad Max, Ford v Ferrari...',
    match: (m) => textMatch(m, 'racing', 'fast car', 'street race', 'driver', 'ferrari', 'chase car'),
  },
  {
    id: 'family_kids',
    question: 'Is it family-friendly, or is the main character a kid/teenager?',
    hint: 'Harry Potter, Home Alone, E.T., Goonies, Stranger Things vibes...',
    match: (m) => {
      const gw = genreWeight(m, 'Family', 'Animation');
      if (gw > 0) return 1.0;
      return textMatch(m, 'young boy', 'young girl', 'teenager', 'child', 'orphan', 'school', 'kids');
    },
  },
  {
    id: 'blockbuster',
    question: 'Was it a massive, world-famous Hollywood blockbuster?',
    hint: 'Everyone has heard of it; huge box office hit',
    match: (m) => {
      const votes = m.vote_count || 0;
      if (votes >= 10000) return 1.0;
      if (votes >= 5000) return 0.6;
      return 0.2;
    },
  },
  {
    id: 'award_winner',
    question: 'Is it critically acclaimed — high ratings, awards, or Oscar-worthy?',
    hint: 'Godfather, Parasite, Shawshank, Pulp Fiction...',
    match: (m) => {
      const r = m.vote_average || 0;
      if (r >= 8.1) return 1.0;
      if (r >= 7.6) return 0.6;
      return 0.2;
    },
  },
  {
    id: 'long_epic',
    question: 'Is it a long epic movie — around or over 2.5 hours?',
    hint: 'Lord of the Rings, Oppenheimer, Titanic, Avatar, Avengers...',
    match: (m) => {
      const runtime = m.runtime || 0;
      if (runtime >= 150) return 1.0;
      if (runtime >= 135) return 0.5;
      return 0.1;
    },
  },
];

// ── Probabilistic Scoring Algorithm ──────────────────────────────────────────

/**
 * Updates scores across all movies according to the user's answer.
 * Uses soft Bayesian-style weights so an accidental "No" or subjective "Sometimes"
 * never destroys the true movie.
 */
export function updateScores(
  pool: ScoredMovie[],
  question: WizardQuestion,
  answer: WizardAnswer
): ScoredMovie[] {
  return pool.map(({ movie, score }) => {
    const match = question.match(movie);
    let delta = 0;

    switch (answer) {
      case 'yes':
        if (match >= 0.7) {
          delta = 3.0;
        } else if (match >= 0.3) {
          delta = 1.4;
        } else {
          // Mild penalty for non-matching — NEVER eliminate completely
          delta = -1.2;
        }
        break;

      case 'sometimes':
        // Rewarding borderline/hybrid or partial matches
        if (match >= 0.2 && match <= 0.8) {
          delta = 2.4; // Sweet spot for "sometimes"
        } else if (match > 0.8) {
          delta = 1.2;
        } else {
          // Barely penalty for non-matching on 'sometimes'
          delta = -0.3;
        }
        break;

      case 'no':
        if (match <= 0.2) {
          delta = 2.2;
        } else if (match <= 0.5) {
          delta = 0.5;
        } else {
          // Stronger penalty if it clearly matches what user said NO to
          delta = -2.2;
        }
        break;

      case 'skip':
        delta = 0; // Neutral
        break;
    }

    return {
      movie,
      score: score + delta,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Selects the next question that best splits the CURRENT TOP CANDIDATES.
 * Rather than splitting the whole dead tail, we focus on discriminating the top 30!
 */
export function selectNextQuestion(
  scoredPool: ScoredMovie[],
  askedIds: Set<string>
): WizardQuestion | null {
  const available = QUESTION_BANK.filter((q) => !askedIds.has(q.id));
  if (available.length === 0) return null;

  // Focus discrimination on the top 35 current contenders
  const topContenders = scoredPool.slice(0, 35).map((s) => s.movie);
  if (topContenders.length === 0) return available[0];

  let best: WizardQuestion | null = null;
  let bestScore = -1;

  for (const q of available) {
    let sumMatch = 0;
    for (const m of topContenders) {
      sumMatch += q.match(m);
    }
    const avg = sumMatch / topContenders.length;
    // Score peaks when avg is 0.5 (ideal 50/50 split among the top candidates)
    const score = 1.0 - Math.abs(avg - 0.5) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return best || available[0];
}

// ── Broad Catalog Fetcher (Cached in sessionStorage) ──────────────────────────

const CACHE_KEY = 'movielapse_wizard_catalog_v4';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function fetchWizardCatalog(
  onProgress?: (count: number) => void
): Promise<Movie[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { movies, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(movies) && movies.length >= 300) {
        onProgress?.(movies.length);
        return movies;
      }
    }
  } catch {}

  const seen = new Set<string>();
  const all: Movie[] = [];

  const add = (movies: Movie[]) => {
    for (const m of movies) {
      const key = String(m.id);
      if (!seen.has(key) && m.poster_path && m.title) {
        seen.add(key);
        all.push(m);
      }
    }
    onProgress?.(all.length);
  };

  // Fetch 20 pages of popular + 15 pages of top rated + 10 pages of trending
  // (~900 high-profile movies across all eras and genres)
  const popularPages = Array.from({ length: 20 }, (_, i) => i + 1);
  const topRatedPages = Array.from({ length: 15 }, (_, i) => i + 1);
  const trendingPages = Array.from({ length: 10 }, (_, i) => i + 1);

  // Batch 1: Quick burst
  const batch1 = await Promise.all([
    ...popularPages.slice(0, 8).map((p) => tmdb.getPopularMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
    ...topRatedPages.slice(0, 8).map((p) => tmdb.getTopRatedMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
  ]);
  batch1.forEach(add);

  // Batch 2: Deep catalogue
  const batch2 = await Promise.all([
    ...popularPages.slice(8, 20).map((p) => tmdb.getPopularMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
    ...topRatedPages.slice(8, 15).map((p) => tmdb.getTopRatedMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
    ...trendingPages.map((p) => tmdb.getTrendingMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
  ]);
  batch2.forEach(add);

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ movies: all, ts: Date.now() }));
  } catch {}

  return all;
}
