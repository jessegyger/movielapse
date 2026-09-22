/**
 * Offline Akinator simulator: pick a target from SEED_MOVIES, answer honestly,
 * measure how fast it rises to #1.
 *
 *   npx --yes tsx scripts/simulate20q.ts
 */
import { SEED_MOVIES } from '../lib/tmdb/seedData';
import {
  scoreAllMovies,
  selectSmartNextQuestion,
  filterPoolByHistory,
  markRelatedAskedIds,
  MUTUAL_EXCLUSIONS,
  EQUIVALENT_QUESTIONS,
  WizardAnswer,
  WizardQuestion,
  generateDynamicQuestion,
} from '../lib/tmdb/movieFinder';
import { Movie } from '../lib/tmdb/types';

function answerForTarget(q: WizardQuestion, target: Movie): WizardAnswer {
  const m = q.match(target);
  if (m >= 0.55) return 'yes';
  if (m <= 0.25) return 'no';
  return 'sometimes';
}

function applyImplications(q: WizardQuestion, answer: WizardAnswer, asked: Set<string>) {
  markRelatedAskedIds(q.id, asked);
  if (answer === 'yes' && MUTUAL_EXCLUSIONS[q.id]) {
    MUTUAL_EXCLUSIONS[q.id].forEach((id) => asked.add(id));
  }
  if (EQUIVALENT_QUESTIONS[q.id]) {
    EQUIVALENT_QUESTIONS[q.id].forEach((id) => asked.add(id));
  }
}

function simulate(targetTitle: string, maxQ = 12) {
  const target = SEED_MOVIES.find((m) => m.title === targetTitle);
  if (!target) {
    console.log(`MISS: no seed movie titled "${targetTitle}"`);
    return { title: targetTitle, foundAt: -1, rankAtEnd: -1, questions: [] as string[] };
  }

  let history: { q: WizardQuestion; answer: WizardAnswer }[] = [];
  const asked = new Set<string>();
  let eraAnswered = false;
  const questions: string[] = [];

  let foundAt = -1;
  let rankAtEnd = -1;

  for (let i = 0; i < maxQ; i++) {
    const pool = filterPoolByHistory(SEED_MOVIES, history);
    const scored = scoreAllMovies(pool.length ? pool : SEED_MOVIES, history);
    rankAtEnd = scored.findIndex((s) => String(s.movie.id) === String(target.id)) + 1;

    if (rankAtEnd === 1 && foundAt < 0) foundAt = i; // before asking — already #1
    if (rankAtEnd === 1 && i > 0) {
      // confirmed after previous answer
      if (foundAt < 0) foundAt = i;
    }

    let q = selectSmartNextQuestion(scored, asked, eraAnswered, i, history);
    if (!q) {
      q = generateDynamicQuestion(
        scored.slice(0, 15).map((s) => s.movie),
        asked,
        []
      );
    }
    if (!q) break;

    const answer = answerForTarget(q, target);
    questions.push(`Q${i + 1}: ${q.question} → ${answer.toUpperCase()} (rank now #${rankAtEnd || '?'})`);

    applyImplications(q, answer, asked);
    if (q.isEra) eraAnswered = true;
    history = [...history, { q, answer }];

    const afterPool = filterPoolByHistory(SEED_MOVIES, history);
    const afterScored = scoreAllMovies(afterPool.length ? afterPool : SEED_MOVIES, history);
    const afterRank = afterScored.findIndex((s) => String(s.movie.id) === String(target.id)) + 1;
    if (afterRank === 1 && foundAt < 0) foundAt = i + 1;
    rankAtEnd = afterRank;

    if (afterRank === 1 && afterScored.length <= 3) break;
  }

  return { title: targetTitle, foundAt, rankAtEnd, questions, remaining: filterPoolByHistory(SEED_MOVIES, history).length };
}

const TARGETS = [
  'Interstellar',
  'Titanic',
  'Get Out',
  'La La Land',
  'The Godfather',
  'Spider-Man: Across the Spider-Verse',
  'Parasite',
  'The Matrix',
  'Arrival',
  'Whiplash',
];

console.log('=== 20Q Simulator (seed catalog) ===\n');
const results = TARGETS.map((t) => simulate(t));

for (const r of results) {
  console.log(`\n▶ ${r.title}`);
  console.log(`  reached #1 at question: ${r.foundAt > 0 ? r.foundAt : 'never'} | final rank: #${r.rankAtEnd} | pool left: ${r.remaining}`);
  r.questions.forEach((line) => console.log(`  ${line}`));
}

const hits = results.filter((r) => r.foundAt > 0 && r.foundAt <= 8);
const top3 = results.filter((r) => r.rankAtEnd > 0 && r.rankAtEnd <= 3);
console.log('\n=== SUMMARY ===');
console.log(`#1 within 8 Qs: ${hits.length}/${results.length}`);
console.log(`Top-3 by end: ${top3.length}/${results.length}`);
console.log(
  `Avg Qs to #1 (when found): ${
    hits.length
      ? (hits.reduce((s, r) => s + r.foundAt, 0) / hits.length).toFixed(1)
      : 'n/a'
  }`
);
