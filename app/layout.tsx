import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MovieLapse | Local AI Cinephile Sommelier & Movie Discovery",
  description: "Advanced movie picking website powered by in-browser Local AI (WebLLM), 20 Questions Sommelier mode, verified HD posters, and instant trailers.",
  keywords: ["movies", "movie recommendations", "local AI", "WebLLM", "20 questions", "trailers", "tmdb"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 font-sans">
        {children}
      </body>
    </html>
  );
}
