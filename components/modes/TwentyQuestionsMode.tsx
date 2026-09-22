'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Play,
  Heart,
  Bookmark,
  Tv,
  Film,
  Zap,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import Image from 'next/image';
import { Movie } from '@/lib/tmdb/types';
import { tmdb } from '@/lib/tmdb/client';
import { webllmEngine } from '@/lib/webllm/engine';

interface TwentyQuestionsModeProps {
  onPlayTrailer: (movie: Movie) => void;
  onSelectMovie?: (movie: Movie) => void;
  onLove: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatchlist: (movie: Movie) => void;
  onWatched?: (movie: Movie) => void;
  lovedMovies: Movie[];
  dislikedMovies: Movie[];
  watchlistMovies: Movie[];
  watchedMovies?: Movie[];
  tasteSummaryPrompt: string;
}

interface QuestionDef {
  id: number;
  question: string;
  subtitle: string;
  options: { label: string; tag: string; icon: string }[];
}

const QUESTION_BANK: QuestionDef[] = [
  {
    id: 1,
    question: "What kind of movie tonight?",
    subtitle: "Pick a lane — or say you don't care and we'll help you find one",
    options: [
      { label: "Comedy", tag: "comedy", icon: "😂" },
      { label: "Thriller", tag: "thriller", icon: "🕵️" },
      { label: "Horror", tag: "horror", icon: "👻" },
      { label: "Action", tag: "action", icon: "⚡" },
      { label: "Romance", tag: "romance", icon: "💕" },
      { label: "Sci-Fi / Fantasy", tag: "scifi", icon: "🚀" },
      { label: "Drama", tag: "drama", icon: "🎭" },
      { label: "Animation / Family", tag: "animation", icon: "🎨" },
      { label: "I don't care — help me pick", tag: "any", icon: "🎲" },
    ],
  },
  {
    id: 2,
    question: "What is your pacing tolerance?",
    subtitle: "How fast do you need the narrative engine to run?",
    options: [
      { label: "Non-stop kinetic rollercoaster", tag: "fast", icon: "🎢" },
      { label: "Atmospheric, slow-burn tension", tag: "slow", icon: "🕯️" },
      { label: "Punchy sub-100 minute tight script", tag: "short", icon: "⏱️" },
      { label: "Expansive, immersive 2.5hr+ epic", tag: "epic", icon: "🌌" },
      { label: "I don't care", tag: "pace_any", icon: "🎲" },
    ],
  },
  {
    id: 3,
    question: "Which era and aesthetic appeals right now?",
    subtitle: "The visual language and decade tone",
    options: [
      { label: "Modern Sleek (2018–2025)", tag: "modern", icon: "🏙️" },
      { label: "90s & 2000s Peak Genre Cinema", tag: "90s_00s", icon: "📼" },
      { label: "70s & 80s Gritty Grain & Practical FX", tag: "retro", icon: "📻" },
      { label: "Timeless Golden Age Cinema", tag: "classic", icon: "🎞️" },
      { label: "I don't care", tag: "era_any", icon: "🎲" },
    ],
  },
  {
    id: 4,
    question: "What visual atmosphere sets the mood?",
    subtitle: "Worldbuilding and environmental tone",
    options: [
      { label: "Rainy neon noir & cyberpunk cities", tag: "neon_noir", icon: "🌧️" },
      { label: "Warm sunlit coastal & summer breeze", tag: "summer", icon: "☀️" },
      { label: "Misty pine woods & isolated cabins", tag: "cabin", icon: "🌲" },
      { label: "Vast silent deep space & cosmic void", tag: "space", icon: "🚀" },
      { label: "I don't care", tag: "setting_any", icon: "🎲" },
    ],
  },
  {
    id: 5,
    question: "How complex should the narrative puzzle be?",
    subtitle: "How hard do you want your brain to work?",
    options: [
      { label: "Whiteboard puzzle with crazy twists", tag: "complex", icon: "🧩" },
      { label: "Razor-sharp, straightforward high-stakes", tag: "direct", icon: "🎯" },
      { label: "Ambiguous & poetic ending that lingers", tag: "ambiguous", icon: "💭" },
      { label: "I don't care", tag: "plot_any", icon: "🎲" },
    ],
  },
  {
    id: 6,
    question: "What is the ultimate goal of tonight's watch?",
    subtitle: "The lasting feeling when the credits roll",
    options: [
      { label: "Jaw on the floor in pure shock", tag: "shock", icon: "🤯" },
      { label: "Deeply moved & emotionally refreshed", tag: "emotional", icon: "❤️" },
      { label: "Pumped up with pure hype & adrenaline", tag: "hype", icon: "🔥" },
      { label: "Unwind completely with supreme storytelling", tag: "relax", icon: "🛋️" },
      { label: "I don't care", tag: "goal_any", icon: "🎲" },
    ],
  },
  // Additional questions for 12 Questions (Deep Mode)
  {
    id: 7,
    question: "Who is in the room with you tonight?",
    subtitle: "Tailoring crowd tone and compatibility",
    options: [
      { label: "Solo watch with total immersion", tag: "solo", icon: "🎧" },
      { label: "Date night / Partner watch", tag: "date", icon: "🥂" },
      { label: "Group of friends / Crowd pleaser", tag: "friends", icon: "🍿" },
      { label: "Family or mixed generations", tag: "family", icon: "🛋️" },
      { label: "I don't care", tag: "crowd_any", icon: "🎲" },
    ],
  },
  {
    id: 8,
    question: "What kind of protagonist do you want to follow?",
    subtitle: "The emotional anchor of the journey",
    options: [
      { label: "Complex, morally gray antihero", tag: "antihero", icon: "⚖️" },
      { label: "Reluctant everyday person in danger", tag: "reluctant", icon: "⚡" },
      { label: "Obsessive genius pushed to the brink", tag: "obsessive", icon: "🔬" },
      { label: "Charismatic ensemble / buddy dynamic", tag: "duo", icon: "🤝" },
      { label: "I don't care", tag: "hero_any", icon: "🎲" },
    ],
  },
  {
    id: 9,
    question: "What musical texture should drive the film?",
    subtitle: "The sonic pulse of the score",
    options: [
      { label: "Hypnotic analog synth / electronic pulse", tag: "synth", icon: "🎹" },
      { label: "Monumental, thundering orchestral score", tag: "orchestral", icon: "🎻" },
      { label: "Intimate acoustic, jazz & evocative silence", tag: "jazz", icon: "🎷" },
      { label: "Vintage needle-drops & grungy rock", tag: "rock", icon: "🎸" },
      { label: "I don't care", tag: "music_any", icon: "🎲" },
    ],
  },
  {
    id: 10,
    question: "Any strict dealbreakers for tonight?",
    subtitle: "We will actively filter these out",
    options: [
      { label: "No jump scares or gore", tag: "no_gore", icon: "🚫" },
      { label: "No depressing, gut-punch tragedy", tag: "no_tragedy", icon: "🚫" },
      { label: "No cheesy romance or cliché tropes", tag: "no_cliches", icon: "🚫" },
      { label: "Zero restrictions: hit me with raw cinema", tag: "raw", icon: "🔥" },
      { label: "I don't care", tag: "deal_any", icon: "🎲" },
    ],
  },
  {
    id: 11,
    question: "What emotional color palette fits best?",
    subtitle: "Tone and perspective",
    options: [
      { label: "Dark, cynical & razor-sharp satire", tag: "satire", icon: "🖤" },
      { label: "Warm, luminous & humanistic", tag: "warm", icon: "🌅" },
      { label: "Melancholic, bittersweet nostalgia", tag: "nostalgia", icon: "🍂" },
      { label: "Surreal, dreamlike & hypnotic", tag: "surreal", icon: "🔮" },
      { label: "I don't care", tag: "tone_any", icon: "🎲" },
    ],
  },
  {
    id: 12,
    question: "Directing style & cinematic camera work?",
    subtitle: "How the director tells the story",
    options: [
      { label: "Fluid long-takes & visual mastery", tag: "long_takes", icon: "🎥" },
      { label: "Kinetic cutting & stylish flair", tag: "kinetic", icon: "✂️" },
      { label: "Symmetrical, painterly tableau frames", tag: "painterly", icon: "🖼️" },
      { label: "Grounded, gritty handheld realism", tag: "gritty", icon: "📹" },
      { label: "I don't care", tag: "style_any", icon: "🎲" },
    ],
  },
];

const getProviderStyle = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes('netflix')) {
    return { bg: 'bg-red-950/90 border-red-600/70 text-red-200', text: 'Netflix', logo: 'https://image.tmdb.org/t/p/original/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg' };
  }
  if (norm.includes('prime') || norm.includes('amazon')) {
    return { bg: 'bg-sky-950/90 border-sky-500/70 text-sky-200', text: 'Prime Video', logo: 'https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' };
  }
  if (norm.includes('disney')) {
    return { bg: 'bg-blue-950/90 border-blue-500/70 text-blue-200', text: 'Disney+', logo: 'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' };
  }
  if (norm.includes('max') || norm.includes('hbo')) {
    return { bg: 'bg-purple-950/90 border-purple-500/70 text-purple-200', text: 'Max', logo: 'https://image.tmdb.org/t/p/original/aS2zvJWn9mwiCOeaaCkIh4w00dD.jpg' };
  }
  if (norm.includes('hulu')) {
    return { bg: 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200', text: 'Hulu', logo: 'https://image.tmdb.org/t/p/original/giwM8L5DaFMTEG1Qg2G2tzxsYvg.jpg' };
  }
  if (norm.includes('paramount')) {
    return { bg: 'bg-blue-900/90 border-blue-500 text-blue-100', text: 'Paramount+', logo: 'https://image.tmdb.org/t/p/original/fi83B1oztoS47xxcemFdPMhIzK.jpg' };
  }
  if (norm.includes('apple')) {
    return { bg: 'bg-neutral-800/90 border-neutral-600 text-neutral-100', text: 'Apple TV+', logo: 'https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' };
  }
  if (norm.includes('peacock')) {
    return { bg: 'bg-amber-950/90 border-amber-600/70 text-amber-200', text: 'Peacock', logo: 'https://image.tmdb.org/t/p/original/8VCV78ehT9YImCcDTRAR292278b.jpg' };
  }
  return { bg: 'bg-neutral-800 border-neutral-700 text-neutral-300', text: name, logo: undefined };
};

export const TwentyQuestionsMode: React.FC<TwentyQuestionsModeProps> = ({
  onPlayTrailer,
  onSelectMovie,
  onLove,
  onDislike,
  onWatchlist,
  onWatched,
  lovedMovies,
  dislikedMovies,
  watchlistMovies,
  watchedMovies = [],
  tasteSummaryPrompt,
}) => {
  // 6 Questions (Quick Pick) default, 12 Questions (Deep) optional
  const [totalQuestions, setTotalQuestions] = useState<6 | 12>(6);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, { label: string; tag: string }>>({});
  const [customInput, setCustomInput] = useState<string>('');
  const [isConsultingAI, setIsConsultingAI] = useState<boolean>(false);
  const [results, setResults] = useState<Movie[]>([]);
  const [aiVerdict, setAiVerdict] = useState<string>('');

  // Live Instant Recommendations state
  const [moviePool, setMoviePool] = useState<Movie[]>([]);
  const [liveRecommendations, setLiveRecommendations] = useState<Movie[]>([]);
  const [mobileTab, setMobileTab] = useState<'question' | 'live_picks'>('question');

  // Initialize seed catalog and enrich with streaming providers
  useEffect(() => {
    let isMounted = true;
    const initPool = async () => {
      const seeds = tmdb.getSeedMovies();
      const enriched = await tmdb.enrichMoviesWithProviders(seeds, 10);
      if (isMounted) {
        setMoviePool(enriched);
        setLiveRecommendations(enriched.slice(0, 4));
      }
    };
    initPool();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentQ = QUESTION_BANK[currentStep % QUESTION_BANK.length];
  const answeredCount = Object.keys(answers).length;

  // Real-time live recommendation matcher as user answers each question
  const computeLiveMatches = (currentAnswers: Record<number, { label: string; tag: string }>) => {
    if (moviePool.length === 0) return;

    const tags = Object.values(currentAnswers).map((a) => a.tag);
    if (tags.length === 0) {
      setLiveRecommendations(moviePool.slice(0, 4));
      return;
    }

    // Score movies based on chosen criteria
    const scored = moviePool.map((movie) => {
      let score = movie.vote_average * 1.5;
      const movieText = `${movie.title} ${movie.genres.join(' ')} ${movie.overview} ${movie.tagline || ''}`.toLowerCase();
      const releaseYear = parseInt(movie.release_date?.slice(0, 4) || '2015', 10);
      const runtime = movie.runtime || 120;

      // 1. Genre matching (Q1) — "any" / I don't care skips genre lock
      if (tags.includes('comedy') && movie.genres.includes('Comedy')) score += 10;
      if (tags.includes('thriller') && movie.genres.some((g) => ['Thriller', 'Crime', 'Mystery'].includes(g))) score += 10;
      if (tags.includes('horror') && movie.genres.includes('Horror')) score += 12;
      if (tags.includes('action') && movie.genres.some((g) => ['Action', 'Adventure'].includes(g))) score += 10;
      if (tags.includes('romance') && movie.genres.includes('Romance')) score += 10;
      if (
        tags.includes('scifi') &&
        movie.genres.some((g) => ['Science Fiction', 'Fantasy'].includes(g))
      ) {
        score += 10;
      }
      if (tags.includes('drama') && movie.genres.includes('Drama')) score += 8;
      if (
        tags.includes('animation') &&
        movie.genres.some((g) => ['Animation', 'Family'].includes(g))
      ) {
        score += 10;
      }
      if (tags.includes('any')) {
        // Help me pick: lean on highly rated crowd-pleasers, not a genre
        score += Math.min(movie.vote_average, 8.5) * 0.35;
        if (movie.vote_count && movie.vote_count > 2000) score += 2;
      }

      // Legacy vibe tags (if any older sessions)
      if (tags.includes('mind_bending')) {
        if (movie.genres.some((g) => ['Science Fiction', 'Mystery', 'Thriller'].includes(g))) score += 7;
        if (/reality|mind|simulation|dream|dimension|space|memory|time/i.test(movieText)) score += 5;
      }
      if (tags.includes('uplifting')) {
        if (movie.genres.some((g) => ['Animation', 'Family', 'Drama'].includes(g))) score += 6;
      }

      // 2. Pacing matching
      if (tags.includes('fast') && runtime <= 135) score += 4;
      if (tags.includes('slow') && (movie.genres.includes('Drama') || movie.genres.includes('Mystery'))) score += 4;
      if (tags.includes('short') && runtime <= 105) score += 6;
      if (tags.includes('epic') && runtime >= 145) score += 6;

      // 3. Era matching
      if (tags.includes('modern') && releaseYear >= 2018) score += 5;
      if (tags.includes('90s_00s') && releaseYear >= 1990 && releaseYear <= 2010) score += 6;
      if (tags.includes('retro') && releaseYear >= 1970 && releaseYear <= 1989) score += 6;
      if (tags.includes('classic') && releaseYear < 1970) score += 6;

      // 4. Setting matching
      if (tags.includes('space') && (movie.genres.includes('Science Fiction') || /space|wormhole|star|galaxy/i.test(movieText))) score += 6;
      if (tags.includes('neon_noir') && (movieText.includes('blade') || movieText.includes('future') || movieText.includes('cyber'))) score += 6;
      if (tags.includes('cabin') && /cabin|forest|woods|isolated|wilderness/i.test(movieText)) score += 5;
      if (tags.includes('summer') && /summer|beach|coast|sun|vacation/i.test(movieText)) score += 5;

      // 5. Narrative goal
      if (tags.includes('shock') && (movieText.includes('twist') || movie.genres.includes('Mystery') || movie.vote_average >= 8.2)) score += 4;
      if (tags.includes('hype') && movie.genres.includes('Action')) score += 5;
      if (tags.includes('emotional') && movie.genres.includes('Drama')) score += 4;
      if (tags.includes('relax') && !movie.genres.includes('Horror')) score += 3;

      // Dealbreakers
      if (tags.includes('no_gore') && movie.genres.includes('Horror')) score -= 12;
      if (tags.includes('no_tragedy') && /tragic|death|suicide|grief/i.test(movieText)) score -= 6;
      if (tags.includes('no_cliches') && movie.genres.includes('Romance')) score -= 4;

      return { movie, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topPicks = scored.slice(0, 4).map((item) => {
      const genreTag = tags.find((t) =>
        ['comedy', 'thriller', 'horror', 'action', 'romance', 'scifi', 'drama', 'animation', 'any'].includes(t)
      );
      let reason = 'Strong match for tonight';
      if (genreTag === 'comedy') reason = 'Comedy pick for tonight';
      else if (genreTag === 'thriller') reason = 'Thriller / tension match';
      else if (genreTag === 'horror') reason = 'Horror match';
      else if (genreTag === 'action') reason = 'Action / adrenaline match';
      else if (genreTag === 'romance') reason = 'Romance match';
      else if (genreTag === 'scifi') reason = 'Sci-fi / fantasy match';
      else if (genreTag === 'drama') reason = 'Drama match';
      else if (genreTag === 'animation') reason = 'Animation / family match';
      else if (genreTag === 'any') reason = 'Open-ended pick while we learn your mood';

      return {
        ...item.movie,
        ai_match_reason: reason,
      };
    });

    setLiveRecommendations(topPicks);

    // Enrich top 4 in the background so streaming providers are updated
    tmdb.enrichMoviesWithProviders(topPicks, 4).then((fresh) => {
      setLiveRecommendations(fresh);
    });
  };

  const handleSelectOption = (option: { label: string; tag: string }) => {
    const nextAnswers = { ...answers, [currentStep]: option };
    setAnswers(nextAnswers);
    setCustomInput('');

    // Update live recommendations immediately
    computeLiveMatches(nextAnswers);

    if (currentStep < totalQuestions - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finalizeRecommendations(nextAnswers);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    handleSelectOption({ label: customInput.trim(), tag: 'custom' });
  };

  const finalizeRecommendations = async (finalAnswers: Record<number, { label: string; tag: string }>) => {
    setIsConsultingAI(true);

    const answersSummary = Object.entries(finalAnswers)
      .map(([step, ans]) => `Q${Number(step) + 1}: ${ans.label}`)
      .join('\n');

    const promptMessage = `The user completed the Movie Sommelier with these preferences:
${answersSummary}

Recommend the top 3 tailored movie picks. For each pick, give the exact title, release year, and a compelling 1-sentence reason why it fits this mood.`;

    try {
      const response = await webllmEngine.chat(
        [{ role: 'user', content: promptMessage }],
        tasteSummaryPrompt
      );

      const enrichedResults = await tmdb.enrichMoviesWithProviders(response.recommendedMovies, 3);
      setAiVerdict(response.text);
      setResults(enrichedResults.length > 0 ? enrichedResults : liveRecommendations.slice(0, 3));

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff'],
      });
    } catch (err) {
      console.error('Error generating questionnaire recommendation', err);
      setResults(liveRecommendations.slice(0, 3));
    } finally {
      setIsConsultingAI(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setResults([]);
    setAiVerdict('');
    setLiveRecommendations(moviePool.slice(0, 4));
    setMobileTab('question');
  };

  // If showing final AI synthesis results
  if (results.length > 0 || isConsultingAI) {
    return (
      <div className="w-full max-w-6xl mx-auto h-[calc(100vh-7.5rem)] max-h-[calc(100vh-7.5rem)] overflow-y-auto px-4 py-3 flex flex-col justify-between animate-fade-in">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Cinephile Sommelier Verdict
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Tonight&apos;s Tailored Cinematic Matches
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Drawn from your questionnaire choices with verified streaming availability.
          </p>

          <button
            onClick={handleReset}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start New Sommelier
          </button>
        </div>

        {isConsultingAI ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-base font-bold text-white">Synthesizing your cinematic taste...</p>
            <p className="text-xs text-neutral-400 mt-1">Cross-referencing tropes, pacing, and regional streaming</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Movie Cards Showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-16rem)] p-1">
              {results.map((movie) => {
                const streamP = movie.streaming_providers?.find((p) => p.type === 'stream') || movie.streaming_providers?.[0];
                const pStyle = streamP ? getProviderStyle(streamP.name) : null;

                return (
                  <div
                    key={movie.id}
                    onClick={() => onSelectMovie ? onSelectMovie(movie) : onPlayTrailer(movie)}
                    className="group relative bg-neutral-900/90 border border-neutral-800/90 hover:border-amber-400/80 hover:bg-neutral-850/90 rounded-2xl p-3 flex flex-col justify-between shadow-xl transition-all duration-200 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer"
                  >
                    <div className="flex gap-3">
                      {/* Compact Poster */}
                      <div className="relative w-24 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-neutral-950">
                        {movie.poster_path ? (
                          <Image
                            src={movie.poster_path}
                            alt={movie.title}
                            fill
                            sizes="120px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized={movie.poster_path.startsWith('http')}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayTrailer(movie);
                          }}
                          aria-label={`Watch ${movie.title} trailer`}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="p-2 bg-amber-500 text-black rounded-full shadow-lg">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </span>
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-amber-400 font-bold text-xs">
                              ★ {movie.vote_average ? movie.vote_average.toFixed(1) : '8.0'}
                            </span>
                            <span className="text-neutral-500 text-xs">•</span>
                            <span className="text-neutral-400 text-xs">
                              {movie.release_date?.slice(0, 4)}
                            </span>
                          </div>

                          <h3
                            title={`View details for ${movie.title}`}
                            className="text-sm font-bold text-white leading-tight truncate group-hover:text-amber-400 transition-colors text-left"
                          >
                            {movie.title}
                          </h3>

                          {/* Streaming Badge */}
                          {pStyle && streamP && streamP.name !== 'Available Online' && (
                            <a
                              href={streamP.watch_url || `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+${encodeURIComponent(pStyle.text)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`Watch "${movie.title}" on ${pStyle.text}`}
                              className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold shadow-sm backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 ${pStyle.bg}`}
                            >
                              {pStyle.logo ? (
                                <img src={pStyle.logo} alt="" className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                              ) : (
                                <Tv className="w-3 h-3 text-amber-400" />
                              )}
                              <span>Watch on {pStyle.text} ↗</span>
                            </a>
                          )}

                          {movie.ai_match_reason && (
                            <p className="mt-2 text-[11px] text-amber-300/90 leading-snug line-clamp-2 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                              ⚡ {movie.ai_match_reason}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between"
                        >
                          {onWatched ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onWatched(movie);
                              }}
                              title={watchedMovies.some((m) => String(m.id) === String(movie.id)) ? "Seen (click to unmark)" : "Mark as seen"}
                              className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md transition-all active:scale-95 ${
                                watchedMovies.some((m) => String(m.id) === String(movie.id))
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white border border-neutral-700/60'
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>{watchedMovies.some((m) => String(m.id) === String(movie.id)) ? 'Seen' : 'Seen it'}</span>
                            </button>
                          ) : (
                            <div />
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onLove(movie);
                              }}
                              title="Love"
                              className={`p-1.5 rounded-lg transition active:scale-95 ${
                                lovedMovies.some((m) => String(m.id) === String(movie.id))
                                  ? 'text-red-500 bg-red-500/10'
                                  : 'text-neutral-400 hover:text-white'
                              }`}
                            >
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onWatchlist(movie);
                              }}
                              title="Watchlist"
                              className={`p-1.5 rounded-lg transition active:scale-95 ${
                                watchlistMovies.some((m) => String(m.id) === String(movie.id))
                                  ? 'text-amber-400 bg-amber-500/10'
                                  : 'text-neutral-400 hover:text-white'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Notes Drawer */}
            {aiVerdict && (
              <div className="mt-3 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-neutral-300 text-xs leading-relaxed shadow-lg max-h-24 overflow-y-auto">
                <span className="font-bold text-amber-400 mr-2 uppercase tracking-wide">
                  ✨ Sommelier Commentary:
                </span>
                {aiVerdict}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-7.5rem)] max-h-[calc(100vh-7.5rem)] overflow-hidden flex flex-col justify-between p-3 sm:p-4">
      {/* Universal Top Header Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800/80 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 6 Qs vs 12 Qs Mode Toggle */}
          <div className="inline-flex p-0.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
            <button
              onClick={() => {
                setTotalQuestions(6);
                if (currentStep >= 6) setCurrentStep(5);
              }}
              className={`px-3 py-1 rounded-lg transition ${
                totalQuestions === 6
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              6 Questions (Quick)
            </button>
            <button
              onClick={() => setTotalQuestions(12)}
              className={`px-3 py-1 rounded-lg transition ${
                totalQuestions === 12
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              12 Questions (Deep)
            </button>
          </div>

          <span className="hidden sm:inline-flex text-xs font-medium text-neutral-400">
            Step {currentStep + 1} of {totalQuestions}
          </span>
        </div>

        {/* Mobile View Switcher Tabs */}
        <div className="flex sm:hidden items-center gap-1 p-0.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
          <button
            onClick={() => setMobileTab('question')}
            className={`px-2.5 py-1 rounded-lg transition ${
              mobileTab === 'question'
                ? 'bg-neutral-800 text-white font-bold'
                : 'text-neutral-400'
            }`}
          >
            Question ({currentStep + 1}/{totalQuestions})
          </button>
          <button
            onClick={() => setMobileTab('live_picks')}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
              mobileTab === 'live_picks'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-amber-400'
            }`}
          >
            <Zap className="w-3 h-3 fill-current" /> Live Picks ({liveRecommendations.length})
          </button>
        </div>

        {/* Right side AI Reveal action */}
        <div className="flex items-center gap-2">
          {answeredCount >= 2 && (
            <button
              onClick={() => finalizeRecommendations(answers)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Finalize with AI</span>
              <span className="sm:hidden">AI Pick</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Indicator */}
      <div className="w-full h-1 bg-neutral-800/80 shrink-0 my-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all duration-300 ease-out"
          style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Main Split Layout: Left Question Cockpit (5 cols), Right Live Recommendations (7 cols) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Question Cockpit */}
        <div
          className={`md:col-span-5 h-full flex flex-col justify-between bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 sm:p-5 shadow-xl overflow-hidden ${
            mobileTab === 'live_picks' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Question Header */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Film className="w-3 h-3" /> Question #{currentStep + 1}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {answeredCount} answered
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
              {currentQ.question}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {currentQ.subtitle}
            </p>
          </div>

          {/* Compact Options Grid - Fits comfortably without vertical scrolling */}
          <div className="flex-1 my-3 flex flex-col justify-center gap-1.5 sm:gap-2 min-h-0 overflow-y-auto pr-0.5">
            {currentQ.options.map((opt) => {
              const isSelected = answers[currentStep]?.tag === opt.tag;
              const isDontCare = opt.tag === 'any' || opt.tag.endsWith('_any');
              return (
                <button
                  key={opt.tag}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left py-2.5 px-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between group ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : isDontCare
                        ? 'bg-neutral-950/40 border-dashed border-neutral-600 text-neutral-300 hover:border-amber-500/50 hover:text-white'
                        : 'bg-neutral-950/60 border-neutral-800/90 text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base sm:text-lg shrink-0">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition shrink-0 ml-2 ${
                      isSelected
                        ? 'bg-amber-500 text-black'
                        : 'bg-neutral-800 text-neutral-500 group-hover:bg-neutral-700 group-hover:text-neutral-300'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : <ArrowRight className="w-3 h-3" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Input & Navigation Footer */}
          <div className="shrink-0 pt-2 border-t border-neutral-800/80">
            {/* Inline Custom Input */}
            <form onSubmit={handleCustomSubmit} className="flex gap-2 mb-2.5">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Or custom: e.g. dry British comedy..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!customInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 font-bold text-xs transition shrink-0"
              >
                Go
              </button>
            </form>

            {/* Step navigation controls */}
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <button
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              {/* On mobile, quick button to peek at live matches */}
              <button
                onClick={() => setMobileTab('live_picks')}
                className="md:hidden text-amber-400 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <Zap className="w-3 h-3 fill-current" /> See Matches ({liveRecommendations.length})
              </button>

              <button
                onClick={() => setCurrentStep((prev) => Math.min(totalQuestions - 1, prev + 1))}
                disabled={currentStep >= totalQuestions - 1}
                className="hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 font-medium"
              >
                Skip <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Instant Recommendations */}
        <div
          className={`md:col-span-7 h-full flex flex-col bg-neutral-900/60 border border-neutral-800/90 rounded-2xl p-3 sm:p-4 shadow-xl overflow-hidden ${
            mobileTab === 'question' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header of Live Recommendations */}
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Instant Live Matches</span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  (Updates with every answer)
                </span>
              </h3>
            </div>

            {/* Mobile return to question button */}
            <button
              onClick={() => setMobileTab('question')}
              className="md:hidden text-xs text-amber-400 font-bold px-2 py-1 bg-neutral-800 rounded-lg"
            >
              ← Back to Q#{currentStep + 1}
            </button>
          </div>

          {/* Live Movie Cards Grid (2x2 on desktop, compact scroll on mobile) */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0 overflow-y-auto pt-3 pr-1">
            {liveRecommendations.map((movie) => {
              const streamP = movie.streaming_providers?.find((p) => p.type === 'stream') || movie.streaming_providers?.[0];
              const pStyle = streamP ? getProviderStyle(streamP.name) : null;

              return (
                <div
                  key={movie.id}
                  onClick={() => onSelectMovie ? onSelectMovie(movie) : onPlayTrailer(movie)}
                  className="group relative bg-neutral-950/80 border border-neutral-800/90 hover:border-amber-400/80 hover:bg-neutral-900/90 rounded-xl p-2.5 flex flex-col justify-between shadow-lg transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer"
                >
                  <div className="flex gap-2.5">
                    {/* Poster Thumbnail */}
                    <div className="relative w-20 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-neutral-900">
                      {movie.poster_path ? (
                        <Image
                          src={movie.poster_path}
                          alt={movie.title}
                          fill
                          sizes="100px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized={movie.poster_path.startsWith('http')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrailer(movie);
                        }}
                        aria-label={`Play trailer for ${movie.title}`}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="p-2 bg-amber-500 text-black rounded-full shadow-md">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </span>
                      </button>
                    </div>

                    {/* Movie Info & Streaming Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
                          <span className="text-amber-400 font-bold">
                            ★ {movie.vote_average ? movie.vote_average.toFixed(1) : '8.0'}
                          </span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-400">{movie.release_date?.slice(0, 4)}</span>
                        </div>

                        <h4
                          title={`View details for ${movie.title}`}
                          className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors text-left"
                        >
                          {movie.title}
                        </h4>

                        {/* High-visibility Streaming Badge */}
                        {pStyle && streamP && streamP.name !== 'Available Online' ? (
                          <a
                            href={streamP.watch_url || `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+${encodeURIComponent(pStyle.text)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`Watch "${movie.title}" on ${pStyle.text}`}
                            className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold shadow-sm hover:scale-105 transition ${pStyle.bg}`}
                          >
                            {pStyle.logo ? (
                              <img src={pStyle.logo} alt="" className="w-3 h-3 rounded object-contain shrink-0" />
                            ) : (
                              <Tv className="w-2.5 h-2.5" />
                            )}
                            <span className="truncate max-w-[85px]">{pStyle.text}</span>
                          </a>
                        ) : (
                          <a
                            href={`https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+online`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-amber-400 bg-neutral-900 py-0.5 px-1.5 rounded border border-neutral-800 transition"
                          >
                            <Tv className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span className="truncate">Stream online ↗</span>
                          </a>
                        )}

                        {movie.ai_match_reason && (
                          <div className="mt-1 text-[10px] text-amber-300 font-medium truncate">
                            ⚡ {movie.ai_match_reason}
                          </div>
                        )}
                      </div>

                      {/* Quick Card Action Buttons */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 pt-1.5 border-t border-neutral-800/80 flex items-center justify-between"
                      >
                        {onWatched ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWatched(movie);
                            }}
                            title={watchedMovies.some((m) => String(m.id) === String(movie.id)) ? "Seen (click to unmark)" : "Mark as seen"}
                            className={`text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all active:scale-95 ${
                              watchedMovies.some((m) => String(m.id) === String(movie.id))
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700/60'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            <span>{watchedMovies.some((m) => String(m.id) === String(movie.id)) ? 'Seen' : 'Seen it'}</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onLove(movie);
                            }}
                            title="Love this movie"
                            className={`p-1 rounded-md transition active:scale-95 ${
                              lovedMovies.some((m) => String(m.id) === String(movie.id))
                                ? 'text-red-500 bg-red-500/10'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Heart className="w-3 h-3 fill-current" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWatchlist(movie);
                            }}
                            title="Add to Watchlist"
                            className={`p-1 rounded-md transition active:scale-95 ${
                              watchlistMovies.some((m) => String(m.id) === String(movie.id))
                                ? 'text-amber-400 bg-amber-500/10'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Bookmark className="w-3 h-3 fill-current" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
