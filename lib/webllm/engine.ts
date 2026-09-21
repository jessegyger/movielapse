'use client';

import { WebLLMProgress, Movie } from '../tmdb/types';
import { tmdb } from '../tmdb/client';
import { CINEPHILE_SYSTEM_PROMPT } from './prompts';

export const DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export const HIGHER_QUALITY_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  recommendedMovies?: Movie[];
}

export class WebLLMEngine {
  private engine: any = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private usingFallback: boolean = false;
  private lastError: string | null = null;
  private progressCallback: ((p: WebLLMProgress) => void) | null = null;
  private currentModel: string = DEFAULT_MODEL;
  private geminiApiKey: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const reason = String(event.reason || '');
        if (reason.includes('Cache') || reason.includes('network error') || reason.includes('Failed to execute')) {
          console.warn('Caught browser Cache / network rejection, activating Instant Cinephile Engine:', reason);
          event.preventDefault();
          this.enableFallback('Detected network / cache restriction. Switched to Instant Cinephile Engine.');
        }
      });
    }
  }

  setGeminiApiKey(key: string) {
    this.geminiApiKey = key.trim();
  }

  setProgressCallback(cb: (p: WebLLMProgress) => void) {
    this.progressCallback = cb;
  }

  isModelReady(): boolean {
    return this.isReady;
  }

  isFallbackMode(): boolean {
    return this.usingFallback;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  // Initialize WebLLM in browser
  async initEngine(modelId: string = DEFAULT_MODEL): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.isReady && this.currentModel === modelId) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.currentModel = modelId;
    this.lastError = null;

    // Check if WebGPU is available
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (!hasWebGPU) {
      this.enableFallback('Instant Cinephile Engine Active (Zero Wait).');
      return false;
    }

    try {
      this.notifyProgress(0.05, 'Checking WebGPU compatibility...');

      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        this.enableFallback('Older GPU detected. Switched to Instant Cinephile Engine for fast speed.');
        return false;
      }

      // Check if user is on older Intel GPU (like 2015 Mac Intel Iris/HD)
      const adapterInfo = (await adapter.requestAdapterInfo?.()) || {};
      const desc = `${adapterInfo.description || ''} ${adapterInfo.vendor || ''}`.toLowerCase();
      if (desc.includes('intel') && (desc.includes('hd') || desc.includes('iris') || desc.includes('5000') || desc.includes('6000'))) {
        console.warn('Legacy Intel GPU detected; enabling Instant Cinephile Engine to avoid memory stall.');
        this.enableFallback('Intel HD/Iris GPU detected. Enabled Instant Cinephile Engine (Zero Download Wait).');
        return false;
      }

      this.notifyProgress(0.10, 'Connecting to MLC model repository...');

      const webllm = await import('@mlc-ai/web-llm');

      let lastProgressTime = Date.now();
      const initProgressCallback = (report: any) => {
        lastProgressTime = Date.now();
        const text = report.text || 'Loading weights...';
        const progress = report.progress || 0;
        this.notifyProgress(progress, text);
      };

      // Watchdog timer: If download stalls for > 8 seconds, switch to Instant Engine!
      const stallChecker = setInterval(() => {
        if (this.isInitializing && Date.now() - lastProgressTime > 8000) {
          clearInterval(stallChecker);
          console.warn('WebGPU weight fetch stalled. Falling back to Instant Cinephile Engine.');
          this.enableFallback('Large model download stalled. Switched to Instant Cinephile Engine for instant speed!');
        }
      }, 2000);

      this.engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback,
      });

      clearInterval(stallChecker);
      this.isReady = true;
      this.isInitializing = false;
      this.usingFallback = false;
      this.lastError = null;
      this.notifyProgress(1.0, 'Cinephile Local AI Ready!');
      return true;
    } catch (err: any) {
      console.warn('WebLLM initialization note:', err);
      this.enableFallback("Instant Cinephile Engine Active.");
      return false;
    }
  }

  enableFallback(reason?: string) {
    this.usingFallback = true;
    this.isReady = true;
    this.isInitializing = false;
    this.notifyProgress(1.0, reason || 'Instant Cinephile Engine Ready', true, this.lastError);
  }

  private notifyProgress(progress: number, text: string, isFallback: boolean = false, error: string | null = null) {
    if (this.progressCallback) {
      this.progressCallback({
        progress: Math.min(Math.max(progress, 0), 1),
        text,
        isLoaded: this.isReady,
        isLoading: this.isInitializing,
        usingFallback: isFallback,
        error: error,
      });
    }
  }

  // Generate a response given message history and user taste summary
  async chat(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    userTasteSummary: string = "",
    onToken?: (token: string) => void
  ): Promise<{ text: string; recommendedMovies: Movie[] }> {
    // 1. If user provided a free Google Gemini API Key, use real Gemini cloud model!
    if (this.geminiApiKey) {
      try {
        return await this.callGeminiAPI(messages, userTasteSummary, onToken);
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to local cinephile engine', geminiErr);
      }
    }

    // 2. If WebLLM engine loaded successfully in browser GPU and user is on fast GPU
    if (!this.usingFallback && this.engine) {
      try {
        const fullSystemPrompt = `${CINEPHILE_SYSTEM_PROMPT}\n${
          userTasteSummary ? `\nUser's Saved Taste Profile:\n${userTasteSummary}` : ""
        }`;

        const formattedMessages = [
          { role: 'system', content: fullSystemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        let fullText = "";
        if (onToken) {
          const chunks = await this.engine.chat.completions.create({
            messages: formattedMessages,
            temperature: 0.5,
            stream: true,
          });

          for await (const chunk of chunks) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              onToken(delta);
            }
          }
        } else {
          const reply = await this.engine.chat.completions.create({
            messages: formattedMessages,
            temperature: 0.5,
          });
          fullText = reply.choices[0]?.message?.content || "";
        }

        const recommendedMovies = await this.extractAndMatchMovies(fullText);
        return { text: fullText, recommendedMovies };
      } catch (err) {
        console.warn('WebLLM generation error, falling back to intelligent conversational engine:', err);
      }
    }

    // 3. Fast, conversational, anti-wall-of-text Cinephile Engine
    return this.conversationalCinephileEngine(messages, userTasteSummary, onToken);
  }

  // Short, punchy, conversational engine
  private async conversationalCinephileEngine(
    messages: { role: string; content: string }[],
    userTaste: string,
    onToken?: (token: string) => void
  ): Promise<{ text: string; recommendedMovies: Movie[] }> {
    const userPrompt = messages[messages.length - 1]?.content || "";
    const clean = userPrompt.toLowerCase().trim();
    const seedMovies = tmdb.getSeedMovies();

    let responseText = "";
    let matched: Movie[] = [];

    // GREETING
    if (/^(hi|hello|hey|yo|howdy|sup|good evening|good morning)[\s!.]*$/i.test(clean)) {
      responseText = "Hey there! What kind of movie vibe are you craving tonight? Name a mood, favorite actor, or describe a plot you're trying to remember.";
    }
    // SHORT CONFIRMATIONS: YES / NO
    else if (/^(yes|yeah|yep|yup|that's it|correct|bingo)[\s!.]*$/i.test(clean)) {
      responseText = "Awesome! It's such a classic. Click the Trailer button below to watch the official preview, or tell me if you want another pick like it!";
    }
    else if (/^(no|nope|nah|not that|wrong)[\s!.]*$/i.test(clean)) {
      responseText = "Got it, not that one! Give me one more clue—do you remember roughly what decade it was, who was in it, or was it funny or scary?";
    }
    // MOVIE IDENTIFICATION: Giant worms in the ground
    else if (clean.includes('worm') || clean.includes('ground') || clean.includes('underground') || clean.includes('sandworm')) {
      const tremors = seedMovies.find((m) => m.title === 'Tremors');
      const dune = seedMovies.find((m) => m.title.includes('Dune'));
      matched = [tremors, dune].filter(Boolean) as Movie[];
      responseText = "Are you thinking of **Tremors (1990)** with Kevin Bacon? Or possibly Denis Villeneuve's **Dune (2021)**?";
    }
    // BOOK / NOVEL ADAPTATION: The Hatchet / Gary Paulsen
    else if (clean.includes('hatchet') || clean.includes('paulsen') || (clean.includes('plane crash') && clean.includes('wilderness')) || (clean.includes('boy') && clean.includes('wilderness'))) {
      const cryInWild = seedMovies.find((m) => m.title === 'A Cry in the Wild');
      matched = cryInWild ? [cryInWild] : [];
      responseText = "Are you thinking of **A Cry in the Wild (1990)**? It's the film adaptation of Gary Paulsen's survival novel **Hatchet**, starring Jared Rushton as Brian stranded alone in the Canadian wilderness with only a hatchet.";
    }
    // MOVIE IDENTIFICATION: TV show / life is fake
    else if (clean.includes('tv show') || clean.includes('fake life') || clean.includes('jim carrey') || clean.includes('dome')) {
      const truman = seedMovies.find((m) => m.title.includes('Truman'));
      matched = truman ? [truman] : [];
      responseText = "Are you thinking of **The Truman Show (1998)** starring Jim Carrey?";
    }
    // MOVIE IDENTIFICATION: Reverse memory / backwards
    else if (clean.includes('backward') || clean.includes('memory loss') || clean.includes('tattoo')) {
      const memento = seedMovies.find((m) => m.title === 'Memento');
      matched = memento ? [memento] : [];
      responseText = "Are you thinking of Christopher Nolan's **Memento (2000)**?";
    }
    // ASKING ABOUT A SPECIFIC MOVIE (e.g. "What is Inception about?")
    else if (seedMovies.some((m) => clean.includes(m.title.toLowerCase())) && (clean.includes('about') || clean.includes('what is') || clean.includes('who directed') || clean.includes('tell me'))) {
      const m = seedMovies.find((item) => clean.includes(item.title.toLowerCase()))!;
      matched = [m];
      responseText = `**${m.title}** (${m.release_date.slice(0, 4)}) is a ${m.genres.join('/')} directed by ${m.director || 'a master filmmaker'}.\n\n${m.overview}\n\nCheck out the trailer below!`;
    }
    // GENRES & MOODS
    else if (clean.includes('thriller') || clean.includes('twist') || clean.includes('mystery')) {
      matched = seedMovies.filter((m) => m.genres.includes('Thriller') || m.genres.includes('Mystery')).slice(0, 3);
      responseText = `If you want intense suspense and twists, check out:\n\n` +
        matched.map((m) => `• **${m.title}** (${m.release_date.slice(0, 4)}): ${m.tagline || m.overview.slice(0, 90) + '...'}`).join('\n');
    }
    else if (clean.includes('sci-fi') || clean.includes('space') || clean.includes('future') || clean.includes('cyberpunk')) {
      matched = seedMovies.filter((m) => m.genres.includes('Science Fiction')).slice(0, 3);
      responseText = `For mind-bending sci-fi with incredible atmosphere:\n\n` +
        matched.map((m) => `• **${m.title}** (${m.release_date.slice(0, 4)}): ${m.tagline || m.overview.slice(0, 90) + '...'}`).join('\n');
    }
    else if (clean.includes('comedy') || clean.includes('funny') || clean.includes('cozy') || clean.includes('feel good')) {
      matched = seedMovies.filter((m) => m.genres.includes('Comedy') || m.genres.includes('Music') || m.genres.includes('Drama')).slice(0, 3);
      responseText = `For something breezy and entertaining:\n\n` +
        matched.map((m) => `• **${m.title}** (${m.release_date.slice(0, 4)}): ${m.tagline || m.overview.slice(0, 90) + '...'}`).join('\n');
    }
    // DYNAMIC INTELLIGENT PERSON SEARCH (Actors, Directors, Creators)
    else {
      // 1. Try matching Person (Actor or Director, e.g. "Tom Cruise", "Leonardo DiCaprio", "Christopher Nolan", "Margot Robbie")
      const personCandidate = clean
        .replace(/^(can you |tell me |what are |show me |give me |find |recommend )*(some |the )*(best |top |great )*(movies |films )*(starring |by |with |from |directed by |actor )*/i, '')
        .replace(/(movies|films|film|movie|actor|director|starring|shows)$/i, '')
        .trim();

      if (personCandidate.length >= 3) {
        try {
          const personData = await tmdb.searchPerson(personCandidate);
          if (personData && personData.movies && personData.movies.length > 0) {
            matched = personData.movies.slice(0, 3);
            const verb = personData.department === 'Directing' ? 'directed by' : 'starring';
            responseText = `Here are standout films ${verb} **${personData.name}**:\n\n` +
              matched.map((m) => `• **${m.title}** (${m.release_date ? m.release_date.slice(0, 4) : 'Film'}): ${m.overview.slice(0, 90)}...`).join('\n') +
              `\n\nClick any trailer below to watch the official preview!`;
          }
        } catch (err) {
          console.warn('Person lookup failed', err);
        }
      }

      // 2. Try matching "movies like [Title]" / "similar to [Title]"
      if (!responseText) {
        const likeMatch = clean.match(/(?:like|similar to|after|recommend.*like|loved|enjoyed)\s+([a-z0-9: \-']+)/i);
        if (likeMatch) {
          const seedTitle = likeMatch[1].replace(/(movie|film|films|movies)$/i, '').trim();
          try {
            const recs = await tmdb.getMovieRecommendations(seedTitle);
            if (recs && recs.recommendations && recs.recommendations.length > 0) {
              matched = recs.recommendations.slice(0, 3);
              responseText = `If you enjoyed **${recs.seedMovie.title}**, here are top recommendations with a similar tone and style:\n\n` +
                matched.map((m) => `• **${m.title}** (${m.release_date ? m.release_date.slice(0, 4) : 'Film'}): ${m.overview.slice(0, 90)}...`).join('\n');
            }
          } catch (err) {
            console.warn('Recommendation lookup failed', err);
          }
        }
      }

      // 3. Try TMDb Multi-search across global movie & people database
      if (!responseText) {
        try {
          const queryTerm = userPrompt.replace(/(movie|film|about|the|what is|can you recommend|show me)/gi, '').trim() || userPrompt;
          const multiHits = await tmdb.searchMulti(queryTerm);
          if (multiHits && multiHits.length > 0) {
            const top = multiHits[0];
            matched = multiHits.slice(0, 3);
            const yr = top.release_date ? ` (${top.release_date.slice(0, 4)})` : '';
            if (clean.includes('what') || clean.includes('called') || clean.includes('about') || clean.includes('remember') || clean.includes('book')) {
              responseText = `Are you thinking of **${top.title}**${yr}? ${top.overview ? top.overview.slice(0, 160) + '...' : 'A captivating film.'}`;
            } else {
              responseText = `Here are standout picks matching "${userPrompt}":\n\n` +
                matched.map((m) => `• **${m.title}** (${m.release_date ? m.release_date.slice(0, 4) : 'Film'}): ${m.overview.slice(0, 90)}...`).join('\n');
            }
          }
        } catch (err) {
          console.warn('Live TMDb multi lookup failed', err);
        }
      }

      // 4. Final fallback
      if (!responseText) {
        const shuffled = [...seedMovies].sort(() => 0.5 - Math.random());
        matched = shuffled.slice(0, 2);
        responseText = `Based on that, here are two films worth your time tonight:\n\n` +
          matched.map((m) => `• **${m.title}** (${m.release_date.slice(0, 4)}): ${m.tagline || m.overview.slice(0, 90) + '...'}`).join('\n');
      }
    }

    // Stream response smoothly word-by-word
    if (onToken) {
      const words = responseText.split(' ');
      for (const w of words) {
        onToken(w + ' ');
        await new Promise((r) => setTimeout(r, 14));
      }
    }

    return { text: responseText, recommendedMovies: matched };
  }

  // Call Google Gemini API (Free Tier from Google AI Studio)
  private async callGeminiAPI(
    messages: { role: string; content: string }[],
    userTaste: string,
    onToken?: (token: string) => void
  ): Promise<{ text: string; recommendedMovies: Movie[] }> {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `${CINEPHILE_SYSTEM_PROMPT}\n${userTaste ? `User taste: ${userTaste}\n` : ''}` }]
      },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    ];

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data = await res.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Here are a few quick picks!";

    if (onToken) {
      const words = replyText.split(' ');
      for (const w of words) {
        onToken(w + ' ');
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    const matchedMovies = await this.extractAndMatchMovies(replyText);
    return { text: replyText, recommendedMovies: matchedMovies };
  }

  // Parses movie titles mentioned in the text and pulls rich TMDb data (posters, trailers)
  private async extractAndMatchMovies(text: string): Promise<Movie[]> {
    const matchedMovies: Movie[] = [];
    const seedMovies = tmdb.getSeedMovies();

    for (const movie of seedMovies) {
      const regex = new RegExp(`\\b${movie.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        if (!matchedMovies.some((m) => m.id === movie.id)) {
          matchedMovies.push(movie);
        }
      }
    }

    const IGNORE_WORDS = new Set([
      'why', 'genre', 'pacing', 'director', 'overview', 'rating', 'note',
      'film', 'movie', 'actor', 'movies', 'films', 'acting', 'directing',
      'cinema', 'story', 'trailer', 'cast', 'plot', 'mood', 'energy', 'vibe',
      'action', 'drama', 'comedy', 'sci-fi', 'thriller', 'mystery'
    ]);

    // 2. Extract bolded titles: **Title** or **Title (Year)**
    const boldRegex = /\*\*([^*]{2,60})\*\*/g;
    let match;
    while ((match = boldRegex.exec(text)) !== null && matchedMovies.length < 4) {
      const rawCandidate = match[1].trim();
      const cleanCandidate = rawCandidate.replace(/\s*\(\d{4}\)$/, '').replace(/[:–\-]$/, '').trim();
      if (
        cleanCandidate.length >= 2 &&
        !IGNORE_WORDS.has(cleanCandidate.toLowerCase()) &&
        !matchedMovies.some((m) => m.title.toLowerCase() === cleanCandidate.toLowerCase())
      ) {
        const movie = await tmdb.findMovieByTitle(cleanCandidate);
        if (movie && !matchedMovies.some((m) => String(m.id) === String(movie.id))) {
          matchedMovies.push(movie);
        }
      }
    }

    // 3. Extract numbered or bulleted list items: 1. Title or • Title
    const listRegex = /(?:[0-9]\.|\*+|[•\-\*])\s*(?:\*\*)?([A-Za-z0-9: \-']+?)(?:\*\*)?(?:\s*\(\d{4}\)|\s*[-–:]|\n|$)/g;
    while ((match = listRegex.exec(text)) !== null && matchedMovies.length < 4) {
      const rawCandidate = match[1].trim();
      const cleanCandidate = rawCandidate.replace(/\s*\(\d{4}\)$/, '').replace(/[:–\-]$/, '').trim();
      if (
        cleanCandidate.length >= 2 &&
        !IGNORE_WORDS.has(cleanCandidate.toLowerCase()) &&
        !matchedMovies.some((m) => m.title.toLowerCase() === cleanCandidate.toLowerCase())
      ) {
        const movie = await tmdb.findMovieByTitle(cleanCandidate);
        if (movie && !matchedMovies.some((m) => String(m.id) === String(movie.id))) {
          matchedMovies.push(movie);
        }
      }
    }

    return matchedMovies.slice(0, 4);
  }
}

export const webllmEngine = new WebLLMEngine();
