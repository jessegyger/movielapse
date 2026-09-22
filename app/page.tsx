'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTasteStore } from '@/lib/store/tasteStore';
import { tmdb } from '@/lib/tmdb/client';
import { webllmEngine } from '@/lib/webllm/engine';
import { Movie, WebLLMProgress, AppMode } from '@/lib/tmdb/types';
import { backIfLayer, ensureRootHistory, isNavState, pushNavLayer } from '@/lib/navHistory';

// Components
import { Header } from '@/components/common/Header';
import { SettingsModal } from '@/components/common/SettingsModal';
import { TrailerModal } from '@/components/movie/TrailerModal';
import { MovieDetailModal } from '@/components/movie/MovieDetailModal';
import { TwentyQuestionsMode } from '@/components/modes/TwentyQuestionsMode';
import { ChatMode } from '@/components/modes/ChatMode';
import { ShelfMode } from '@/components/modes/ShelfMode';
import { MovieFinderWizard } from '@/components/modes/MovieFinderWizard';

// Layouts
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TabletLayout } from '@/components/layout/TabletLayout';
import { DesktopLayout } from '@/components/layout/DesktopLayout';

export default function Home() {
  const store = useTasteStore();
  const [selectedTrailerMovie, setSelectedTrailerMovie] = useState<Movie | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [selectedDetailMovie, setSelectedDetailMovie] = useState<Movie | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [seedMovies, setSeedMovies] = useState<Movie[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isFinderOpen, setIsFinderOpen] = useState(false);

  const [webllmProgress, setWebllmProgress] = useState<WebLLMProgress>({
    progress: 1,
    text: 'Instant Engine Active',
    isLoaded: true,
    isLoading: false,
    usingFallback: true,
  });

  const [detectedLayout, setDetectedLayout] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  const navRef = useRef({
    trailer: false,
    detail: false,
    finder: false,
    settings: false,
    search: false,
    mode: 'shelf' as AppMode,
  });
  navRef.current = {
    trailer: isTrailerOpen,
    detail: isDetailOpen,
    finder: isFinderOpen,
    settings: isSettingsOpen,
    search: isMobileSearchOpen,
    mode: store.appMode,
  };

  const closeTrailer = useCallback(() => {
    setIsTrailerOpen(false);
    setSelectedTrailerMovie(null);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedDetailMovie(null);
  }, []);

  const closeFinder = useCallback(() => setIsFinderOpen(false), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const closeSearch = useCallback(() => {
    setIsMobileSearchOpen(false);
    setSearchQuery('');
  }, []);

  const handleSelectAppMode = useCallback(
    (mode: AppMode) => {
      if (isFinderOpen) {
        if (!backIfLayer('finder')) closeFinder();
      }
      if (mode === store.appMode) return;

      if (mode === 'shelf') {
        if (typeof window !== 'undefined' && isNavState(window.history.state) && window.history.state.layer === 'mode') {
          window.history.back();
          return;
        }
        store.setAppMode('shelf');
        return;
      }

      if (typeof window !== 'undefined' && isNavState(window.history.state) && window.history.state.layer === 'mode') {
        window.history.replaceState({ ml: true, layer: 'mode', mode }, '');
      } else {
        pushNavLayer('mode', { mode });
      }
      store.setAppMode(mode);
    },
    [store, isFinderOpen, closeFinder]
  );

  const handlePlayTrailer = async (movie: Movie) => {
    setSelectedTrailerMovie(movie);
    setIsTrailerOpen(true);
    pushNavLayer('trailer');

    if (!movie.trailer_key && movie.id) {
      try {
        const full = await tmdb.getMovieDetails(movie.id);
        if (full && full.trailer_key) {
          setSelectedTrailerMovie(full);
        }
      } catch (e) {
        console.warn('Failed to load dynamic trailer', e);
      }
    }
  };

  const handleSelectMovie = async (movie: Movie) => {
    setSelectedDetailMovie(movie);
    setIsDetailOpen(true);
    pushNavLayer('detail');

    if (movie.id) {
      try {
        const full = await tmdb.getMovieDetails(movie.id);
        if (full) {
          setSelectedDetailMovie(full);
        }
      } catch (e) {
        console.warn('Failed to load rich movie details', e);
      }
    }
  };

  const openFinder = () => {
    setIsFinderOpen(true);
    pushNavLayer('finder');
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
    pushNavLayer('settings');
  };

  const openSearch = () => {
    if (!isMobileSearchOpen) {
      setIsMobileSearchOpen(true);
      pushNavLayer('search');
    }
  };

  useEffect(() => {
    ensureRootHistory();

    const onPopState = () => {
      const n = navRef.current;
      if (n.trailer) {
        closeTrailer();
        return;
      }
      if (n.detail) {
        closeDetail();
        return;
      }
      if (n.finder) {
        closeFinder();
        return;
      }
      if (n.settings) {
        closeSettings();
        return;
      }
      if (n.search) {
        closeSearch();
        return;
      }
      if (n.mode !== 'shelf') {
        store.setAppMode('shelf');
        return;
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [closeTrailer, closeDetail, closeFinder, closeSettings, closeSearch, store]);

  useEffect(() => {
    const seeds = tmdb.getSeedMovies();
    setSeedMovies(seeds);
    tmdb.enrichMoviesWithProviders(seeds, seeds.length).then((enriched) => {
      setSeedMovies(enriched);
    });

    const savedGemini = localStorage.getItem('movielapse_gemini_api_key') || '';
    if (savedGemini) {
      setGeminiApiKey(savedGemini);
      webllmEngine.setGeminiApiKey(savedGemini);
    }

    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setDetectedLayout('mobile');
      else if (w < 1024) setDetectedLayout('tablet');
      else setDetectedLayout('desktop');
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    webllmEngine.setProgressCallback((p) => {
      setWebllmProgress(p);
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveGemini = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('movielapse_gemini_api_key', key);
    webllmEngine.setGeminiApiKey(key);
  };

  const activeEffectiveLayout: 'mobile' | 'tablet' | 'desktop' =
    store.deviceMode === 'auto' ? detectedLayout : store.deviceMode;

  const renderModeContent = () => {
    switch (store.appMode) {
      case 'twenty_questions':
        return (
          <TwentyQuestionsMode
            onPlayTrailer={handlePlayTrailer}
            onSelectMovie={handleSelectMovie}
            onLove={store.markLoved}
            onDislike={store.markDisliked}
            onWatchlist={store.markWatchlist}
            onWatched={store.toggleWatched}
            lovedMovies={store.loved}
            dislikedMovies={store.disliked}
            watchlistMovies={store.watchlist}
            watchedMovies={store.watched}
            tasteSummaryPrompt={store.getTasteSummaryPrompt()}
          />
        );
      case 'chat':
        return (
          <ChatMode
            onPlayTrailer={handlePlayTrailer}
            onSelectMovie={handleSelectMovie}
            onLove={store.markLoved}
            onDislike={store.markDisliked}
            onWatchlist={store.markWatchlist}
            onWatched={store.toggleWatched}
            lovedMovies={store.loved}
            dislikedMovies={store.disliked}
            watchlistMovies={store.watchlist}
            watchedMovies={store.watched}
            tasteSummaryPrompt={store.getTasteSummaryPrompt()}
          />
        );
      case 'shelf':
      default:
        return (
          <ShelfMode
            onPlayTrailer={handlePlayTrailer}
            onSelectMovie={handleSelectMovie}
            onLove={store.markLoved}
            onDislike={store.markDisliked}
            onWatchlist={store.markWatchlist}
            onWatched={store.toggleWatched}
            lovedMovies={store.loved}
            dislikedMovies={store.disliked}
            watchlistMovies={store.watchlist}
            watchedMovies={store.watched}
            allSeedMovies={seedMovies}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            isSearchOpen={isMobileSearchOpen}
            onOpenSearch={openSearch}
            onCloseSearch={() => {
              if (!backIfLayer('search')) closeSearch();
            }}
            onOpenFinder={openFinder}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950">
      <Header
        appMode={store.appMode}
        onSelectAppMode={handleSelectAppMode}
        deviceMode={store.deviceMode}
        onSelectDeviceMode={store.setDeviceMode}
        webllmProgress={webllmProgress}
        onOpenSettings={openSettings}
      />

      {activeEffectiveLayout === 'mobile' && (
        <MobileLayout
          appMode={store.appMode}
          onSelectAppMode={handleSelectAppMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onOpenSearch={openSearch}
          onOpenFinder={openFinder}
          isFinderOpen={isFinderOpen}
        >
          {renderModeContent()}
        </MobileLayout>
      )}

      {activeEffectiveLayout === 'tablet' && (
        <TabletLayout
          appMode={store.appMode}
          onSelectAppMode={handleSelectAppMode}
          seedMovies={seedMovies}
          lovedMovies={store.loved}
          dislikedMovies={store.disliked}
          watchlistMovies={store.watchlist}
          watchedMovies={store.watched}
          onPlayTrailer={handlePlayTrailer}
          onSelectMovie={handleSelectMovie}
          onLove={store.markLoved}
          onDislike={store.markDisliked}
          onWatchlist={store.markWatchlist}
          onWatched={store.toggleWatched}
        >
          {renderModeContent()}
        </TabletLayout>
      )}

      {activeEffectiveLayout === 'desktop' && (
        <DesktopLayout>
          {renderModeContent()}
        </DesktopLayout>
      )}

      <TrailerModal
        movie={selectedTrailerMovie}
        isOpen={isTrailerOpen}
        onClose={() => {
          if (!backIfLayer('trailer')) closeTrailer();
        }}
      />

      <MovieDetailModal
        movie={selectedDetailMovie}
        isOpen={isDetailOpen}
        onClose={() => {
          if (!backIfLayer('detail')) closeDetail();
        }}
        onPlayTrailer={handlePlayTrailer}
        onLove={store.markLoved}
        onDislike={store.markDisliked}
        onWatchlist={store.markWatchlist}
        onWatched={store.toggleWatched}
        isLoved={selectedDetailMovie ? store.loved.some((m) => String(m.id) === String(selectedDetailMovie.id)) : false}
        isDisliked={selectedDetailMovie ? store.disliked.some((m) => String(m.id) === String(selectedDetailMovie.id)) : false}
        isWatchlist={selectedDetailMovie ? store.watchlist.some((m) => String(m.id) === String(selectedDetailMovie.id)) : false}
        isWatched={selectedDetailMovie ? store.watched.some((m) => String(m.id) === String(selectedDetailMovie.id)) : false}
      />

      <MovieFinderWizard
        isOpen={isFinderOpen}
        onClose={() => {
          if (!backIfLayer('finder')) closeFinder();
        }}
        onSelectMovie={handleSelectMovie}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          if (!backIfLayer('settings')) closeSettings();
        }}
        tmdbApiKey={store.tmdbApiKey}
        onSaveTmdbKey={store.setTmdbApiKey}
        geminiApiKey={geminiApiKey}
        onSaveGeminiKey={handleSaveGemini}
        onClearTaste={store.clearAll}
        currentModel={webllmEngine.getCurrentModel()}
        onSelectModel={(modelId) => {
          webllmEngine.initEngine(modelId);
          if (!backIfLayer('settings')) closeSettings();
        }}
      />
    </div>
  );
}
