'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, ArrowRight, RotateCcw, Check, MessageSquare } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';
import { MovieCard } from '../movie/MovieCard';
import { webllmEngine } from '@/lib/webllm/engine';

interface TwentyQuestionsModeProps {
  onPlayTrailer: (movie: Movie) => void;
  onLove: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatchlist: (movie: Movie) => void;
  lovedMovies: Movie[];
  dislikedMovies: Movie[];
  watchlistMovies: Movie[];
  tasteSummaryPrompt: string;
}

interface QuestionDef {
  id: number;
  question: string;
  subtitle: string;
  options: string[];
}

const QUESTION_BANK: QuestionDef[] = [
  {
    id: 1,
    question: "What kind of energy or emotional vibe are you craving tonight?",
    subtitle: "Select the dominant impulse of your evening",
    options: [
      "🧠 Mind-Bending & Existential",
      "⚡ High-Octane Adrenaline",
      "☕ Cozy, Melancholy & Thoughtful",
      "🕵️ Dark, Tense & Gripping Mystery",
      "😂 Laugh-Out-Loud Escapism",
    ],
  },
  {
    id: 2,
    question: "What is your pacing tolerance?",
    subtitle: "How fast do you need the plot engine to rev?",
    options: [
      "🎢 Non-stop kinetic rollercoaster",
      "🕯️ Atmospheric, slow-burn masterpiece",
      "⏱️ Punchy sub-100 minute tight script",
      "🌌 Expansive, immersive 2.5hr+ epic",
    ],
  },
  {
    id: 3,
    question: "Which era and aesthetic appeals to you right now?",
    subtitle: "The visual language and decade tone",
    options: [
      "🏙️ Modern Sleek (2018–2025)",
      "📼 90s & 2000s Peak Genre Gold",
      "📻 70s & 80s Gritty Grain & Practical Effects",
      "🎞️ Golden Age Classic Cinema",
    ],
  },
  {
    id: 4,
    question: "Who is in the room with you tonight?",
    subtitle: "Tailoring tone and crowd compatibility",
    options: [
      "🎧 Flying solo with total immersion",
      "🥂 Date night / Partner cuddle watch",
      "🍿 Group of friends / Crowd pleaser",
      "🛋️ Family or mixed generation watch",
    ],
  },
  {
    id: 5,
    question: "What visual atmosphere sets the right mood?",
    subtitle: "Lighting, worldbuilding, and setting",
    options: [
      "🌧️ Rainy neon noir & dystopian cities",
      "☀️ Warm sunlit coastal / idyllic summer",
      "🌲 Misty pine forests & isolated cabins",
      "🚀 Vast silent space & cosmic emptiness",
    ],
  },
  {
    id: 6,
    question: "Any strict dealbreakers for tonight?",
    subtitle: "We will actively filter these out",
    options: [
      "🚫 No jump scares or extreme gore",
      "🚫 No depressing, gut-punch tragedy endings",
      "🚫 No cheesy romance or cliché tropes",
      "🔥 Zero restrictions: hit me with raw cinema",
    ],
  },
  {
    id: 7,
    question: "How complex should the narrative puzzle be?",
    subtitle: "How hard do you want your brain to work?",
    options: [
      "🧩 Mind-knotting puzzle with twists that require a whiteboard",
      "🎯 Straightforward, razor-sharp execution with high stakes",
      "💭 Ambiguous ending that lingers for days",
    ],
  },
  {
    id: 8,
    question: "What kind of lead character do you want to follow?",
    subtitle: "The emotional anchor of the film",
    options: [
      "⚖️ Complex, morally gray antihero",
      "⚡ Reluctant everyday person in extraordinary danger",
      "🔬 Obsessive genius pushed to the brink",
      "🤝 Dynamic charismatic ensemble / buddy duo",
    ],
  },
  {
    id: 9,
    question: "What musical texture should drive the film?",
    subtitle: "The sonic pulse",
    options: [
      "🎹 Hypnotic analog synth / electronic pulse",
      "🎻 Thundering, monumental orchestral score",
      "🎷 Intimate jazz, acoustic & atmospheric silence",
      "🎸 Grungy guitar & curated vintage needle-drops",
    ],
  },
  {
    id: 10,
    question: "Final gut check: What's the main goal of tonight's watch?",
    subtitle: "The lasting feeling when the credits roll",
    options: [
      "🤯 To have my jaw on the floor in pure shock",
      "❤️ To feel deeply moved and emotionally refreshed",
      "🔥 To feel pumped up with pure hype and energy",
      "🛋️ To unwind completely with world-class storytelling",
    ],
  },
];

export const TwentyQuestionsMode: React.FC<TwentyQuestionsModeProps> = ({
  onPlayTrailer,
  onLove,
  onDislike,
  onWatchlist,
  lovedMovies,
  dislikedMovies,
  watchlistMovies,
  tasteSummaryPrompt,
}) => {
  const [totalQuestions, setTotalQuestions] = useState<10 | 20>(10);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [customInput, setCustomInput] = useState<string>('');
  const [isConsultingAI, setIsConsultingAI] = useState<boolean>(false);
  const [results, setResults] = useState<Movie[]>([]);
  const [aiVerdict, setAiVerdict] = useState<string>('');

  const currentQ = QUESTION_BANK[currentStep % QUESTION_BANK.length];
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentStep]: option }));
    setCustomInput('');

    if (currentStep < totalQuestions - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finalizeRecommendations({ ...answers, [currentStep]: option });
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    handleSelectOption(customInput.trim());
  };

  const finalizeRecommendations = async (finalAnswers: Record<number, string>) => {
    setIsConsultingAI(true);

    const answersSummary = Object.entries(finalAnswers)
      .map(([step, ans]) => `Q${Number(step) + 1}: ${ans}`)
      .join('\n');

    const promptMessage = `The user just finished the Cinephile Questionnaire with these exact preferences:
${answersSummary}

Recommend the top 3 tailored movie picks that perfectly fulfill this mood. For each pick, provide the exact title, release year, and a compelling 1-sentence reason why it fits this specific mood.`;

    try {
      const response = await webllmEngine.chat(
        [{ role: 'user', content: promptMessage }],
        tasteSummaryPrompt
      );

      setAiVerdict(response.text);
      setResults(response.recommendedMovies);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff'],
      });
    } catch (err) {
      console.error('Error generating 20 questions recommendation', err);
    } finally {
      setIsConsultingAI(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setResults([]);
    setAiVerdict('');
  };

  // If showing results
  if (results.length > 0 || isConsultingAI) {
    return (
      <div className="w-full max-w-5xl mx-auto py-6 px-4 animate-fade-in">
        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
            <Sparkles className="w-4 h-4" /> Cinephile Sommelier Verdict
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tonight&apos;s Perfect Cinematic Matches
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-xl mx-auto">
            Drawn from your questionnaire choices and personalized taste profile.
          </p>

          <button
            onClick={handleReset}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start New Questionnaire
          </button>
        </div>

        {isConsultingAI ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg font-bold text-white">Synthesizing your cinematic taste...</p>
            <p className="text-xs text-neutral-400 mt-1">Cross-referencing tropes, pacing, and mood</p>
          </div>
        ) : (
          <div>
            {/* Movie Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPlayTrailer={onPlayTrailer}
                  onLove={onLove}
                  onDislike={onDislike}
                  onWatchlist={onWatchlist}
                  isLoved={lovedMovies.some((m) => String(m.id) === String(movie.id))}
                  isDisliked={dislikedMovies.some((m) => String(m.id) === String(movie.id))}
                  isWatchlist={watchlistMovies.some((m) => String(m.id) === String(movie.id))}
                />
              ))}
            </div>

            {/* AI Notes Drawer */}
            {aiVerdict && (
              <div className="mt-8 p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-neutral-300 text-sm whitespace-pre-line leading-relaxed shadow-lg">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Sommelier Commentary
                </div>
                {aiVerdict}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4 animate-fade-in">
      {/* Mode selection toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
          <button
            onClick={() => setTotalQuestions(10)}
            className={`px-3 py-1.5 rounded-lg transition ${
              totalQuestions === 10
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            10 Questions
          </button>
          <button
            onClick={() => setTotalQuestions(20)}
            className={`px-3 py-1.5 rounded-lg transition ${
              totalQuestions === 20
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            20 Questions (Deep)
          </button>
        </div>

        {answeredCount >= 3 && (
          <button
            onClick={() => finalizeRecommendations(answers)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Reveal Picks Now ({answeredCount} answered)
          </button>
        )}
      </div>

      {/* Progress counter */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5 font-medium">
          <span>
            Question {currentStep + 1} of {totalQuestions}
          </span>
          <span>{Math.round(((currentStep + 1) / totalQuestions) * 100)}% Complete</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Question Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
          Deductive Question #{currentStep + 1}
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 leading-snug">
          {currentQ.question}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1 mb-6">
          {currentQ.subtitle}
        </p>

        {/* Options List */}
        <div className="space-y-2.5">
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentStep] === opt;
            return (
              <button
                key={opt}
                onClick={() => handleSelectOption(opt)}
                className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/80 hover:text-white'
                }`}
              >
                <span>{opt}</span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-amber-500 text-black'
                      : 'bg-neutral-800 text-neutral-500 group-hover:bg-neutral-700 group-hover:text-neutral-300'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom write-in form */}
        <form onSubmit={handleCustomSubmit} className="mt-5 pt-4 border-t border-neutral-800/80">
          <label className="block text-xs text-neutral-400 mb-1.5">
            Or describe your own custom answer:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. Something with dry British humor and cold weather..."
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 font-bold text-xs transition"
            >
              Submit
            </button>
          </div>
        </form>

        {/* Navigation Step buttons */}
        <div className="mt-6 flex items-center justify-between text-xs text-neutral-400 pt-3 border-t border-neutral-800/50">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            ← Previous
          </button>
          <span className="font-mono text-neutral-500">
            {answeredCount} of {totalQuestions} answered
          </span>
          <button
            onClick={() => setCurrentStep((prev) => Math.min(totalQuestions - 1, prev + 1))}
            disabled={currentStep >= totalQuestions - 1}
            className="hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            Skip →
          </button>
        </div>
      </div>
    </div>
  );
};
