"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ShowProvider } from "@/contexts/ShowContext";
import { UpcomingProvider } from "@/contexts/UpcomingContext";
import { LanguageProvider } from "@/contexts/LanguageContext/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState, useEffect } from "react";

import { User, Session } from '@supabase/supabase-js';
import { TrackedShow, SeasonReview } from '@/types/show';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialSession?: Session | null;
  initialShows?: TrackedShow[];
  initialWatchedEpisodes?: Record<string, { season: number; episode: number }[]>;
  initialLastWatchedDates?: Record<number, Date>;
  initialSeasonReviews?: Record<string, SeasonReview[]>;
}

export function Providers({ 
  children,
  initialUser = null,
  initialSession = null,
  initialShows = [],
  initialWatchedEpisodes = {},
  initialLastWatchedDates = {},
  initialSeasonReviews = {}
}: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Register Service Worker for notifications
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                // console.log('SW registered: ', registration);
            }).catch(registrationError => {
                // console.log('SW registration failed: ', registrationError);
            });
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={initialUser} initialSession={initialSession}>
        <LanguageProvider>
          <ShowProvider 
            initialShows={initialShows}
            initialWatchedEpisodes={initialWatchedEpisodes}
            initialLastWatchedDates={initialLastWatchedDates}
            initialSeasonReviews={initialSeasonReviews}
          >
            <UpcomingProvider>
              <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme" forcedTheme="dark">
                <NotificationProvider>
                  <TooltipProvider>
                    {children}
                    <Toaster />
                    <Sonner />
                  </TooltipProvider>
                </NotificationProvider>
              </ThemeProvider>
            </UpcomingProvider>
          </ShowProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
