import { useState, useCallback, useEffect } from 'react';
import { isAfter, parseISO } from 'date-fns';
import { useShowStorage } from './useShowStorage';
import { getShowDetails } from '@/services/tvmaze';
import { Show } from '@/types/show';

export const useUpcomingShows = () => {
    const [upcomingShows, setUpcomingShows] = useState<Show[]>([]);
    const [recentlyAired, setRecentlyAired] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { shows } = useShowStorage();

    const fetchUpcoming = useCallback(async () => {
        // Prevent fetch if no shows
        if (shows.length === 0) {
            setUpcomingShows([]);
            setRecentlyAired([]);
            return;
        }

        setIsLoading(true);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const candidates = await Promise.all(
            shows.map(async (show) => {
                // 1. Movie Check
                if (show.source === 'tmdb') {
                    if (show.premiered && isAfter(parseISO(show.premiered), tenDaysAgo)) {
                        return show;
                    }
                    return null;
                }

                // 2. Series Check
                if (show.source === 'tvmaze' || !show.source) { // Default tvmaze
                    try {
                        const freshData = await getShowDetails(show.id);
                        if (!freshData) return null;

                        // Check for upcoming episode
                        if (freshData._embedded?.nextepisode) {
                            const airdate = parseISO(freshData._embedded.nextepisode.airdate);
                            if (isAfter(airdate, tenDaysAgo)) {
                                return { ...freshData, source: 'tvmaze' as const, dbId: show.dbId } as Show;
                            }
                        }

                        // Check for recently aired episode if no nextepisode or if nextepisode is far away
                        if (freshData._embedded?.previousepisode) {
                            const airdate = parseISO(freshData._embedded.previousepisode.airdate);
                            if (isAfter(airdate, tenDaysAgo)) {
                                return { ...freshData, source: 'tvmaze' as const, dbId: show.dbId } as Show;
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to fetch details for show ${show.id}`, error);
                    }

                    return null;
                }
                return null;
            })
        );

        const upcoming = candidates.filter((s): s is Show => {
            if (!s) return false;
            const airDateStr = s.source === 'tmdb'
                ? s.premiered
                : s._embedded?.nextepisode?.airdate;

            if (!airDateStr) return false;
            return !isAfter(today, parseISO(airDateStr));
        }).sort((a, b) => {
            const getDate = (item: Show) => {
                if (item.source === 'tmdb') return item.premiered || '9999-12-31';
                return item._embedded?.nextepisode?.airdate || '9999-12-31';
            };
            return new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime();
        });

        const recent = candidates.filter((s): s is Show => {
            if (!s) return false;
            // If it's already in upcoming, don't put it in recent (prevent duplicates)
            const isUpcoming = upcoming.some(u => u.id === s.id && u.source === s.source);
            if (isUpcoming) return false;

            const airDateStr = s.source === 'tmdb'
                ? s.premiered
                : (s._embedded?.nextepisode?.airdate || s._embedded?.previousepisode?.airdate);

            if (!airDateStr) return false;
            return isAfter(today, parseISO(airDateStr));
        }).sort((a, b) => {
            const getDate = (item: Show) => {
                if (item.source === 'tmdb') return item.premiered || '0000-01-01';
                return item._embedded?.nextepisode?.airdate || item._embedded?.previousepisode?.airdate || '0000-01-01';
            };
            return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
        });

        setUpcomingShows(upcoming);
        setRecentlyAired(recent);
        setIsLoading(false);
    }, [shows]);

    useEffect(() => {
        if (shows.length > 0) {
            fetchUpcoming();
        }
    }, [shows.length, fetchUpcoming]);

    return {
        upcomingShows,
        recentlyAired,
        isLoading,
        refresh: fetchUpcoming
    };
};
