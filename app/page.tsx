'use client';

import React, { useState, useEffect } from 'react';
import { useTasteStore } from '@/lib/store/tasteStore';
import { tmdb } from '@/lib/tmdb/client';
import { webllmEngine } from '@/lib/webllm/engine';
import { Movie, WebLLMProgress, DeviceMode } from '@/lib/tmdb/types';

// Components
import { Header } from '@/components/common/Header';
import { SettingsModal } from '@/components/common/SettingsModal';
import { TasteProfilerModal } from '@/components/onboarding/TasteProfilerModal';
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
  const [isTasteProfilerOpen, setIsTasteProfilerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [seedMovies, setSeedMovies] = useState<Movie[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isFinderOpen, setIsFinderOpen] = useState(false);

  // WebLLM Loading Progress State (starts in instant engine mode — local AI download is opt-in)
  const [webllmProgress, setWebllmProgress] = useState<WebLLMProgress>({
    progress: 1,
    text: 'Instant Engine Active',
    isLoaded: true,
    isLoading: false,
    usingFallback: true,
  });

  // Responsive device detector
  const [detectedLayout, setDetectedLayout] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    // Load seeds and enrich with live regional providers
    const seeds = tmdb.getSeedMovies();
    setSeedMovies(seeds);
    tmdb.enrichMoviesWithProviders(seeds, seeds.length).then((enriched) => {
      setSeedMovies(enriched);
    });

    // Restore Gemini Key if saved
    const savedGemini = localStorage.getItem('movielapse_gemini_api_key') || '';
    if (savedGemini) {
      setGeminiApiKey(savedGemini);
      webllmEngine.setGeminiApiKey(savedGemini);
    }

    // Responsive screen detection
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setDetectedLayout('mobile');
      else if (w < 1024) setDetectedLayout('tablet');
      else setDetectedLayout('desktop');
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Listen to WebLLM Progress
    webllmEngine.setProgressCallback((p) => {
      setWebllmProgress(p);
    });

    // Start with Instant Cinephile Engine — WebLLM download is opt-in via Settings
    webllmEngine.enableFallback('Instant Engine Active (Zero Wait)');

    // User lands directly on the Movie Vault (Cine-Shelf)

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSaveGemini = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('movielapse_gemini_api_key', key);
    webllmEngine.setGeminiApiKey(key);
  };

  const handlePlayTrailer = async (movie: Movie) => {
    setSelectedTrailerMovie(movie);
    setIsTrailerOpen(true);

    // If movie doesn't have a trailer key or needs full video key resolution, fetch live
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

    // Fetch full rich movie details (director, full cast, keywords, box office, backdrop)
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

  const activeEffectiveLayout: 'mobile' | 'tablet' | 'desktop' =
    store.deviceMode === 'auto' ? detectedLayout : store.deviceMode;

  const ratedCount =
    store.watched.length +
    store.loved.length +
    store.okay.length +
    store.disliked.length +
    store.watchlist.length;

  // Track all touched movie IDs so Taste Profiler never repeats movies
  const ratedIds = [
    ...store.watched.map((m) => m.id),
    ...store.loved.map((m) => m.id),
    ...store.okay.map((m) => m.id),
    ...store.disliked.map((m) => m.id),
    ...store.watchlist.map((m) => m.id),
    ...store.skippedIds,
    ...store.cantRememberIds,
  ];

  // Render the current active mode content
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
            onOpenSearch={() => setIsMobileSearchOpen(true)}
            onCloseSearch={() => setIsMobileSearchOpen(false)}
            onOpenFinder={() => setIsFinderOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950">
      {/* Top Universal App Header */}
      <Header
        appMode={store.appMode}
        onSelectAppMode={store.setAppMode}
        deviceMode={store.deviceMode}
        onSelectDeviceMode={store.setDeviceMode}
        webllmProgress={webllmProgress}
        lovedCount={store.loved.length}
        onOpenTasteProfiler={() => setIsTasteProfilerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Render Device-Specific Layout */}
      {activeEffectiveLayout === 'mobile' && (
        <MobileLayout
          appMode={store.appMode}
          onSelectAppMode={store.setAppMode}
          lovedCount={store.loved.length}
          onOpenTasteProfiler={() => setIsTasteProfilerOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onOpenSearch={() => setIsMobileSearchOpen(true)}
        >
          {renderModeContent()}
        </MobileLayout>
      )}

      {activeEffectiveLayout === 'tablet' && (
        <TabletLayout
          appMode={store.appMode}
          onSelectAppMode={store.setAppMode}
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

      {/* Trailer Player Overlay Modal */}
      <TrailerModal
        movie={selectedTrailerMovie}
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
      />

      {/* Full Movie Details Modal */}
      <MovieDetailModal
        movie={selectedDetailMovie}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
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

      {/* Interactive Taste Profiler Onboarding */}
      <TasteProfilerModal
        isOpen={isTasteProfilerOpen}
        onClose={() => setIsTasteProfilerOpen(false)}
        movies={seedMovies}
        ratedIds={ratedIds}
        webllmProgress={webllmProgress}
        onWatched={store.markWatched}
        onLove={store.markLoved}
        onOkay={store.markOkay}
        onDislike={store.markDisliked}
        onWatchlist={store.markWatchlist}
        onCantRemember={store.markCantRemember}
        onSkip={store.markSkipped}
        ratedCount={ratedCount}
        onInstantReady={() => webllmEngine.enableFallback()}
        onRetryDownload={() => webllmEngine.initEngine()}
      />

      {/* 20Q Movie Finder Wizard */}
      <MovieFinderWizard
        isOpen={isFinderOpen}
        onClose={() => setIsFinderOpen(false)}
        onSelectMovie={handleSelectMovie}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tmdbApiKey={store.tmdbApiKey}
        onSaveTmdbKey={store.setTmdbApiKey}
        geminiApiKey={geminiApiKey}
        onSaveGeminiKey={handleSaveGemini}
        onClearTaste={store.clearAll}
        currentModel={webllmEngine.getCurrentModel()}
        onSelectModel={(modelId) => {
          webllmEngine.initEngine(modelId);
          setIsSettingsOpen(false);
        }}
      />
    </div>
  );
}
