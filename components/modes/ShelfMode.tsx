'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Bookmark, Compass, Search, Flame, Award, TrendingUp, Loader2, Sparkles, ArrowUpDown, Calendar, X, Check } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';
import { tmdb, GENRE_NAME_TO_ID } from '@/lib/tmdb/client';
import { MovieCard } from '../movie/MovieCard';

interface ShelfModeProps {
  onPlayTrailer: (movie: Movie) => void;
  onLove: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatchlist: (movie: Movie) => void;
  lovedMovies: Movie[];
  dislikedMovies: Movie[];
  watchlistMovies: Movie[];
  allSeedMovies: Movie[];
}

type TabType = 'trending' | 'popular' | 'top_rated' | 'curated' | 'loved' | 'watchlist';
type SortOption = 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc' | 'primary_release_date.asc' | 'title.asc';
type YearOption = 'All' | '2020s' | '2010s' | '2000s' | '1990s' | '1980s' | '1970s' | 'classics';

export const ShelfMode: React.FC<ShelfModeProps> = ({
  onPlayTrailer,
  onLove,
  onDislike,
  onWatchlist,
  lovedMovies,
  dislikedMovies,
  watchlistMovies,
  allSeedMovies,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('popularity.desc');
  const [selectedYear, setSelectedYear] = useState<YearOption>('All');

  // Dynamic TMDb state
  const [liveMovies, setLiveMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const genres = ['All', 'Action', 'Sci-Fi', 'Drama', 'Thriller', 'Comedy', 'Horror', 'Animation', 'Adventure', 'Mystery', 'Crime', 'Romance', 'Fantasy', 'Western'];
  const years: { label: string; value: YearOption }[] = [
    { label: 'All Years', value: 'All' },
    { label: '2020s (Modern)', value: '2020s' },
    { label: '2010s', value: '2010s' },
    { label: '2000s', value: '2000s' },
    { label: '1990s', value: '1990s' },
    { label: '1980s', value: '1980s' },
    { label: '1970s', value: '1970s' },
    { label: 'Pre-1970 Classics', value: 'classics' },
  ];

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Compute Year Boundaries
  const getYearBoundaries = (era: YearOption) => {
    switch (era) {
      case '2020s': return { yearGte: '2020-01-01', yearLte: '2029-12-31' };
      case '2010s': return { yearGte: '2010-01-01', yearLte: '2019-12-31' };
      case '2000s': return { yearGte: '2000-01-01', yearLte: '2009-12-31' };
      case '1990s': return { yearGte: '1990-01-01', yearLte: '1999-12-31' };
      case '1980s': return { yearGte: '1980-01-01', yearLte: '1989-12-31' };
      case '1970s': return { yearGte: '1970-01-01', yearLte: '1979-12-31' };
      case 'classics': return { yearLte: '1969-12-31' };
      default: return {};
    }
  };

  // Fetch movies from TMDb according to active tab, sort, genre, year or search
  const fetchMovies = useCallback(async (
    tab: TabType,
    query: string,
    genre: string,
    sort: SortOption,
    era: YearOption,
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (tab === 'curated' || tab === 'loved' || tab === 'watchlist') {
      return;
    }

    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let data: { results: Movie[]; totalPages: number };
      if (query.trim()) {
        data = await tmdb.searchMoviesPaged(query, pageNum);
      } else if (sort !== 'popularity.desc' || genre !== 'All' || era !== 'All') {
        const boundaries = getYearBoundaries(era);
        const genreId = genre !== 'All' ? GENRE_NAME_TO_ID[genre] : undefined;
        data = await tmdb.discoverMovies({
          page: pageNum,
          sortBy: sort,
          genreId,
          yearGte: boundaries.yearGte,
          yearLte: boundaries.yearLte,
        });
      } else if (tab === 'trending') {
        data = await tmdb.getTrendingMovies(pageNum);
      } else if (tab === 'popular') {
        data = await tmdb.getPopularMovies(pageNum);
      } else {
        data = await tmdb.getTopRatedMovies(pageNum);
      }

      setTotalPages(data.totalPages);
      setLiveMovies((prev) => (append ? [...prev, ...data.results] : data.results));
      setPage(pageNum);

      // Asynchronously enrich with verified streaming providers and logos
      tmdb.enrichMoviesWithProviders(data.results, 24).then((enriched) => {
        setLiveMovies((prev) => {
          const map = new Map(enriched.map((m) => [String(m.id), m]));
          return prev.map((m) => map.get(String(m.id)) || m);
        });
      });
    } catch (err) {
      console.warn('Failed to fetch movies in ShelfMode', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // When tab, sort, genre, or year changes, reset page and fetch
  useEffect(() => {
    if (activeTab !== 'curated' && activeTab !== 'loved' && activeTab !== 'watchlist') {
      fetchMovies(activeTab, searchQuery, selectedGenre, sortBy, selectedYear, 1, false);
    }
  }, [activeTab, selectedGenre, sortBy, selectedYear, fetchMovies]);

  // Enrich curated movies on mount/tab change
  useEffect(() => {
    if (activeTab === 'curated' && allSeedMovies.length > 0) {
      tmdb.enrichMoviesWithProviders(allSeedMovies, allSeedMovies.length);
    }
  }, [activeTab, allSeedMovies]);

  const executeSearch = (queryToSearch: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    const clean = queryToSearch.trim();
    setSearchedQuery(clean);

    if (clean) {
      if (activeTab === 'curated') {
        setActiveTab('trending');
      }
      fetchMovies(activeTab === 'curated' ? 'trending' : activeTab, clean, selectedGenre, sortBy, selectedYear, 1, false);
    } else {
      clearSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchedQuery('');
    setIsSearchOpen(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (activeTab !== 'loved' && activeTab !== 'watchlist') {
      fetchMovies(activeTab, '', selectedGenre, sortBy, selectedYear, 1, false);
    }
  };

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const clean = val.trim();
      setSearchedQuery(clean);
      if (clean) {
        if (activeTab === 'curated') {
          setActiveTab('trending');
        }
        fetchMovies(activeTab === 'curated' ? 'trending' : activeTab, clean, selectedGenre, sortBy, selectedYear, 1, false);
      } else {
        fetchMovies(activeTab, '', selectedGenre, sortBy, selectedYear, 1, false);
      }
    }, 400);
  };

  // Next page loader
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || isLoading || page >= totalPages) return;
    fetchMovies(activeTab, searchQuery, selectedGenre, sortBy, selectedYear, page + 1, true);
  }, [isLoadingMore, isLoading, page, totalPages, activeTab, searchQuery, selectedGenre, sortBy, selectedYear, fetchMovies]);

  // Infinite Auto-Lazy Loading via IntersectionObserver
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isLoading && page < totalPages) {
          handleLoadMore();
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [page, totalPages, isLoadingMore, isLoading, handleLoadMore]);

  // Determine movies to render
  let baseMovies: Movie[] = [];
  if (searchedQuery.trim() || searchQuery.trim()) {
    baseMovies = liveMovies;
  } else if (activeTab === 'curated') {
    baseMovies = allSeedMovies;
  } else if (activeTab === 'loved') {
    baseMovies = lovedMovies;
  } else if (activeTab === 'watchlist') {
    baseMovies = watchlistMovies;
  } else {
    baseMovies = liveMovies;
  }

  // Client-side filtering & sorting for Curated, Loved, and Watchlist
  const filtered = baseMovies.filter((m) => {
    if (activeTab === 'curated' || activeTab === 'loved' || activeTab === 'watchlist') {
      const matchesQuery =
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesGenre =
        selectedGenre === 'All' ||
        m.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase());

      let matchesYear = true;
      const yr = parseInt(m.release_date?.slice(0, 4) || '0', 10);
      if (selectedYear === '2020s') matchesYear = yr >= 2020;
      else if (selectedYear === '2010s') matchesYear = yr >= 2010 && yr <= 2019;
      else if (selectedYear === '2000s') matchesYear = yr >= 2000 && yr <= 2009;
      else if (selectedYear === '1990s') matchesYear = yr >= 1990 && yr <= 1999;
      else if (selectedYear === '1980s') matchesYear = yr >= 1980 && yr <= 1989;
      else if (selectedYear === '1970s') matchesYear = yr >= 1970 && yr <= 1979;
      else if (selectedYear === 'classics') matchesYear = yr < 1970 && yr > 0;

      return matchesQuery && matchesGenre && matchesYear;
    }

    // For live tabs, API handles search and discover filters
    return true;
  }).sort((a, b) => {
    if (sortBy === 'vote_average.desc') return (b.vote_average || 0) - (a.vote_average || 0);
    if (sortBy === 'primary_release_date.desc') return (b.release_date || '').localeCompare(a.release_date || '');
    if (sortBy === 'primary_release_date.asc') return (a.release_date || '').localeCompare(b.release_date || '');
    if (sortBy === 'title.asc') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 animate-fade-in">
      {/* Top Shelf Navigation Tabs & Live Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 mb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-x-auto max-w-full no-scrollbar">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'trending'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" /> Trending
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'popular'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Popular
          </button>
          <button
            onClick={() => setActiveTab('top_rated')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'top_rated'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Top Rated
          </button>
          <button
            onClick={() => setActiveTab('curated')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'curated'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Curated Vault
          </button>
          <button
            onClick={() => setActiveTab('loved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'loved'
                ? 'bg-red-500 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" /> Loved ({lovedMovies.length})
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'watchlist'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" /> Watchlist ({watchlistMovies.length})
          </button>
        </div>

        {/* Search input with explicit Search button & mobile full-screen support */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch(searchQuery);
          }}
          className="flex items-center gap-1.5 w-full lg:w-auto"
        >
          <div className="relative flex-1 lg:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search actor, director, title..."
              className="w-full pl-9 pr-8 py-2 sm:py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shrink-0 shadow flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Full-Screen Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/98 flex flex-col p-4 sm:hidden animate-fade-in">
          {/* Top Search Bar with Submit & Close */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(searchQuery);
            }}
            className="flex items-center gap-2 pb-3 border-b border-neutral-800"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Type actor (e.g. Jeff Bridges), title..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2.5 bg-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow shrink-0"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-xl border border-neutral-800 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Filter Chips in Mobile Search */}
          <div className="py-2 flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-900">
            <span>
              {isLoading ? 'Searching...' : searchedQuery ? `Results for "${searchedQuery}" (${filtered.length})` : 'Popular actors:'}
            </span>
            {searchQuery && (
              <button onClick={clearSearch} className="text-amber-400 font-semibold text-[11px]">
                Clear
              </button>
            )}
          </div>

          {!searchedQuery && (
            <div className="flex flex-wrap gap-1.5 py-2">
              {['Jeff Bridges', 'Tom Cruise', 'Christopher Nolan', 'Quentin Tarantino', 'Leonardo DiCaprio', 'Denis Villeneuve'].map((actor) => (
                <button
                  key={actor}
                  type="button"
                  onClick={() => {
                    setSearchQuery(actor);
                    executeSearch(actor);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white hover:border-amber-500/50"
                >
                  {actor}
                </button>
              ))}
            </div>
          )}

          {/* Compact Results Grid directly in view between keyboard and top */}
          <div className="flex-1 overflow-y-auto pt-2 space-y-2 pb-6">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                <p className="text-xs text-neutral-400">Searching global cinema database...</p>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filtered.map((movie) => (
                  <div
                    key={`mobile-search-${movie.id}`}
                    onClick={() => {
                      setIsSearchOpen(false);
                      onPlayTrailer(movie);
                    }}
                    className="flex gap-2 p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 items-center cursor-pointer active:scale-98 transition"
                  >
                    {movie.poster_path ? (
                      <img
                        src={movie.poster_path}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded-lg shrink-0 bg-neutral-950"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-neutral-800 rounded-lg flex items-center justify-center text-xs">🎬</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate leading-tight">{movie.title}</p>
                      <p className="text-[10px] text-amber-400 mt-0.5">★ {movie.vote_average.toFixed(1)} • {movie.release_date?.slice(0, 4)}</p>
                      <span className="text-[9px] text-neutral-400 line-clamp-1">{movie.genres?.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchedQuery ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                No movies found for &quot;{searchedQuery}&quot;. Try checking the spelling.
              </div>
            ) : null}
          </div>

          {/* Close button at bottom */}
          <div className="pt-2 border-t border-neutral-900">
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold"
            >
              Done / View in Grid
            </button>
          </div>
        </div>
      )}

      {/* Active Search Status Banner on Main Grid */}
      {searchedQuery && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-amber-400" /> Searched: &quot;{searchedQuery}&quot;
            </span>
            <span className="text-neutral-400">({filtered.length} movies found)</span>
          </div>
          <button
            onClick={clearSearch}
            className="text-neutral-400 hover:text-white flex items-center gap-1 font-medium underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Controls Bar: Sort Dropdown & Era Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1 font-semibold text-neutral-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" /> Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="popularity.desc">🔥 Most Popular</option>
            <option value="vote_average.desc">⭐ Highest Rating</option>
            <option value="primary_release_date.desc">📅 Year: Newest First</option>
            <option value="primary_release_date.asc">🎞️ Year: Oldest First</option>
            <option value="title.asc">🔤 Title: A to Z</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1 font-semibold text-neutral-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Era / Year:
          </span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value as YearOption)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
          >
            {years.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 mb-3">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`text-xs px-3 py-1 rounded-full shrink-0 transition font-medium ${
              selectedGenre === genre
                ? 'bg-neutral-200 text-neutral-900 font-bold'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Movies Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm text-neutral-400 font-medium">Browsing cinema catalog...</p>
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
            {filtered.map((movie) => (
              <MovieCard
                key={`${movie.id}-${movie.title}`}
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

          {/* Sentinel Element for Infinite Auto-Lazy Loading */}
          {activeTab !== 'curated' && activeTab !== 'loved' && activeTab !== 'watchlist' && page < totalPages && (
            <div
              ref={observerTargetRef}
              className="mt-8 py-8 flex flex-col items-center justify-center min-h-[60px]"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-neutral-400 text-xs font-semibold">
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Lazy loading more movies (Page {page + 1})...</span>
                </div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="text-xs text-neutral-500 hover:text-neutral-300 font-medium py-2 px-4 rounded-xl bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800 transition"
                >
                  Scroll down to auto-load more • or tap here
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="p-16 text-center bg-neutral-950 border border-neutral-800 rounded-2xl">
          <p className="text-base text-neutral-300 font-semibold mb-1">No movies found</p>
          <p className="text-xs text-neutral-500">
            {activeTab === 'loved'
              ? 'Click the heart icon on any movie to add it to your loved collection.'
              : activeTab === 'watchlist'
              ? 'Bookmark movies to save them to your watchlist for later.'
              : 'Try a different search query or select another genre or era.'}
          </p>
        </div>
      )}
    </div>
  );
};
