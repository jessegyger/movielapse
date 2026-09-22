'use client';

import React from 'react';
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
  children,
}) => {
  return (
    <div className="min-h-screen pb-20 flex flex-col bg-neutral-950 text-white">
      {/* Mobile Top Bar */}
      <div className="px-3 py-2 border-b border-neutral-900 bg-neutral-950/95 sticky top-0 z-30 flex items-center gap-2">
        {appMode === 'shelf' ? (
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
            {appMode === 'twenty_questions' && 'Matchmaker'}
            {appMode === 'chat' && 'Cinephile AI Chat'}
          </span>
        )}
        {/* Dedicated 20Q Movie Finder Quick Launcher Button */}
        <button
          onClick={onOpenFinder}
          title="20Q Movie Finder"
          className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-neutral-900 px-2.5 py-1.5 rounded-xl border border-amber-500/40 shrink-0 shadow active:scale-95 transition"
        >
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-extrabold whitespace-nowrap">20Q Finder</span>
        </button>
      </div>

      {/* Main Content View */}
      <main className="flex-1 w-full">{children}</main>

      {/* Native App-Style Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-xl px-2 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
        <button
          onClick={() => onSelectAppMode('shelf')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            appMode === 'shelf'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Vault</span>
        </button>

        {/* 20Q Movie Finder Tab in Mobile Bottom Bar */}
        <button
          onClick={onOpenFinder}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-amber-400/90 hover:text-amber-300 transition"
        >
          <Film className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-300">20Q Finder</span>
        </button>

        <button
          onClick={() => onSelectAppMode('chat')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            appMode === 'chat'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Ask AI</span>
        </button>

        <button
          onClick={() => onSelectAppMode('twenty_questions')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            appMode === 'twenty_questions'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px]">Matchmaker</span>
        </button>
      </div>
    </div>
  );
};
