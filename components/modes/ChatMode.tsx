'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Film, User, Bot } from 'lucide-react';
import { Movie } from '@/lib/tmdb/types';
import { MovieCard } from '../movie/MovieCard';
import { webllmEngine, ChatMessage } from '@/lib/webllm/engine';

interface ChatModeProps {
  onPlayTrailer: (movie: Movie) => void;
  onSelectMovie?: (movie: Movie) => void;
  onLove: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatchlist: (movie: Movie) => void;
  lovedMovies: Movie[];
  dislikedMovies: Movie[];
  watchlistMovies: Movie[];
  tasteSummaryPrompt: string;
}

const INSPIRATION_CHIPS = [
  "Rainy neon cyberpunk like Blade Runner",
  "Movies like Whiplash but about culinary arts",
  "90s psychological thriller with a crazy twist",
  "Cozy autumnal indie comedy under 100 mins",
  "Tense high-stakes space survival like Interstellar",
];

export const ChatMode: React.FC<ChatModeProps> = ({
  onPlayTrailer,
  onSelectMovie,
  onLove,
  onDislike,
  onWatchlist,
  lovedMovies,
  dislikedMovies,
  watchlistMovies,
  tasteSummaryPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Welcome to MovieLapse. I'm your local AI film sommelier. Ask me anything—obscure cult gems, mood-specific double features, tone pairings, or describe a plot you barely remember!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Always keep focus in the text box
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (userPrompt: string) => {
    const textToSend = userPrompt || input;
    if (!textToSend.trim() || isGenerating) return;

    const userMessage: ChatMessage = { role: 'user', content: textToSend };
    const assistantPlaceholder: ChatMessage = { role: 'assistant', content: '' };

    setMessages([...messages, userMessage, assistantPlaceholder]);
    setInput('');
    setIsGenerating(true);
    setTimeout(() => inputRef.current?.focus(), 10);

    let streamText = '';
    const onToken = (token: string) => {
      streamText += token;
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: streamText,
          };
        }
        return copy;
      });
    };

    try {
      const response = await webllmEngine.chat(
        [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        tasteSummaryPrompt,
        onToken
      );

      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: response.text,
            recommendedMovies: response.recommendedMovies,
          };
        }
        return copy;
      });
    } catch (err) {
      console.error('Chat generation error', err);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: "I ran into a temporary hiccup. Try asking about a specific vibe, plot, or director!",
          };
        }
        return copy;
      });
    } finally {
      setIsGenerating(false);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[500px] animate-fade-in px-3 sm:px-4">
      {/* Quick Inspiration Chips */}
      <div className="py-2 overflow-x-auto no-scrollbar flex items-center gap-2 mb-2">
        <span className="text-xs text-neutral-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Try:
        </span>
        {INSPIRATION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            disabled={isGenerating}
            className="text-xs shrink-0 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-amber-500/50 hover:bg-neutral-800/80 transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl shadow-inner">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[80%]">
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow">
                  <Film className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed shadow ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-neutral-950 font-medium rounded-tr-none'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none whitespace-pre-line'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Inline Recommended Movie Cards if assistant suggested movies */}
            {msg.recommendedMovies && msg.recommendedMovies.length > 0 && (
              <div className="w-full mt-3 sm:mt-4 pl-0 sm:pl-10 pr-0 sm:pr-2">
                <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Featured Films ({msg.recommendedMovies.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                  {msg.recommendedMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onPlayTrailer={onPlayTrailer}
                      onSelectMovie={onSelectMovie}
                      onLove={onLove}
                      onDislike={onDislike}
                      onWatchlist={onWatchlist}
                      isLoved={lovedMovies.some((m) => String(m.id) === String(movie.id))}
                      isDisliked={dislikedMovies.some((m) => String(m.id) === String(movie.id))}
                      isWatchlist={watchlistMovies.some((m) => String(m.id) === String(movie.id))}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Sommelier is consulting film archives...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isGenerating) return;
          handleSend(input);
        }}
        className="mt-3 relative flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isGenerating ? "Consulting archives..." : "Ask anything... 'Tom Cruise movies', '90s sci-fi thriller'"}
          className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 pr-12 shadow-lg"
        />
        <button
          type="submit"
          disabled={!input.trim() || isGenerating}
          className="absolute right-2 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-neutral-950 transition shadow"
          aria-label="Send query"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
