'use client';

import React from 'react';
import { Sparkles, Clapperboard, ShieldCheck, Film } from 'lucide-react';

interface DesktopLayoutProps {
  children: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-neutral-950 text-white relative overflow-hidden">
      {/* Ambient Theater Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Main Theater Workspace — header is sticky h-16 above this */}
      <main className="max-w-7xl mx-auto px-6 py-3">{children}</main>
    </div>
  );
};
