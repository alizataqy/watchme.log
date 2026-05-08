"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { isAfter, parseISO } from 'date-fns';
import { useShowStorage } from '@/hooks/useShowStorage';
import { getShowDetails } from '@/services/tvmaze';
import { Show } from '@/types/show';

interface UpcomingContextType {
    upcomingShows: Show[];
    recentlyAired: Show[];
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const UpcomingContext = createContext<UpcomingContextType | undefined>(undefined);

export function UpcomingProvider({ 
    children, 
    initialUpcoming = [], 
    initialRecent = [] 
}: { 
    children: ReactNode;
    initialUpcoming?: Show[];
    initialRecent?: Show[];
}) {
    const [upcomingShows, setUpcomingShows] = useState<Show[]>(initialUpcoming);
    const [recentlyAired, setRecentlyAired] = useState<Show[]>(initialRecent);
    const [isLoading, setIsLoading] = useState(false);
    const { shows } = useShowStorage();
    const lastSyncRef = useRef<number>(0);

    const fetchUpcoming = useCallback(async () => {
        const now = Date.now();
        // Prevent sync if no shows or synced within last 60 seconds
        if (shows.length === 0 || (now - lastSyncRef.current < 60000)) {
            if (shows.length === 0) {
                setUpcomingShows([]);
                setRecentlyAired([]);
            }
            return;
        }

        lastSyncRef.current = now;
        setIsLoading(true);

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tenDaysAgo = new Date(today);
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            const showsToSync = shows.filter(s => s.trackStatus === 'watching' || s.trackStatus === 'watchlist');
            const BATCH_SIZE = 5;
            const candidates: (Show | null)[] = [];

            for (let i = 0; i < showsToSync.length; i += BATCH_SIZE) {
                const batch = showsToSync.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                    batch.map(async (show) => {
                        if (show.source === 'tmdb') {
                            if (show.premiered && isAfter(parseISO(show.premiered), tenDaysAgo)) {
                                return show;
                            }
                            return null;
                        }

                        if (show.source === 'tvmaze' || !show.source) {
                            try {
                                const freshData = await getShowDetails(show.id, false);
                                if (!freshData) return null;

                                if (freshData._embedded?.nextepisode) {
                                    const airdate = parseISO(freshData._embedded.nextepisode.airdate);
                                    if (isAfter(airdate, tenDaysAgo)) {
                                        return { ...freshData, source: 'tvmaze', dbId: show.dbId } as Show;
                                    }
                                }

                                if (freshData._embedded?.previousepisode) {
                                    const airdate = parseISO(freshData._embedded.previousepisode.airdate);
                                    if (isAfter(airdate, tenDaysAgo)) {
                                        return { ...freshData, source: 'tvmaze', dbId: show.dbId } as Show;
                                    }
                                }
                            } catch (e) {
                                console.error(`Failed to fetch for show ${show.id}`, e);
                            }
                        }
                        return null;
                    })
                );
                candidates.push(...batchResults);
                if (i + BATCH_SIZE < showsToSync.length) await new Promise(r => setTimeout(r, 300));
            }

            const upcoming = candidates.filter((s): s is Show => {
                if (!s) return false;
                const airDateStr = s.source === 'tmdb' ? s.premiered : s._embedded?.nextepisode?.airdate;
                if (!airDateStr) return false;
                return !isAfter(today, parseISO(airDateStr));
            }).sort((a, b) => {
                const getDate = (item: Show) => (item.source === 'tmdb' ? item.premiered : item._embedded?.nextepisode?.airdate) || '9999-12-31';
                return new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime();
            });

            const recent = candidates.filter((s): s is Show => {
                if (!s) return false;
                if (upcoming.some(u => u.id === s.id && u.source === s.source)) return false;
                const airDateStr = s.source === 'tmdb' ? s.premiered : (s._embedded?.nextepisode?.airdate || s._embedded?.previousepisode?.airdate);
                if (!airDateStr) return false;
                return isAfter(today, parseISO(airDateStr));
            }).sort((a, b) => {
                const getDate = (item: Show) => (item.source === 'tmdb' ? item.premiered : (item._embedded?.nextepisode?.airdate || item._embedded?.previousepisode?.airdate)) || '0000-01-01';
                return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
            });

            setUpcomingShows(upcoming);
            setRecentlyAired(recent);
        } catch (error) {
            console.error('Error in UpcomingProvider:', error);
        } finally {
            setIsLoading(false);
        }
    }, [shows]);

    const isFirstRun = useRef(true);

    useEffect(() => {
        // Skip first mount ONLY if we already have data from SSR
        if (isFirstRun.current && (initialUpcoming.length > 0 || initialRecent.length > 0)) {
            isFirstRun.current = false;
            lastSyncRef.current = Date.now();
            return;
        }
        
        if (shows.length > 0) {
            isFirstRun.current = false;
            fetchUpcoming();
        }
    }, [shows.length, fetchUpcoming, initialUpcoming.length, initialRecent.length]);

    return (
        <UpcomingContext.Provider value={{ upcomingShows, recentlyAired, isLoading, refresh: fetchUpcoming }}>
            {children}
        </UpcomingContext.Provider>
    );
}

export function useUpcoming() {
    const context = useContext(UpcomingContext);
    if (context === undefined) {
        throw new Error('useUpcoming must be used within an UpcomingProvider');
    }
    return context;
}
