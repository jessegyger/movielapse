'use client';

import React from 'react';
import { Film, Sparkles, Settings } from 'lucide-react';
import { AppMode, DeviceMode, WebLLMProgress } from '@/lib/tmdb/types';

interface HeaderProps {
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
  deviceMode: DeviceMode;
  onSelectDeviceMode: (mode: DeviceMode) => void;
  webllmProgress: WebLLMProgress;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  onSelectAppMode,
  webllmProgress,
  onOpenSettings,
}) => {
  return (
    <header className="relative md:sticky md:top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectAppMode('shelf')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-[1px] shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[11px] flex items-center justify-center text-amber-400">
              <Film className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-white">Movie<span className="text-amber-400">lapse</span></span>
          </div>
        </div>

        {/* Center Mode Switcher (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs font-semibold">
          <button
            onClick={() => onSelectAppMode('shelf')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              appMode === 'shelf'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Movie Vault
          </button>
          <button
            onClick={() => onSelectAppMode('chat')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              appMode === 'chat'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ask Anything
          </button>
          <button
            onClick={() => onSelectAppMode('twenty_questions')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              appMode === 'twenty_questions'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Matchmaker
          </button>
        </nav>

        {/* Right Tools: Engine Pill, Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Engine Status Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium ${
              webllmProgress.isLoaded
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                webllmProgress.isLoaded
                  ? 'bg-emerald-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>
              {webllmProgress.isLoaded
                ? (webllmProgress.usingFallback ? 'Instant Engine' : 'WebGPU AI Active')
                : `AI Loading ${Math.round((webllmProgress.progress || 0) * 100)}%`}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
