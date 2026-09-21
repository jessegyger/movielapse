'use client';

import React from 'react';
import { Sparkles, Clapperboard, ShieldCheck, Film } from 'lucide-react';

interface DesktopLayoutProps {
  children: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden">
      {/* Ambient Theater Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Cinematic Theater Top Banner */}
      <div className="border-b border-neutral-800/60 bg-neutral-950/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
              Desktop Cinema Cockpit
            </span>
            <span className="hidden sm:inline text-neutral-600">•</span>
            <span className="hidden sm:flex items-center gap-1 text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Private In-Browser AI
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-neutral-500">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono">ESC</kbd> to dismiss trailer</span>
          </div>
        </div>
      </div>

      {/* Main Theater Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-4">{children}</main>
    </div>
  );
};
