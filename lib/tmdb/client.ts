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

  // Get seed movies (always works offline & out of the box)
  getSeedMovies(): Movie[] {
    return [...SEED_MOVIES];
  }

  // Discover movies with sorting, genre, and year filters
  async discoverMovies(options: {
    page?: number;
    sortBy?: string;
    genreId?: number;
    yearGte?: string;
    yearLte?: string;
  } = {}): Promise<{ results: Movie[]; totalPages: number }> {
    const page = options.page || 1;
    let url = `${TMDB_BASE_URL}/discover/movie?api_key=${this.apiKey}&page=${page}&include_adult=false`;

    if (options.sortBy) {
      url += `&sort_by=${options.sortBy}`;
      if (options.sortBy.includes('vote_average')) {
        url += `&vote_count.gte=150`;
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
  async searchMoviesPaged(query: string, page: number = 1): Promise<{ results: Movie[]; totalPages: number }> {
    const clean = query.trim();
    if (!clean) {
      return this.getTrendingMovies(page);
    }

    // 1. Check if the search query matches an actor or director
    try {
      const person = await this.searchPerson(clean);
      if (person && person.movies && person.movies.length > 0) {
        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        const paged = person.movies.slice(startIndex, startIndex + pageSize);
        const totalPages = Math.ceil(person.movies.length / pageSize);
        if (paged.length > 0) {
          return {
            results: paged,
            totalPages: Math.max(totalPages, 1),
          };
        }
      }
    } catch (err) {
      console.warn('Person check in searchMoviesPaged failed', err);
    }

    // 2. Query TMDb Movie Search
    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(clean)}&page=${page}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          results: (data.results || []).map((m: any) => this.formatTMDbMovie(m)),
          totalPages: data.total_pages || 1,
        };
      }
    } catch (err) {
      console.warn('TMDb paged search failed', err);
    }
    const local = await this.searchMovies(clean);
    return { results: local, totalPages: 1 };
  }

  // Search for actor or director and fetch their full filmography
  async searchPerson(name: string): Promise<{ id: number; name: string; department: string; movies: Movie[] } | null> {
    const cleanName = name.trim();
    if (!cleanName) return null;

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/person?api_key=${this.apiKey}&query=${encodeURIComponent(cleanName)}&include_adult=false`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const person = data.results[0];
          if (person.popularity > 1.2 || person.name.toLowerCase().includes(cleanName.toLowerCase())) {
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
                .filter((m: any) => {
                  if (!m.id || !m.poster_path || seen.has(m.id)) return false;
                  seen.add(m.id);
                  return true;
                })
                .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

              movies = sorted.map((m: any) => this.formatTMDbMovie(m));
            }

            if (movies.length === 0 && person.known_for) {
              movies = person.known_for
                .filter((item: any) => item.media_type === 'movie' && item.poster_path)
                .map((m: any) => this.formatTMDbMovie(m));
            }

            return {
              id: person.id,
              name: person.name,
              department: person.known_for_department || 'Acting',
              movies,
            };
          }
        }
      }
    } catch (err) {
      console.warn('TMDb person search error', err);
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
    return undefined;
  }

  // Fetch verified streaming providers (Netflix, Prime, Disney+, Max, Hulu, etc.) by region
  async getWatchProviders(movieId: number | string, region?: string): Promise<StreamingProvider[]> {
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
        const regData = data.results?.[targetRegion] || data.results?.['US'];
        if (!regData) return [];

        const providers: StreamingProvider[] = [];

        // 1. Subscription streaming (Flatrate)
        if (regData.flatrate && Array.isArray(regData.flatrate)) {
          for (const p of regData.flatrate) {
            providers.push({
              name: p.provider_name,
              logo_path: p.logo_path ? `${TMDB_IMG_BASE}${p.logo_path}` : this.getProviderLogo(p.provider_name),
              type: 'stream'
            });
          }
        }

        // 2. Free or Ads
        if (regData.ads && Array.isArray(regData.ads)) {
          for (const p of regData.ads) {
            if (!providers.some(existing => existing.name === p.provider_name)) {
              providers.push({
                name: `${p.provider_name} (Free w/ ads)`,
                logo_path: p.logo_path ? `${TMDB_IMG_BASE}${p.logo_path}` : this.getProviderLogo(p.provider_name),
                type: 'stream'
              });
            }
          }
        }

        // 3. Rent / Buy
        if (providers.length === 0 && regData.rent && Array.isArray(regData.rent)) {
          for (const p of regData.rent.slice(0, 3)) {
            providers.push({
              name: `${p.provider_name} (Rent/Buy)`,
              logo_path: p.logo_path ? `${TMDB_IMG_BASE}${p.logo_path}` : this.getProviderLogo(p.provider_name),
              type: 'rent'
            });
          }
        }

        this.providersCache.set(numId, providers);
        return providers;
      }
    } catch (e) {
      console.warn('Failed to fetch watch providers', e);
    }
    return [];
  }

  // Batch enrich movies with live verified watch providers
  async enrichMoviesWithProviders(movies: Movie[], maxCount: number = 8): Promise<Movie[]> {
    if (!movies || movies.length === 0) return movies;

    const toProcess = movies.slice(0, maxCount);
    const enrichedSlice = await Promise.all(
      toProcess.map(async (movie) => {
        // If movie already has concrete providers with logos, ensure logos are filled
        if (movie.streaming_providers && movie.streaming_providers.length > 0 && movie.streaming_providers[0].name !== 'Available Online') {
          const filled = movie.streaming_providers.map(sp => ({
            ...sp,
            logo_path: sp.logo_path || this.getProviderLogo(sp.name)
          }));
          return { ...movie, streaming_providers: filled };
        }

        const numId = Number(movie.id);
        if (!isNaN(numId) && numId > 0) {
          const providers = await this.getWatchProviders(numId);
          if (providers && providers.length > 0) {
            return { ...movie, streaming_providers: providers };
          }
        }

        // Check seed catalog for fallback providers
        const seedMatch = SEED_MOVIES.find(s => String(s.id) === String(movie.id) || s.title.toLowerCase() === movie.title.toLowerCase());
        if (seedMatch?.streaming_providers) {
          const filled = seedMatch.streaming_providers.map(sp => ({
            ...sp,
            logo_path: sp.logo_path || this.getProviderLogo(sp.name)
          }));
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
          fetch(`${TMDB_BASE_URL}/movie/${numericId}?api_key=${this.apiKey}`),
          fetch(`${TMDB_BASE_URL}/movie/${numericId}/videos?api_key=${this.apiKey}`),
          this.getWatchProviders(numericId)
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

          return {
            id: m.id,
            title: m.title,
            overview: m.overview || (local ? local.overview : "A captivating cinematic journey."),
            poster_path: m.poster_path
              ? `${TMDB_IMG_BASE}${m.poster_path}`
              : (local?.poster_path || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80"),
            backdrop_path: m.backdrop_path ? `${TMDB_BACKDROP_BASE}${m.backdrop_path}` : undefined,
            release_date: m.release_date || (local ? local.release_date : ""),
            vote_average: m.vote_average ? Math.round(m.vote_average * 10) / 10 : 7.5,
            genres: genres.length > 0 ? genres : ["Cinema"],
            runtime: m.runtime || local?.runtime,
            tagline: m.tagline || local?.tagline,
            trailer_key: trailer_key || local?.trailer_key,
            director: local?.director,
            cast: local?.cast,
            streaming_providers: providers.length > 0 ? providers : (local?.streaming_providers || [{ name: "Available to Stream / Rent", type: "stream" }])
          };
        }
      } catch (err) {
        console.warn('Error fetching TMDb movie details', err);
      }
    }

    return local || null;
  }

  private formatTMDbMovie(m: any): Movie {
    const genres = m.genres
      ? m.genres.map((g: any) => g.name)
      : (m.genre_ids ? m.genre_ids.map((id: number) => TMDB_GENRE_MAP[id]).filter(Boolean) : ['Cinema']);

    return {
      id: m.id,
      title: m.title || m.original_title || 'Untitled',
      overview: m.overview || "No overview available.",
      poster_path: m.poster_path
        ? `${TMDB_IMG_BASE}${m.poster_path}`
        : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80",
      backdrop_path: m.backdrop_path ? `${TMDB_BACKDROP_BASE}${m.backdrop_path}` : undefined,
      release_date: m.release_date || "",
      vote_average: m.vote_average ? Math.round(m.vote_average * 10) / 10 : 7.5,
      genres: genres.length > 0 ? genres.slice(0, 3) : ["Feature Film"],
      streaming_providers: [{ name: "Available Online", type: "stream" }]
    };
  }
}

export const tmdb = new TMDbClient();
