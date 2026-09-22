'use client';

import React from 'react';
import { HelpCircle, MessageSquare, Compass, Heart, Film } from 'lucide-react';
import { AppMode, Movie } from '@/lib/tmdb/types';

interface MobileLayoutProps {
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
  lovedCount: number;
  onOpenTasteProfiler: () => void;
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  appMode,
  onSelectAppMode,
  lovedCount,
  onOpenTasteProfiler,
  children,
}) => {
  return (
    <div className="min-h-screen pb-20 flex flex-col bg-neutral-950 text-white">
      {/* Mobile Top Bar */}
      <div className="px-4 py-3 border-b border-neutral-900 bg-neutral-950/95 sticky top-16 z-30 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5" />
          {appMode === 'twenty_questions' && 'Matchmaker (6 Qs)'}
          {appMode === 'chat' && 'Cinephile AI Chat'}
          {appMode === 'shelf' && 'Cine-Vault'}
        </span>
        <button
          onClick={onOpenTasteProfiler}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800"
        >
          <Heart className="w-3 h-3 text-red-400 fill-current" />
          <span>{lovedCount} rated</span>
        </button>
      </div>

      {/* Main Content View */}
      <main className="flex-1 w-full">{children}</main>

      {/* Native App-Style Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-xl px-2 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
        <button
          onClick={() => onSelectAppMode('shelf')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            appMode === 'shelf'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Vault</span>
        </button>

        <button
          onClick={() => onSelectAppMode('chat')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
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
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            appMode === 'twenty_questions'
              ? 'text-amber-400 font-bold'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px]">Matchmaker</span>
        </button>

        <button
          onClick={onOpenTasteProfiler}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-neutral-500 hover:text-neutral-300 transition"
        >
          <Heart className="w-5 h-5 text-red-400" />
          <span className="text-[10px]">Taste</span>
        </button>
      </div>
    </div>
  );
};
