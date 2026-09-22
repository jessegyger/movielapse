import { Movie, StreamingProvider } from './types';
import { SEED_MOVIES } from './seedData';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

export const DEFAULT_TMDB_API_KEY = '844dba0bfd8f3a4f3799f6130ef9e335';

export const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

export const GENRE_NAME_TO_ID: Record<string, number> = {
  'Action': 28,
  'Adventure': 12,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family': 10751,
  'Fantasy': 14,
  'History': 36,
  'Horror': 27,
  'Music': 10402,
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 878,
  'Science Fiction': 878,
  'Thriller': 53,
  'War': 10752,
  'Western': 37
};

export class TMDbClient {
  private apiKey: string = DEFAULT_TMDB_API_KEY;

  constructor(apiKey?: string | null) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  setApiKey(key: string | null) {
    this.apiKey = key || DEFAULT_TMDB_API_KEY;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  // Get seed movies (always works offline & out of the box with verified providers and logos)
  getSeedMovies(): Movie[] {
    return SEED_MOVIES.map((m) => ({
      ...m,
      streaming_providers: m.streaming_providers?.map((sp) => {
        const clean = this.cleanProviderName(sp.name);
        return {
          ...sp,
          name: clean,
          logo_path: sp.logo_path || this.getProviderLogo(clean),
        };
      }),
    }));
  }

  // Discover movies with sorting, genre, and year filters
  async discoverMovies(options: {
    page?: number;
    sortBy?: string;
    genreId?: number;
    yearGte?: string;
    yearLte?: string;
    watchProviderId?: number;
    watchRegion?: string;
    releaseFormat?: 'all' | 'dvd' | 'theatrical';
  } = {}): Promise<{ results: Movie[]; totalPages: number }> {
    const page = options.page || 1;
    let url = `${TMDB_BASE_URL}/discover/movie?api_key=${this.apiKey}&page=${page}&include_adult=false`;

    const today = new Date().toISOString().split('T')[0];
    if (options.releaseFormat === 'dvd') {
      url += `&with_release_type=5&release_date.lte=${today}&region=US`;
    } else if (options.releaseFormat === 'theatrical') {
      const d = new Date();
      d.setDate(d.getDate() - 75);
      const seventyFiveDaysAgo = d.toISOString().split('T')[0];
      url += `&with_release_type=2|3&primary_release_date.gte=${seventyFiveDaysAgo}&primary_release_date.lte=${today}&region=US`;
    }

    if (options.sortBy) {
      url += `&sort_by=${options.sortBy}`;
      if (options.sortBy.includes('vote_average') || options.sortBy.includes('vote_count')) {
        url += `&vote_count.gte=100`;
      }
    } else {
      url += `&sort_by=popularity.desc`;
    }

    if (options.genreId) {
      url += `&with_genres=${options.genreId}`;
    }

    if (options.yearGte) {
      url += `&primary_release_date.gte=${options.yearGte}`;
    }
    if (options.yearLte) {
      url += `&primary_release_date.lte=${options.yearLte}`;
    }

    if (options.watchProviderId) {
      const reg = options.watchRegion || this.getUserCountry() || 'US';
      url += `&with_watch_providers=${options.watchProviderId}&watch_region=${reg}`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return {
          results: (data.results || []).map((m: any) => this.formatTMDbMovie(m)),
          totalPages: data.total_pages || 1,
        };
      }
    } catch (err) {
      console.warn('TMDb discover fetch failed', err);
    }

    return { results: SEED_MOVIES.slice(0, 20), totalPages: 1 };
  }

  // Get movies currently playing in theatres
  async getNowPlayingMovies(page: number = 1): Promise<{ results: Movie[]; totalPages: number }> {
    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/movie/now_playing?api_key=${this.apiKey}&page=${page}&region=US`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          results: (data.results || []).map((m: any) => this.formatTMDbMovie(m)),
          totalPages: data.total_pages || 1,
        };
      }
    } catch (err) {
      console.warn('TMDb now_playing fetch failed', err);
    }
    return this.discoverMovies({ page, releaseFormat: 'theatrical' });
  }

  // Get movies available on DVD / Blu-ray physical media
  async getDvdMovies(page: number = 1): Promise<{ results: Movie[]; totalPages: number }> {
    return this.discoverMovies({
      page,
      releaseFormat: 'dvd',
      sortBy: 'popularity.desc',
    });
  }

  // Get movies actively streaming on Netflix in the user's region
  async getNetflixMovies(page: number = 1): Promise<{ results: Movie[]; totalPages: number }> {
    return this.discoverMovies({
      page,
      watchProviderId: 8,
      sortBy: 'vote_count.desc',
    });
  }

  // Get trending movies for the week (paginated for thousands of movies)
  async getTrendingMovies(page: number = 1): Promise<{ results: Movie[]; totalPages: number }> {
    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/trending/movie/week?api_key=${this.apiKey}&page=${page}`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          results: (data.results || []).map((m: any) => this.formatTMDbMovie(m)),
          totalPages: data.total_pages || 1,
        };
      }
    } catch (err) {
      console.warn('TMDb trending fetch failed', err);
    }
    return { results: SEED_MOVIES.slice(0, 20), totalPages: 1 };
  }

  // Get popular movies
  async getPopularMovies(page: number = 1): Promise<{ results: Movie[]; totalPages: number }> {
    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${this.apiKey}&page=${page}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          results: (data.results || []).map((m: any) => this.formatTMDbMovie(m)),
          totalPages: data.total_pages || 1,
        };
      }
    } catch (err) {
      console.warn('TMDb popular fetch failed', err);
    }
    return { results: SEED_MOVIES.slice(0, 20), totalPages: 1 };
  }

  // Get top rated movies
  async getTopRatedMovies(page: number = 1): Promise<{ results: Movie[]; totalPages: number }> {
    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${this.apiKey}&page=${page}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          results: (data.results || []).map((m: any) => this.formatTMDbMovie(m)),
          totalPages: data.total_pages || 1,
        };
      }
    } catch (err) {
      console.warn('TMDb top rated fetch failed', err);
    }
    return { results: SEED_MOVIES.slice(0, 20), totalPages: 1 };
  }

  // Paginated live search across hundreds of thousands of movies (actors, directors, titles)
  async searchMoviesPaged(
    query: string,
    page: number = 1,
    releaseFormat: 'all' | 'dvd' | 'theatrical' = 'all'
  ): Promise<{ results: Movie[]; totalPages: number }> {
    const clean = query.trim();
    if (!clean) {
      if (releaseFormat === 'dvd') return this.getDvdMovies(page);
      if (releaseFormat === 'theatrical') return this.getNowPlayingMovies(page);
      return this.getTrendingMovies(page);
    }

    // 1. Run TMDb movie search first
    let movieResults: Movie[] = [];
    let movieTotalPages = 1;

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(clean)}&page=${page}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        movieResults = (data.results || []).map((m: any) => this.formatTMDbMovie(m));
        movieTotalPages = data.total_pages || 1;
      }
    } catch (err) {
      console.warn('TMDb paged search failed', err);
    }

    if (releaseFormat === 'dvd') {
      movieResults = movieResults.filter(m => m.is_on_dvd);
    } else if (releaseFormat === 'theatrical') {
      movieResults = movieResults.filter(m => m.is_in_theatres);
    }

    // Check if query is an exact match for a movie title (e.g. "moon" matches "Moon")
    const cleanLower = clean.toLowerCase();
    const hasExactMovieMatch = movieResults.some(
      (m) => m.title.toLowerCase() === cleanLower
    );

    // If an exact movie title matches and query is a single word, prioritize movie search!
    // Otherwise, check if this is an actor or director search (e.g. "Tom Cruise", "Jeff Bridges")
    if (!hasExactMovieMatch || clean.includes(' ')) {
      try {
        const person = await this.searchPerson(clean);
        if (person && person.movies && person.movies.length > 0) {
          const personNameLower = person.name.toLowerCase();
          const isExactPerson = personNameLower === cleanLower ||
            ((person.popularity || 0) > 10 && personNameLower.includes(cleanLower) && clean.includes(' '));

          if (isExactPerson || movieResults.length === 0) {
            let pPool = person.movies;
            if (releaseFormat === 'dvd') {
              pPool = pPool.filter(m => m.is_on_dvd);
            } else if (releaseFormat === 'theatrical') {
              pPool = pPool.filter(m => m.is_in_theatres);
            }

            const pageSize = 20;
            const startIndex = (page - 1) * pageSize;
            const paged = pPool.slice(startIndex, startIndex + pageSize);
            const totalPages = Math.ceil(pPool.length / pageSize);
            if (paged.length > 0) {
              return {
                results: paged,
                totalPages: Math.max(totalPages, 1),
              };
            }
          }
        }
      } catch (err) {
        console.warn('Person check in searchMoviesPaged failed', err);
      }
    }

    if (movieResults.length > 0) {
      return {
        results: movieResults,
        totalPages: movieTotalPages,
      };
    }

    const local = await this.searchMovies(clean);
    return { results: local, totalPages: 1 };
  }

  // Search for actor or director and fetch their full filmography
  async searchPerson(name: string): Promise<{ id: number; name: string; department: string; popularity?: number; movies: Movie[] } | null> {
    const cleanName = name.trim();
    if (!cleanName) return null;

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/person?api_key=${this.apiKey}&query=${encodeURIComponent(cleanName)}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const cleanLower = cleanName.toLowerCase();
          // Find the best person match: either exact name or most popular
          const person = data.results.find((p: any) => p.name.toLowerCase() === cleanLower) || data.results[0];
          const personLower = person.name.toLowerCase();

          // Ensure it's a genuine match (exact name, or query with 2 words)
          const isValidMatch = personLower === cleanLower ||
            (person.popularity > 8 && personLower.includes(cleanLower) && cleanName.includes(' '));

          if (isValidMatch) {
            const creditsRes = await fetch(
              `${TMDB_BASE_URL}/person/${person.id}/movie_credits?api_key=${this.apiKey}`
            );
            let movies: Movie[] = [];
            if (creditsRes.ok) {
              const cData = await creditsRes.json();
              const pool: any[] = person.known_for_department === 'Directing'
                ? (cData.crew || []).filter((item: any) => item.job === 'Director')
                : (cData.cast || []);

              // Deduplicate and sort by popularity
              const seen = new Set<number>();
              const sorted = pool
                .filter((item: any) => {
                  if (!item.id || !item.poster_path || seen.has(item.id)) return false;
                  seen.add(item.id);
                  return true;
                })
                .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

              movies = sorted.map((m: any) => this.formatTMDbMovie(m));
            }

            return {
              id: person.id,
              name: person.name,
              department: person.known_for_department || 'Acting',
              popularity: person.popularity,
              movies,
            };
          }
        }
      }
    } catch (err) {
      console.warn('searchPerson error', err);
    }
    return null;
  }

  // Get similar / recommended movies for a title
  async getMovieRecommendations(movieTitle: string): Promise<{ seedMovie: Movie; recommendations: Movie[] } | null> {
    try {
      const match = await this.findMovieByTitle(movieTitle);
      if (match && typeof match.id === 'number') {
        const res = await fetch(
          `${TMDB_BASE_URL}/movie/${match.id}/recommendations?api_key=${this.apiKey}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const recommendations = data.results
              .filter((m: any) => m.poster_path)
              .slice(0, 4)
              .map((m: any) => this.formatTMDbMovie(m));
            return { seedMovie: match, recommendations };
          }
        }
      }
    } catch (err) {
      console.warn('TMDb recommendations error', err);
    }
    return null;
  }

  // Multi-search: searches movies and people simultaneously
  async searchMulti(query: string): Promise<Movie[]> {
    const clean = query.trim();
    if (!clean) return [];

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${this.apiKey}&query=${encodeURIComponent(clean)}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        const movies: Movie[] = [];
        for (const item of data.results || []) {
          if (item.media_type === 'movie' && item.poster_path) {
            movies.push(this.formatTMDbMovie(item));
          } else if (item.media_type === 'person' && item.known_for) {
            for (const k of item.known_for) {
              if (k.media_type === 'movie' && k.poster_path && !movies.some((m) => m.id === k.id)) {
                movies.push(this.formatTMDbMovie(k));
              }
            }
          }
        }
        if (movies.length > 0) return movies;
      }
    } catch (err) {
      console.warn('TMDb multi search error', err);
    }

    return this.searchMovies(clean);
  }

  // Search movies by title or query
  async searchMovies(query: string): Promise<Movie[]> {
    const cleanQuery = query.toLowerCase().trim();

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results.map((m: any) => this.formatTMDbMovie(m));
        }
      }
    } catch (err) {
      console.warn('TMDb live search failed, falling back to local dataset', err);
    }

    // Fallback: search within seed catalog
    return SEED_MOVIES.filter(
      (m) =>
        m.title.toLowerCase().includes(cleanQuery) ||
        m.genres.some((g) => g.toLowerCase().includes(cleanQuery)) ||
        (m.director && m.director.toLowerCase().includes(cleanQuery)) ||
        (m.cast && m.cast.some((c) => c.toLowerCase().includes(cleanQuery)))
    );
  }

  // Find a movie by title (used to match AI recommendations to real posters & trailers)
  async findMovieByTitle(title: string): Promise<Movie | null> {
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // Check local seed movies first for instant match
    const localMatch = SEED_MOVIES.find((m) => {
      const candidate = m.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      return candidate === cleanTitle || candidate.includes(cleanTitle) || cleanTitle.includes(candidate);
    });

    if (localMatch) {
      return localMatch;
    }

    // Query TMDb
    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(title)}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          const details = await this.getMovieDetails(first.id);
          return details || this.formatTMDbMovie(first);
        }
      }
    } catch (err) {
      console.warn('Failed to find movie on TMDb', err);
    }

    // Fallback
    return {
      id: `synthetic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title,
      overview: "A highly regarded cinematic pick matching your specific mood and taste profile.",
      poster_path: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80",
      release_date: "Curated Pick",
      vote_average: 8.0,
      genres: ["Curated Selection", "Recommended"],
      tagline: "Recommended by MovieLapse AI",
      trailer_key: undefined
    };
  }

  // Detect user's ISO-3166-1 country code (defaults to US)
  getUserCountry(): string {
    if (typeof window !== 'undefined') {
      try {
        const locale = navigator.language || (navigator.languages && navigator.languages[0]) || 'en-US';
        const parts = locale.split('-');
        if (parts.length > 1 && parts[1].length === 2) {
          return parts[1].toUpperCase();
        }
      } catch {}
    }
    return 'US';
  }

  private providersCache = new Map<number, StreamingProvider[]>();

  // Normalize and clean up provider names for clear recognizable branding
  cleanProviderName(raw: string): string {
    const norm = raw.toLowerCase();
    if (norm.includes('netflix')) return 'Netflix';
    if (norm.includes('prime') || norm.includes('amazon')) return 'Prime Video';
    if (norm.includes('disney')) return 'Disney+';
    if (norm.includes('max') || norm.includes('hbo')) return 'Max';
    if (norm.includes('hulu')) return 'Hulu';
    if (norm.includes('apple')) return 'Apple TV';
    if (norm.includes('paramount')) return 'Paramount+';
    if (norm.includes('peacock')) return 'Peacock';
    if (norm.includes('tubi')) return 'Tubi';
    if (norm.includes('pluto')) return 'Pluto TV';
    if (norm.includes('youtube')) return 'YouTube';
    return raw;
  }

  // Resolve official provider logo when TMDb returns null logo or for fallback
  getProviderLogo(providerName: string): string | undefined {
    const norm = providerName.toLowerCase();
    if (norm.includes('netflix')) return 'https://image.tmdb.org/t/p/original/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg';
    if (norm.includes('prime') || norm.includes('amazon')) return 'https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg';
    if (norm.includes('disney')) return 'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg';
    if (norm.includes('max') || norm.includes('hbo')) return 'https://image.tmdb.org/t/p/original/aS2zvJWn9mwiCOeaaCkIh4w00dD.jpg';
    if (norm.includes('hulu')) return 'https://image.tmdb.org/t/p/original/giwM8L5DaFMTEG1Qg2G2tzxsYvg.jpg';
    if (norm.includes('apple')) return 'https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg';
    if (norm.includes('paramount')) return 'https://image.tmdb.org/t/p/original/fi83B1oztoS47xxcemFdPMhIzK.jpg';
    if (norm.includes('peacock')) return 'https://image.tmdb.org/t/p/original/8VCV78ehT9YImCcDTRAR292278b.jpg';
    if (norm.includes('youtube')) return 'https://image.tmdb.org/t/p/original/peURlLlr8jggOwK53fJ5wdQl05y.jpg';
    if (norm.includes('pluto')) return 'https://image.tmdb.org/t/p/original/fN4czqaMQNLeF6sSSIjGbAWzvwK.png';
    if (norm.includes('tubi')) return 'https://image.tmdb.org/t/p/original/9dEuvA8wg5TSeFBZlPxSVxFdimJ.png';
    return undefined;
  }

  // Build deep link directly to the movie on the platform or TMDb watch page
  getWatchUrl(providerName: string, movieTitle: string, tmdbWatchUrl?: string): string {
    const q = encodeURIComponent(movieTitle);
    const norm = providerName.toLowerCase();
    if (norm.includes('netflix')) return `https://www.netflix.com/search?q=${q}`;
    if (norm.includes('prime') || norm.includes('amazon')) return `https://www.amazon.com/s?k=${q}&i=instant-video`;
    if (norm.includes('disney')) return `https://www.disneyplus.com/search?q=${q}`;
    if (norm.includes('max') || norm.includes('hbo')) return `https://play.max.com/search?q=${q}`;
    if (norm.includes('hulu')) return `https://www.hulu.com/search?q=${q}`;
    if (norm.includes('apple')) return `https://tv.apple.com/search?term=${q}`;
    if (norm.includes('paramount')) return `https://www.paramountplus.com/search/?q=${q}`;
    if (norm.includes('peacock')) return `https://www.peacocktv.com/watch/search?q=${q}`;
    if (norm.includes('youtube')) return `https://www.youtube.com/results?search_query=${q}+movie`;
    if (norm.includes('tubi')) return `https://tubitv.com/search/${q}`;
    if (norm.includes('pluto')) return `https://pluto.tv/search/details/movies/${q}`;
    return tmdbWatchUrl || `https://www.google.com/search?q=watch+${q}+online`;
  }

  // Fetch verified streaming providers (Netflix, Prime, Disney+, Max, Hulu, etc.) by region
  async getWatchProviders(movieId: number | string, movieTitle?: string, region?: string): Promise<StreamingProvider[]> {
    const numId = Number(movieId);
    if (isNaN(numId) || numId <= 0) return [];

    if (this.providersCache.has(numId)) {
      return this.providersCache.get(numId)!;
    }

    const targetRegion = region || this.getUserCountry();
    try {
      const res = await fetch(`${TMDB_BASE_URL}/movie/${numId}/watch/providers?api_key=${this.apiKey}`);
      if (res.ok) {
        const data = await res.json();
        const regData = data.results?.[targetRegion] || data.results?.['US'] || (data.results ? Object.values(data.results)[0] : null) as any;
        if (!regData) return [];

        const providers: StreamingProvider[] = [];
        const seen = new Set<string>();
        const titleForLink = movieTitle || '';

        const addProviders = (list: any[], type: 'stream' | 'rent' | 'buy') => {
          if (!list || !Array.isArray(list)) return;
          for (const p of list) {
            const cleanName = this.cleanProviderName(p.provider_name);
            if (!seen.has(cleanName)) {
              seen.add(cleanName);
              providers.push({
                name: cleanName,
                logo_path: p.logo_path ? `${TMDB_IMG_BASE}${p.logo_path}` : this.getProviderLogo(cleanName),
                type,
                watch_url: this.getWatchUrl(cleanName, titleForLink, regData.link)
              });
            }
          }
        };

        // 1. Subscription streaming (Flatrate)
        addProviders(regData.flatrate, 'stream');
        // 2. Free or Ads
        addProviders(regData.ads, 'stream');
        // 3. Rent / Buy fallback
        if (providers.length === 0) {
          addProviders(regData.rent, 'rent');
          addProviders(regData.buy, 'buy');
        }

        const topProviders = providers.slice(0, 4);
        this.providersCache.set(numId, topProviders);
        return topProviders;
      }
    } catch (e) {
      console.warn('Failed to fetch watch providers', e);
    }
    return [];
  }

  // Batch enrich movies with live verified watch providers
  async enrichMoviesWithProviders(movies: Movie[], maxCount: number = 24): Promise<Movie[]> {
    if (!movies || movies.length === 0) return movies;

    const toProcess = movies.slice(0, maxCount);
    const enrichedSlice = await Promise.all(
      toProcess.map(async (movie) => {
        const numId = Number(movie.id);
        // Try live TMDb providers with movie title for deep search URLs
        if (!isNaN(numId) && numId > 0) {
          const providers = await this.getWatchProviders(numId, movie.title);
          if (providers && providers.length > 0) {
            return { ...movie, streaming_providers: providers };
          }
        }

        // If movie already has concrete providers, ensure logos and watch URLs are attached
        if (movie.streaming_providers && movie.streaming_providers.length > 0 && movie.streaming_providers[0].name !== 'Available Online') {
          const filled = movie.streaming_providers.map(sp => {
            const clean = this.cleanProviderName(sp.name);
            return {
              ...sp,
              name: clean,
              logo_path: sp.logo_path || this.getProviderLogo(clean),
              watch_url: sp.watch_url || this.getWatchUrl(clean, movie.title)
            };
          });
          return { ...movie, streaming_providers: filled };
        }

        // Check seed catalog for fallback providers
        const seedMatch = SEED_MOVIES.find(s => String(s.id) === String(movie.id) || s.title.toLowerCase() === movie.title.toLowerCase());
        if (seedMatch?.streaming_providers) {
          const filled = seedMatch.streaming_providers.map(sp => {
            const clean = this.cleanProviderName(sp.name);
            return {
              ...sp,
              name: clean,
              logo_path: sp.logo_path || this.getProviderLogo(clean),
              watch_url: sp.watch_url || this.getWatchUrl(clean, movie.title)
            };
          });
          return { ...movie, streaming_providers: filled };
        }

        return movie;
      })
    );

    return [...enrichedSlice, ...movies.slice(maxCount)];
  }

  // Get full movie details + trailer video key + verified regional streaming
  async getMovieDetails(movieId: number | string): Promise<Movie | null> {
    const local = SEED_MOVIES.find((m) => String(m.id) === String(movieId));

    const numericId = Number(movieId);
    if (!isNaN(numericId) && numericId > 0) {
      try {
        const [movieRes, videosRes, providers] = await Promise.all([
          fetch(`${TMDB_BASE_URL}/movie/${numericId}?api_key=${this.apiKey}&append_to_response=credits,keywords`),
          fetch(`${TMDB_BASE_URL}/movie/${numericId}/videos?api_key=${this.apiKey}`),
          this.getWatchProviders(numericId, local?.title)
        ]);

        if (movieRes.ok) {
          const m = await movieRes.json();
          let trailer_key: string | undefined;

          if (videosRes.ok) {
            const v = await videosRes.json();
            const officialTrailer = v.results?.find(
              (vid: any) => vid.site === 'YouTube' && (vid.type === 'Trailer' || vid.type === 'Teaser')
            );
            trailer_key = officialTrailer?.key || v.results?.[0]?.key;
          }

          const genres = m.genres && m.genres.length > 0
            ? m.genres.map((g: any) => g.name)
            : (m.genre_ids ? m.genre_ids.map((id: number) => TMDB_GENRE_MAP[id]).filter(Boolean) : ['Cinema']);

          const rawProviders = providers.length > 0 ? providers : (local?.streaming_providers || []);
          const finalProviders = rawProviders.map(p => {
            const clean = this.cleanProviderName(p.name);
            return {
              ...p,
              name: clean,
              logo_path: p.logo_path || this.getProviderLogo(clean),
              watch_url: p.watch_url || this.getWatchUrl(clean, m.title)
            };
          });

          const director = m.credits?.crew?.find((c: any) => c.job === 'Director')?.name || local?.director;
          const cast = m.credits?.cast?.slice(0, 8).map((c: any) => c.name) || local?.cast;
          const keywords = m.keywords?.keywords?.map((k: any) => k.name) || [];

          const releaseDate = m.release_date || (local ? local.release_date : "");
          const today = new Date().toISOString().split('T')[0];
          const diffDays = releaseDate ? Math.floor((new Date(today).getTime() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
          const isInTheatres = diffDays >= -14 && diffDays <= 75;
          const titleClean = m.title || local?.title || 'Untitled';
          const titleEnc = encodeURIComponent(titleClean);

          return {
            id: m.id,
            title: titleClean,
            original_title: m.original_title,
            overview: m.overview || (local ? local.overview : "A captivating cinematic journey."),
            poster_path: m.poster_path
              ? `${TMDB_IMG_BASE}${m.poster_path}`
              : (local?.poster_path || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80"),
            backdrop_path: m.backdrop_path ? `${TMDB_BACKDROP_BASE}${m.backdrop_path}` : undefined,
            release_date: releaseDate,
            vote_average: m.vote_average ? Math.round(m.vote_average * 10) / 10 : 7.5,
            vote_count: m.vote_count,
            genres: genres.length > 0 ? genres : ["Cinema"],
            runtime: m.runtime || local?.runtime,
            tagline: m.tagline || local?.tagline,
            trailer_key: trailer_key || local?.trailer_key,
            director: director,
            cast: cast,
            keywords: keywords,
            budget: m.budget,
            revenue: m.revenue,
            status: m.status,
            streaming_providers: finalProviders.length > 0 ? finalProviders : undefined,
            is_in_theatres: isInTheatres,
            theatre_tickets_url: `https://www.google.com/search?q=${titleEnc}+movie+showtimes+tickets`,
          };
        }
      } catch (err) {
        console.warn('Error fetching TMDb movie details', err);
      }
    }

    return local || null;
  }

  public formatTMDbMovie(m: any): Movie {
    const genres = m.genres
      ? m.genres.map((g: any) => g.name)
      : (m.genre_ids ? m.genre_ids.map((id: number) => TMDB_GENRE_MAP[id]).filter(Boolean) : ['Cinema']);

    const numId = Number(m.id);
    const cachedProviders = !isNaN(numId) ? this.providersCache.get(numId) : undefined;
    const local = SEED_MOVIES.find((s) => Number(s.id) === numId || s.title.toLowerCase() === (m.title || '').toLowerCase());
    const seedProviders = local?.streaming_providers?.map(sp => {
      const clean = this.cleanProviderName(sp.name);
      return {
        ...sp,
        name: clean,
        logo_path: sp.logo_path || this.getProviderLogo(clean)
      };
    });

    const titleClean = m.title || m.original_title || 'Untitled';
    const releaseDate = m.release_date || "";
    const today = new Date().toISOString().split('T')[0];
    const diffDays = releaseDate ? Math.floor((new Date(today).getTime() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const isInTheatres = diffDays >= -14 && diffDays <= 75;
    const isOnDvd = diffDays >= 75;
    const titleEnc = encodeURIComponent(titleClean);

    return {
      id: m.id,
      title: titleClean,
      overview: m.overview || "No overview available.",
      poster_path: m.poster_path
        ? `${TMDB_IMG_BASE}${m.poster_path}`
        : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80",
      backdrop_path: m.backdrop_path ? `${TMDB_BACKDROP_BASE}${m.backdrop_path}` : undefined,
      release_date: releaseDate,
      vote_average: m.vote_average ? Math.round(m.vote_average * 10) / 10 : 7.5,
      genres: genres.length > 0 ? genres.slice(0, 3) : ["Feature Film"],
      streaming_providers: cachedProviders || seedProviders || undefined,
      is_on_dvd: isOnDvd,
      is_in_theatres: isInTheatres,
      dvd_buy_url: `https://www.amazon.com/s?k=${titleEnc}+dvd+blu-ray&i=movies-tv`,
      theatre_tickets_url: `https://www.google.com/search?q=${titleEnc}+movie+showtimes+tickets`,
    };
  }
}

export const tmdb = new TMDbClient();
