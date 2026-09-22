'use client';

import { Movie } from './types';
import { tmdb } from './client';

export interface WizardQuestion {
  id: string;
  question: string;
  hint?: string;
  match: (m: Movie) => boolean;
}

const hasGenre = (m: Movie, ...genres: string[]) =>
  genres.some((g) => m.genres?.some((mg) => mg.toLowerCase().includes(g.toLowerCase())));

const inEra = (m: Movie, from: number, to: number) => {
  const y = Number(m.release_date?.slice(0, 4) || 0);
  return y >= from && y <= to;
};

const overviewContains = (m: Movie, ...words: string[]) =>
  words.some((w) => (m.overview?.toLowerCase() || '').includes(w.toLowerCase()));

export const QUESTION_BANK: WizardQuestion[] = [
  {
    id: 'era_modern',
    question: 'Was it released after the year 2000?',
    hint: '2001 or later',
    match: (m) => Number(m.release_date?.slice(0, 4) || 0) > 2000,
  },
  {
    id: 'era_2010s',
    question: 'Was it released in the 2010s or more recently?',
    hint: '2010 to present',
    match: (m) => Number(m.release_date?.slice(0, 4) || 0) >= 2010,
  },
  {
    id: 'era_90s',
    question: 'Was it released in the 1990s?',
    hint: '1990–1999',
    match: (m) => inEra(m, 1990, 1999),
  },
  {
    id: 'era_80s',
    question: 'Was it released in the 1980s?',
    hint: '1980–1989',
    match: (m) => inEra(m, 1980, 1989),
  },
  {
    id: 'era_classic',
    question: 'Is it older — released before 1980?',
    hint: 'Classic cinema, pre-1980',
    match: (m) => Number(m.release_date?.slice(0, 4) || 9999) < 1980,
  },
  {
    id: 'animated',
    question: 'Is it animated — cartoon, CGI, or anime?',
    hint: 'Disney, Pixar, Ghibli, DreamWorks, anime...',
    match: (m) => hasGenre(m, 'Animation'),
  },
  {
    id: 'comedy',
    question: 'Is it mostly a comedy — does it make you laugh?',
    match: (m) => hasGenre(m, 'Comedy'),
  },
  {
    id: 'horror',
    question: 'Is it a horror or scary movie?',
    hint: 'Jump scares, monsters, psychological terror',
    match: (m) => hasGenre(m, 'Horror'),
  },
  {
    id: 'action',
    question: 'Is it an action movie — fights, chases, explosions?',
    match: (m) => hasGenre(m, 'Action'),
  },
  {
    id: 'scifi',
    question: 'Is it science fiction — robots, space, time travel, future?',
    match: (m) => hasGenre(m, 'Sci-Fi', 'Science Fiction'),
  },
  {
    id: 'fantasy',
    question: 'Does it have magic, dragons, wizards, or a fantasy world?',
    match: (m) => hasGenre(m, 'Fantasy'),
  },
  {
    id: 'thriller',
    question: 'Is it a thriller or mystery — tense, suspenseful, edge-of-seat?',
    match: (m) => hasGenre(m, 'Thriller', 'Mystery'),
  },
  {
    id: 'romance',
    question: 'Is there a strong romantic love story at its heart?',
    match: (m) => hasGenre(m, 'Romance'),
  },
  {
    id: 'drama',
    question: 'Is it primarily a serious drama — emotional, character-driven?',
    hint: 'Not mainly action, comedy, or horror',
    match: (m) =>
      hasGenre(m, 'Drama') && !hasGenre(m, 'Action', 'Comedy', 'Horror', 'Thriller'),
  },
  {
    id: 'crime',
    question: 'Does it involve crime — heists, gangsters, detectives, or cops?',
    match: (m) => hasGenre(m, 'Crime'),
  },
  {
    id: 'war',
    question: 'Is it a war movie — soldiers, battles, military conflict?',
    match: (m) =>
      hasGenre(m, 'War') ||
      overviewContains(m, 'war', 'soldier', 'battle', 'military', 'combat', 'troops'),
  },
  {
    id: 'western',
    question: 'Is it a Western — cowboys, the Wild West, frontier?',
    match: (m) => hasGenre(m, 'Western'),
  },
  {
    id: 'documentary',
    question: 'Is it a documentary about real people or real events?',
    match: (m) => hasGenre(m, 'Documentary'),
  },
  {
    id: 'english',
    question: 'Is it in English — not a foreign-language film?',
    match: (m) => {
      const lang = (m as any).original_language;
      return lang ? lang === 'en' : true;
    },
  },
  {
    id: 'family',
    question: 'Is it family-friendly — safe for kids to watch?',
    match: (m) =>
      hasGenre(m, 'Family', 'Animation') ||
      (m.vote_average >= 6.5 && hasGenre(m, 'Adventure') && !hasGenre(m, 'Horror', 'Thriller')),
  },
  {
    id: 'superhero',
    question: 'Does it feature superheroes or comic-book characters?',
    hint: 'Marvel, DC, X-Men...',
    match: (m) =>
      overviewContains(m, 'superhero', 'avenger', 'batman', 'spider-man', 'superman', 'comic') ||
      /\b(spider|batman|superman|thor|avenger|iron man|captain america|x-men|marvel|dc comics)\b/i.test(m.title || ''),
  },
  {
    id: 'based_on_true',
    question: 'Is it based on a true story or real events?',
    match: (m) =>
      overviewContains(m, 'based on', 'true story', 'inspired by', 'biography', 'real events') ||
      hasGenre(m, 'History'),
  },
  {
    id: 'space',
    question: 'Does it take place in space or on another planet?',
    match: (m) =>
      overviewContains(m, 'space', 'planet', 'galaxy', 'astronaut', 'alien', 'spacecraft', 'cosmos') ||
      /\b(star wars|star trek|guardians|interstellar|gravity|martian|apollo)\b/i.test(m.title || ''),
  },
  {
    id: 'historical',
    question: 'Is it set in a historical period — not modern day?',
    hint: 'Medieval, ancient times, Victorian era, WWII setting...',
    match: (m) =>
      hasGenre(m, 'History', 'War') ||
      overviewContains(m, 'century', 'medieval', 'ancient', 'victorian', 'world war', 'empire', 'kingdom'),
  },
  {
    id: 'post_apocalyptic',
    question: 'Is it set in a post-apocalyptic or dystopian world?',
    match: (m) =>
      overviewContains(m, 'apocalypse', 'apocalyptic', 'dystopia', 'dystopian', 'end of the world', 'survival', 'wasteland'),
  },
  {
    id: 'protagonist_kid',
    question: 'Is the main character a child or teenager?',
    match: (m) =>
      overviewContains(m, 'teenager', 'teen', 'young boy', 'young girl', 'child', 'orphan', 'coming of age') ||
      hasGenre(m, 'Family'),
  },
  {
    id: 'long_film',
    question: 'Is it a long movie — over 2.5 hours?',
    hint: 'Runtime 150+ minutes',
    match: (m) => (m.runtime || 0) >= 150,
  },
  {
    id: 'high_rated',
    question: 'Is it critically acclaimed — think Oscar-winner or 8+ on IMDb?',
    match: (m) => m.vote_average >= 7.8 && (m.vote_count || 0) >= 1000,
  },
  {
    id: 'sequel',
    question: 'Is it a sequel or part of a franchise — not the first movie?',
    match: (m) =>
      /\b(2|3|4|5|ii|iii|iv|v|part|returns|rises|reloaded|resurrection|chapter 2|begins again)\b/i.test(m.title || ''),
  },
  {
    id: 'blockbuster',
    question: 'Is it a big Hollywood blockbuster — huge budget, massive cast?',
    match: (m) => (m.vote_count || 0) >= 5000,
  },
  {
    id: 'time_travel',
    question: 'Does it involve time travel or a repeating time loop?',
    hint: 'Back to the Future, Groundhog Day, Interstellar, Tenet, Edge of Tomorrow...',
    match: (m) =>
      overviewContains(m, 'time travel', 'time loop', 'past', 'future', 'timeline', 'wormhole', 'relativity') ||
      /\b(time|future|loop|interstellar|terminator)\b/i.test(m.title || ''),
  },
  {
    id: 'zombies_vampires',
    question: 'Does it involve monsters, zombies, vampires, or infected creatures?',
    match: (m) =>
      overviewContains(m, 'zombie', 'vampire', 'creature', 'monster', 'infected', 'undead', 'werewolf', 'dracula') ||
      hasGenre(m, 'Horror'),
  },
  {
    id: 'heist',
    question: 'Is it a heist or robbery movie — planning and pulling off a big score?',
    hint: "Ocean's Eleven, Inception, The Italian Job, Heat...",
    match: (m) =>
      overviewContains(m, 'heist', 'robbery', 'bank', 'steal', 'thief', 'casino', 'vault', 'score') ||
      /\b(ocean|heist|heat|job)\b/i.test(m.title || ''),
  },
  {
    id: 'spy',
    question: 'Does it involve spies, secret agents, espionage, or assassins?',
    hint: 'James Bond, Mission Impossible, Jason Bourne, John Wick...',
    match: (m) =>
      overviewContains(m, 'spy', 'agent', 'assassin', 'cia', 'mi6', 'espionage', 'secret agent', 'hitman') ||
      /\b(bond|007|mission: impossible|bourne|wick|kingsman)\b/i.test(m.title || ''),
  },
  {
    id: 'murder_detective',
    question: 'Does it center on a detective solving a murder or tracking a serial killer?',
    hint: 'Knives Out, Se7en, Zodiac, Sherlock, Clue...',
    match: (m) =>
      overviewContains(m, 'detective', 'serial killer', 'murder', 'investigation', 'whodunit', 'clues', 'suspect') ||
      hasGenre(m, 'Mystery'),
  },
  {
    id: 'ai_robots',
    question: 'Does it feature artificial intelligence, robots, cyborgs, or virtual reality?',
    hint: 'The Matrix, Terminator, Ex Machina, Blade Runner, Her...',
    match: (m) =>
      overviewContains(m, 'robot', 'artificial intelligence', 'cyborg', 'matrix', 'virtual', 'android', 'simulation') ||
      /\b(matrix|terminator|blade runner)\b/i.test(m.title || ''),
  },
  {
    id: 'survival',
    question: 'Is it a survival story — stranded, plane crash, shipwreck, or trapped in the wild?',
    hint: 'Cast Away, The Martian, 127 Hours, The Revenant, Life of Pi...',
    match: (m) =>
      overviewContains(m, 'stranded', 'survival', 'plane crash', 'shipwreck', 'island', 'wilderness', 'alone', 'deserted', 'lost'),
  },
  {
    id: 'haunted_paranormal',
    question: 'Is there a haunted house, ghost, demon, or paranormal presence?',
    hint: 'The Conjuring, Insidious, The Shining, Paranormal Activity...',
    match: (m) =>
      overviewContains(m, 'haunted', 'ghost', 'demon', 'possession', 'curse', 'paranormal', 'spirit', 'supernatural'),
  },
  {
    id: 'sports',
    question: 'Is it about sports, an athlete, boxing, or a major championship?',
    hint: 'Rocky, Moneyball, Creed, Remember the Titans...',
    match: (m) =>
      overviewContains(m, 'boxing', 'boxer', 'coach', 'championship', 'football', 'baseball', 'basketball', 'racing', 'olympics', 'fighter'),
  },
  {
    id: 'cars_racing',
    question: 'Does it heavily feature fast cars, street racing, or high-speed driving?',
    hint: 'Fast & Furious, Baby Driver, Mad Max, Ford v Ferrari...',
    match: (m) =>
      overviewContains(m, 'racing', 'fast car', 'street race', 'driver', 'speed', 'ferrari', 'motorcycle') ||
      /\b(fast|furious|driver|drive|speed|f1)\b/i.test(m.title || ''),
  },
  {
    id: 'animals',
    question: 'Does a dog, cat, or prominent animal play a major role in the story?',
    hint: 'Marley & Me, Hachi, John Wick, Life of Pi, The Lion King...',
    match: (m) =>
      overviewContains(m, 'dog', 'puppy', 'cat', 'animal', 'wolf', 'lion', 'horse', 'bear', 'pet') ||
      hasGenre(m, 'Animation', 'Family'),
  },
];

export function selectNextQuestion(
  remaining: Movie[],
  askedIds: Set<string>
): WizardQuestion | null {
  const available = QUESTION_BANK.filter((q) => !askedIds.has(q.id));
  if (available.length === 0) return null;

  let best: WizardQuestion | null = null;
  let bestScore = -1;

  for (const q of available) {
    const yesCount = remaining.filter((m) => q.match(m)).length;
    const noCount = remaining.length - yesCount;
    // Best question = the one that creates the most even split
    const score = Math.min(yesCount, noCount) / Math.max(remaining.length, 1);
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return best;
}

export function applyAnswer(
  movies: Movie[],
  question: WizardQuestion,
  answer: 'yes' | 'no'
): Movie[] {
  return movies.filter((m) =>
    answer === 'yes' ? question.match(m) : !question.match(m)
  );
}

const CACHE_KEY = 'movielapse_wizard_catalog_v3';
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function fetchWizardCatalog(
  onProgress?: (count: number) => void
): Promise<Movie[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { movies, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(movies) && movies.length > 200) {
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
      if (!seen.has(key) && m.poster_path) {
        seen.add(key);
        all.push(m);
      }
    }
    onProgress?.(all.length);
  };

  // Batch 1: quick first load (pages 1-5 popular + 1-5 top_rated)
  const batch1 = await Promise.all([
    ...[1, 2, 3, 4, 5].map((p) => tmdb.getPopularMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
    ...[1, 2, 3, 4, 5].map((p) => tmdb.getTopRatedMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
  ]);
  batch1.forEach(add);

  // Batch 2: expand to ~600 movies
  const batch2 = await Promise.all([
    ...[6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((p) => tmdb.getPopularMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
    ...[6, 7, 8, 9, 10, 11, 12].map((p) => tmdb.getTopRatedMovies(p).then((r) => r.results).catch(() => [] as Movie[])),
  ]);
  batch2.forEach(add);

  // Batch 3: trending for recency variety
  const batch3 = await Promise.all(
    [1, 2, 3, 4, 5].map((p) => tmdb.getTrendingMovies(p).then((r) => r.results).catch(() => [] as Movie[]))
  );
  batch3.forEach(add);

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ movies: all, ts: Date.now() }));
  } catch {}

  return all;
}
