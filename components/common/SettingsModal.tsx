'use client';

import React, { useState } from 'react';
import { X, Key, Trash2, Cpu, ExternalLink, Sparkles } from 'lucide-react';
import { DEFAULT_MODEL, HIGHER_QUALITY_MODEL } from '@/lib/webllm/engine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbApiKey: string;
  onSaveTmdbKey: (key: string) => void;
  geminiApiKey?: string;
  onSaveGeminiKey?: (key: string) => void;
  onClearTaste: () => void;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tmdbApiKey,
  onSaveTmdbKey,
  geminiApiKey = '',
  onSaveGeminiKey,
  onClearTaste,
  currentModel,
  onSelectModel,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(tmdbApiKey);
  const [geminiKeyInput, setGeminiKeyInput] = useState(geminiApiKey);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [geminiSuccess, setGeminiSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveTmdbKey = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTmdbKey(apiKeyInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveGeminiKey) {
      onSaveGeminiKey(geminiKeyInput.trim());
      setGeminiSuccess(true);
      setTimeout(() => setGeminiSuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <h3 className="text-base font-bold text-white">MovieLapse Settings</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 hover:bg-neutral-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Free Google Gemini Cloud AI Option (Ideal for 2015 Mac & Phones) */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" /> Free Google Gemini AI Key (Optional)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-normal lowercase"
              >
                get free key <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <p className="text-xs text-neutral-400 mb-2 leading-relaxed">
              Google provides Gemini 2.0 Flash for **100% FREE** via Google AI Studio. Perfect if you are on an older computer (like 2015 Intel Mac) or mobile device, with zero download wait!
            </p>
            <form onSubmit={handleSaveGeminiKey} className="flex gap-2">
              <input
                type="text"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="Paste AI Studio Gemini Key..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition"
              >
                {geminiSuccess ? 'Saved!' : 'Save'}
              </button>
            </form>
          </div>

          {/* TMDb API Key Option */}
          <div className="pt-4 border-t border-neutral-800">
            <label className="flex items-center justify-between text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-neutral-400" /> Free TMDb API Key (Optional)
              </span>
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-neutral-400 hover:underline flex items-center gap-1 font-normal lowercase"
              >
                get free key <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <p className="text-xs text-neutral-400 mb-2 leading-relaxed">
              MovieLapse comes bundled with 50+ films offline. Adding your free TMDb key lets you search all 800,000+ movies on Earth.
            </p>
            <form onSubmit={handleSaveTmdbKey} className="flex gap-2">
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Paste TMDb API Key..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition"
              >
                {saveSuccess ? 'Saved!' : 'Save'}
              </button>
            </form>
          </div>

          {/* Local WebGPU Engine */}
          <div className="pt-4 border-t border-neutral-800">
            <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              <Cpu className="w-3.5 h-3.5 text-amber-400" /> WebGPU Local AI Engine
            </label>
            <div className="space-y-2 text-xs">
              <div
                onClick={() => onSelectModel(DEFAULT_MODEL)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  currentModel === DEFAULT_MODEL
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>Llama-3.2-1B (WebGPU)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    M1/M2/M3/M4 &amp; Modern PCs
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Runs 100% in browser cache. (Note: on older 2015 Intel Macs, our Instant Engine or Gemini runs automatically).
                </p>
              </div>
            </div>
          </div>

          {/* Reset taste data */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-white">Reset Saved Taste Profile</h4>
              <p className="text-[11px] text-neutral-500">Clears all liked, watched, and watchlist movies.</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Clear your entire movie taste profile?')) {
                  onClearTaste();
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
