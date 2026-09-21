'use client';

import React from 'react';
import { Film, Sparkles, Heart, Settings, Smartphone, Tablet, Monitor, SlidersHorizontal } from 'lucide-react';
import { AppMode, DeviceMode, WebLLMProgress } from '@/lib/tmdb/types';

interface HeaderProps {
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
  deviceMode: DeviceMode;
  onSelectDeviceMode: (mode: DeviceMode) => void;
  webllmProgress: WebLLMProgress;
  lovedCount: number;
  onOpenTasteProfiler: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  onSelectAppMode,
  deviceMode,
  onSelectDeviceMode,
  webllmProgress,
  lovedCount,
  onOpenTasteProfiler,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectAppMode('shelf')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-[1px] shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[11px] flex items-center justify-center text-amber-400">
              <Film className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-white">Movie<span className="text-amber-400">lapse</span></span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Local AI
              </span>
            </div>
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
            20 Questions
          </button>
        </nav>

        {/* Right Tools: Taste, Device Switcher, Engine Pill, Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Taste profile button */}
          <button
            onClick={onOpenTasteProfiler}
            title="Open Taste Profiler to rate more movies"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-red-500/40 text-xs font-medium text-neutral-300 hover:text-white transition group"
          >
            <Heart className="w-3.5 h-3.5 text-red-400 fill-current group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Taste Profile</span>
            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-[11px] text-amber-400 font-bold">
              {lovedCount}
            </span>
          </button>

          {/* Device Layout Switcher Dropdown / Pills */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
            <button
              onClick={() => onSelectDeviceMode('auto')}
              title="Responsive auto layout"
              className={`px-2 py-1 rounded-lg transition ${
                deviceMode === 'auto' ? 'bg-neutral-800 text-white font-bold' : 'hover:text-white'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => onSelectDeviceMode('mobile')}
              title="Preview Mobile App Layout"
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'mobile' ? 'bg-amber-500 text-neutral-950 font-bold' : 'hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectDeviceMode('tablet')}
              title="Preview Tablet Dual-Pane Layout"
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'tablet' ? 'bg-amber-500 text-neutral-950 font-bold' : 'hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectDeviceMode('desktop')}
              title="Preview Desktop Theater Layout"
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'desktop' ? 'bg-amber-500 text-neutral-950 font-bold' : 'hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

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
