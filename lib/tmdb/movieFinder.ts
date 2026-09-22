'use client';

import { Movie } from './types';
import { tmdb, DEFAULT_TMDB_API_KEY } from './client';

export type WizardAnswer = 'yes' | 'sometimes' | 'no' | 'skip';

export interface DiscoverParamUpdate {
  with_genres?: string;
  without_genres?: string;
  with_keywords?: string;
  without_keywords?: string;
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
  // Fuzzy match degree (0.0 to 1.0)
  match: (m: Movie) => number;
  // Live TMDB Discover filter updates
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
    vote_count_gte: 20, // quality filter: keeps all real movies, eliminates 1-vote noise
  };
}

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

// ── Question Bank with Live TMDB Discover Mappings ───────────────────────────

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
    onYes: { primary_release_date_gte: '2001-01-01' },
    onNo: { primary_release_date_lte: '2000-12-31' },
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
    onYes: { primary_release_date_gte: '2010-01-01' },
    onNo: { primary_release_date_lte: '2009-12-31' },
  },
  {
    id: 'era_90s',
    question: 'Was it released in the 1990s?',
    hint: '1990–1999',
    match: (m) => eraWeight(m, 1990, 1999),
    onYes: { primary_release_date_gte: '1990-01-01', primary_release_date_lte: '1999-12-31' },
  },
  {
    id: 'era_80s',
    question: 'Was it released in the 1980s?',
    hint: '1980–1989',
    match: (m) => eraWeight(m, 1980, 1989),
    onYes: { primary_release_date_gte: '1980-01-01', primary_release_date_lte: '1989-12-31' },
  },
  {
    id: 'era_classic',
    question: 'Is it an older classic — released before 1980?',
    hint: 'Pre-1980 cinema',
    match: (m) => {
      const y = Number(m.release_date?.slice(0, 4) || 9999);
      if (y < 1980) return 1.0;
      if (y <= 1983) return 0.4;
      return 0;
    },
    onYes: { primary_release_date_lte: '1979-12-31' },
    onNo: { primary_release_date_gte: '1980-01-01' },
  },

  // Genres
  {
    id: 'animated',
    question: 'Is it animated — cartoon, CGI, or anime?',
    hint: 'Disney, Pixar, Ghibli, DreamWorks, anime...',
    match: (m) => genreWeight(m, 'Animation'),
    onYes: { with_genres: '16' },
    onNo: { without_genres: '16' },
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
    onYes: { with_genres: '35' },
    onNo: { without_genres: '35' },
  },
  {
    id: 'action',
    question: 'Is it an action movie with fights, chases, or shootouts?',
    match: (m) => {
      const gw = genreWeight(m, 'Action', 'Adventure');
      if (gw > 0) return gw;
      return textMatch(m, 'fight', 'chase', 'gun', 'battle', 'warrior', 'martial arts');
    },
    onYes: { with_genres: '28' },
    onNo: { without_genres: '28' },
  },
  {
    id: 'scifi',
    question: 'Is it science fiction — space, robots, time travel, or future tech?',
    match: (m) => {
      const gw = genreWeight(m, 'Sci-Fi', 'Science Fiction');
      if (gw > 0) return gw;
      return textMatch(m, 'future', 'space', 'robot', 'alien', 'cyber', 'technology');
    },
    onYes: { with_genres: '878' },
    onNo: { without_genres: '878' },
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
    onYes: { with_genres: '27' },
    onNo: { without_genres: '27' },
  },
  {
    id: 'thriller',
    question: 'Is it a suspenseful thriller or mystery?',
    hint: 'Tense, edge-of-your-seat, unexpected twists',
    match: (m) => genreWeight(m, 'Thriller', 'Mystery'),
    onYes: { with_genres: '53' },
    onNo: { without_genres: '53' },
  },
  {
    id: 'romance',
    question: 'Is there a prominent love story or romantic relationship?',
    match: (m) => {
      const gw = genreWeight(m, 'Romance');
      if (gw > 0) return gw;
      return textMatch(m, 'love', 'relationship', 'romance', 'couple', 'marriage');
    },
    onYes: { with_genres: '10749' },
    onNo: { without_genres: '10749' },
  },
  {
    id: 'drama',
    question: 'Is it primarily a serious drama — emotional, character-driven?',
    match: (m) => {
      const isD = genreWeight(m, 'Drama');
      const isAct = genreWeight(m, 'Action', 'Horror');
      if (isD > 0 && isAct === 0) return 1.0;
      if (isD > 0) return 0.5;
      return 0;
    },
    onYes: { with_genres: '18' },
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
    onYes: { with_genres: '14' },
    onNo: { without_genres: '14' },
  },
  {
    id: 'crime',
    question: 'Does it involve crime — heists, gangsters, the mob, or detectives?',
    match: (m) => genreWeight(m, 'Crime'),
    onYes: { with_genres: '80' },
  },
  {
    id: 'war',
    question: 'Is it set during a war with soldiers and military battles?',
    match: (m) => {
      const gw = genreWeight(m, 'War');
      if (gw > 0) return gw;
      return textMatch(m, 'world war', 'soldier', 'army', 'combat', 'troops', 'military');
    },
    onYes: { with_genres: '10752' },
    onNo: { without_genres: '10752' },
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
    onYes: { with_keywords: '9715|18073' },
  },
  {
    id: 'based_on_true',
    question: 'Is it based on a true story or real historical events?',
    match: (m) => {
      const gw = genreWeight(m, 'History', 'Biography');
      if (gw > 0) return 1.0;
      return textMatch(m, 'true story', 'based on', 'biography', 'real life', 'historic');
    },
    onYes: { with_genres: '36' },
  },

  // Keywords and specific plot devices
  {
    id: 'time_travel',
    question: 'Does it involve time travel or a repeating time loop?',
    hint: 'Back to the Future, Groundhog Day, Interstellar, Edge of Tomorrow...',
    match: (m) => textMatch(m, 'time travel', 'time loop', 'timeline', 'wormhole', 'relativity', 'loop'),
    onYes: { with_keywords: '4379' },
  },
  {
    id: 'heist',
    question: 'Is it a heist, robbery, or bank job movie?',
    hint: "Ocean's Eleven, Inception, Heat, Baby Driver, The Italian Job...",
    match: (m) => textMatch(m, 'heist', 'robbery', 'bank', 'steal', 'thief', 'vault', 'con artist'),
    onYes: { with_keywords: '10051|9717' },
  },
  {
    id: 'spy',
    question: 'Does it feature spies, secret agents, or professional assassins?',
    hint: 'James Bond, Jason Bourne, Mission Impossible, John Wick, Kingsman...',
    match: (m) => textMatch(m, 'spy', 'agent', 'assassin', 'hitman', 'cia', 'mi6', 'espionage'),
    onYes: { with_keywords: '470|9713' },
  },
  {
    id: 'space',
    question: 'Does it take place in space, on spaceships, or another planet?',
    hint: 'Star Wars, Interstellar, Alien, Dune, Gravity, The Martian...',
    match: (m) => textMatch(m, 'space', 'spaceship', 'planet', 'galaxy', 'astronaut', 'orbit', 'alien'),
    onYes: { with_keywords: '9882|3801' },
  },
  {
    id: 'ai_robots',
    question: 'Does it involve artificial intelligence, robots, cyborgs, or virtual reality?',
    hint: 'The Matrix, Terminator, Ex Machina, Blade Runner, I Robot...',
    match: (m) => textMatch(m, 'robot', 'artificial intelligence', 'cyborg', 'matrix', 'android', 'simulation'),
    onYes: { with_keywords: '310|14544' },
  },
  {
    id: 'survival',
    question: 'Is it a survival story — stranded on an island, plane crash, or trapped in the wild?',
    hint: 'Cast Away, The Martian, 127 Hours, The Revenant, Life of Pi...',
    match: (m) => textMatch(m, 'stranded', 'survival', 'plane crash', 'shipwreck', 'deserted', 'lost in', 'trapped'),
    onYes: { with_keywords: '10085|10705' },
  },
  {
    id: 'detective',
    question: 'Does it follow a detective or investigator solving a murder mystery?',
    hint: 'Knives Out, Se7en, Zodiac, Sherlock Holmes, Shutter Island...',
    match: (m) => textMatch(m, 'detective', 'murder', 'investigat', 'serial killer', 'whodunit', 'clue'),
    onYes: { with_genres: '9648' },
  },
  {
    id: 'monsters_zombies',
    question: 'Does it feature zombies, vampires, werewolves, or monsters?',
    hint: 'World War Z, 28 Days Later, Dracula, Twilight, Godzilla...',
    match: (m) => textMatch(m, 'zombie', 'vampire', 'monster', 'creature', 'undead', 'infection', 'godzilla'),
    onYes: { with_keywords: '12377|3133' },
  },
  {
    id: 'cars_racing',
    question: 'Are fast cars, street racing, or driving a major focus?',
    hint: 'Fast and Furious, Baby Driver, Mad Max, Ford v Ferrari...',
    match: (m) => textMatch(m, 'racing', 'fast car', 'street race', 'driver', 'ferrari', 'chase car'),
    onYes: { with_keywords: '830|10087' },
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
    onYes: { with_genres: '10751' },
  },
  {
    id: 'blockbuster',
    question: 'Was it a massive, world-famous Hollywood blockbuster?',
    hint: 'Huge box office release; heavily advertised',
    match: (m) => {
      const votes = m.vote_count || 0;
      if (votes >= 10000) return 1.0;
      if (votes >= 5000) return 0.6;
      return 0.2;
    },
    onYes: { vote_count_gte: 4000 },
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
    onYes: { vote_average_gte: 7.8, vote_count_gte: 300 },
  },
];

// ── Live TMDb Discover Fetcher (Queries all 1,000,000+ Movies) ────────────────

export async function queryLiveTMDbDiscover(
  filters: LiveDiscoverFilters,
  pages: number = 2
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
  if (filters.vote_count_gte) {
    query += `&vote_count.gte=${filters.vote_count_gte}`;
  }
  if (filters.vote_average_gte) {
    query += `&vote_average.gte=${filters.vote_average_gte}`;
  }
  if (filters.with_original_language) {
    query += `&with_original_language=${filters.with_original_language}`;
  }

  const pageList = Array.from({ length: pages }, (_, i) => i + 1);
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

// ── Live TMDb Keyword / Actor Clue Search ─────────────────────────────────────

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
      (mData.results || []).slice(0, 15).forEach((m: any) => {
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
            .slice(0, 15);
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

// ── Probabilistic Scoring Algorithm Across Live Pool ─────────────────────────

export function scoreAllMovies(
  movies: Movie[],
  history: { q: WizardQuestion; answer: WizardAnswer }[],
  clueMatches: Set<string> = new Set()
): ScoredMovie[] {
  return movies.map((m) => {
    let score = Math.min((m.vote_count || 0) / 4000, 2.5); // mild prior for known films

    if (clueMatches.has(String(m.id))) {
      score += 15.0; // massive boost if user provided a matching clue
    }

    for (const { q, answer } of history) {
      const match = q.match(m);
      switch (answer) {
        case 'yes':
          if (match >= 0.7) score += 3.2;
          else if (match >= 0.3) score += 1.5;
          else score -= 1.4;
          break;
        case 'sometimes':
          if (match >= 0.2 && match <= 0.8) score += 2.5; // sweet spot for hybrid/partial
          else if (match > 0.8) score += 1.2;
          else score -= 0.3;
          break;
        case 'no':
          if (match <= 0.2) score += 2.2;
          else if (match <= 0.5) score += 0.5;
          else score -= 2.4;
          break;
        case 'skip':
          break;
      }
    }

    return { movie: m, score };
  }).sort((a, b) => b.score - a.score);
}

// ── Adaptive Question Selector ───────────────────────────────────────────────

export function selectNextQuestion(
  scoredPool: ScoredMovie[],
  askedIds: Set<string>
): WizardQuestion | null {
  const available = QUESTION_BANK.filter((q) => !askedIds.has(q.id));
  if (available.length === 0) return null;

  // Split top 25 current leaders
  const topContenders = scoredPool.slice(0, 25).map((s) => s.movie);
  if (topContenders.length === 0) return available[0];

  let best: WizardQuestion | null = null;
  let bestScore = -1;

  for (const q of available) {
    let sumMatch = 0;
    for (const m of topContenders) {
      sumMatch += q.match(m);
    }
    const avg = sumMatch / topContenders.length;
    // Closest to 0.5 is ideal 50/50 split
    const score = 1.0 - Math.abs(avg - 0.5) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return best || available[0];
}
