'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, MessageSquare, Compass, Film, Search, X } from 'lucide-react';
import { AppMode } from '@/lib/tmdb/types';

interface MobileLayoutProps {
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onClearSearch?: () => void;
  onOpenSearch?: () => void;
  onOpenFinder?: () => void;
  isFinderOpen?: boolean;
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  appMode,
  onSelectAppMode,
  searchQuery = '',
  onSearchChange,
  onClearSearch,
  onOpenSearch,
  onOpenFinder,
  isFinderOpen = false,
  children,
}) => {
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollTopRef = useRef(0);
  const ignoreScrollUntilRef = useRef(0);

  // Hide bottom nav on scroll down inside nested scrollers — only when there's real overflow
  useEffect(() => {
    const onScroll = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const overflow = t.scrollHeight - t.clientHeight;
      if (overflow < 160) return;

      const now = Date.now();
      if (now < ignoreScrollUntilRef.current) return;

      const y = t.scrollTop;
      const delta = y - lastScrollTopRef.current;
      lastScrollTopRef.current = y;

      if (y < 24) {
        setNavVisible((v) => {
          if (!v) ignoreScrollUntilRef.current = now + 280;
          return true;
        });
        return;
      }
      if (delta > 18) {
        setNavVisible((v) => {
          if (v) ignoreScrollUntilRef.current = now + 280;
          return false;
        });
      } else if (delta < -18) {
        setNavVisible((v) => {
          if (!v) ignoreScrollUntilRef.current = now + 280;
          return true;
        });
      }
    };
    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, []);

  // Finder open → treat as selected tab (show nav)
  useEffect(() => {
    if (isFinderOpen) setNavVisible(true);
  }, [isFinderOpen]);

  const tabClass = (active: boolean) =>
    `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
      active ? 'text-amber-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'
    }`;

  return (
    <div className="min-h-screen pb-20 flex flex-col bg-neutral-950 text-white">
      {/* Mobile Top Bar */}
      <div className="px-3 py-2 border-b border-neutral-900 bg-neutral-950/95 sticky top-0 z-30 flex items-center gap-2">
        {appMode === 'shelf' && !isFinderOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              (e.target as HTMLFormElement).querySelector('input')?.blur();
            }}
            className="relative flex-1"
          >
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => onOpenSearch?.()}
              onClick={() => onOpenSearch?.()}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search actor, director, title..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-neutral-400 hover:text-white bg-neutral-800"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>
        ) : (
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 flex-1">
            <Film className="w-3.5 h-3.5" />
            {isFinderOpen && '20Q Finder'}
            {!isFinderOpen && appMode === 'twenty_questions' && 'Matchmaker'}
            {!isFinderOpen && appMode === 'chat' && 'Cinephile AI Chat'}
            {!isFinderOpen && appMode === 'shelf' && 'Movie Vault'}
          </span>
        )}
      </div>

      {/* Main Content View */}
      <main className="flex-1 w-full">{children}</main>

      {/* Bottom nav — above 20Q overlay; hides while scrolling down */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[80] bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-xl px-2 py-2 flex items-center justify-around shadow-2xl safe-area-pb transition-transform duration-300 ease-out ${
          navVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectAppMode('shelf')}
          className={tabClass(appMode === 'shelf' && !isFinderOpen)}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Vault</span>
        </button>

        <button
          type="button"
          onClick={onOpenFinder}
          className={tabClass(isFinderOpen)}
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px]">20Q Finder</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectAppMode('chat')}
          className={tabClass(appMode === 'chat' && !isFinderOpen)}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Ask AI</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectAppMode('twenty_questions')}
          className={tabClass(appMode === 'twenty_questions' && !isFinderOpen)}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px]">Matchmaker</span>
        </button>
      </div>
    </div>
  );
};
