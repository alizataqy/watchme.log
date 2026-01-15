import React, { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrackedShow, TrackedShowRow, TVMazeEpisode, Episode, SeasonReview } from '@/types/show';
import { isAfter, parseISO } from 'date-fns';
import { ShowContext } from './context';

export const ShowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [shows, setShows] = useState<TrackedShow[]>([]);
    const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, { season: number; episode: number }[]>>({});
    const [lastWatchedDates, setLastWatchedDates] = useState<Record<number, Date>>({});
    const [seasonReviews, setSeasonReviews] = useState<Record<string, SeasonReview[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const lastFetchRef = useRef<{ userId: string; timestamp: number } | null>(null);

    const fetchShows = useCallback(async () => {
        if (!user) {
            setShows([]);
            setWatchedEpisodes({});
            setLastWatchedDates({});
            setSeasonReviews({});
            setIsLoading(false);
            return;
        }

        const now = Date.now();
        // Prevent duplicate fetches for the same user in a short window (1s)
        if (lastFetchRef.current?.userId === user.id && now - lastFetchRef.current.timestamp < 1000) {
            return;
        }
        lastFetchRef.current = { userId: user.id, timestamp: now };

        try {
            // console.log('Fetching shows from Supabase...');
            const { data: trackedShows, error: showsError } = await supabase
                .from('tracked_shows')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (showsError) throw showsError;

            const mapped: TrackedShow[] = (trackedShows || []).map((s: TrackedShowRow) => ({
                id: s.show_id,
                dbId: s.id,
                name: s.name,
                image: s.image_url ? { medium: s.image_url, original: s.image_url } : null,
                premiered: s.premiered,
                ended: s.ended,
                status: s.status,
                genres: s.genres || [],
                rating: { average: s.rating ? Number(s.rating) : null },
                summary: s.summary,
                addedAt: s.created_at,
                trackStatus: s.track_status as TrackedShow['trackStatus'],
                source: s.source as TrackedShow['source'],
                user_rating: s.user_rating || undefined,
                notes: s.notes || undefined,
            }));

            setShows(mapped);

            // Fetch season reviews
            const { data: reviews, error: reviewsError } = await supabase
                .from('season_reviews')
                .select('*')
                .eq('user_id', user.id);

            if (reviewsError) throw reviewsError;

            const reviewsMap: Record<string, SeasonReview[]> = {};
            (reviews || []).forEach(review => {
                if (!reviewsMap[review.tracked_show_id]) {
                    reviewsMap[review.tracked_show_id] = [];
                }
                reviewsMap[review.tracked_show_id].push(review);
            });
            setSeasonReviews(reviewsMap);

            // Fetch watched episodes
            const { data: episodes, error: episodesError } = await supabase
                .from('watched_episodes')
                .select('*')
                .eq('user_id', user.id);

            if (episodesError) throw episodesError;

            const episodesMap: Record<string, { season: number; episode: number }[]> = {};
            const lastWatchedMap: Record<number, Date> = {};

            (episodes || []).forEach((ep) => {
                if (!episodesMap[ep.tracked_show_id]) {
                    episodesMap[ep.tracked_show_id] = [];
                }
                episodesMap[ep.tracked_show_id].push({
                    season: ep.season,
                    episode: ep.episode,
                });

                const show = mapped.find((s) => s.dbId === ep.tracked_show_id);
                if (show) {
                    const watchedAt = new Date(ep.watched_at);
                    if (!lastWatchedMap[show.id] || watchedAt > lastWatchedMap[show.id]) {
                        lastWatchedMap[show.id] = watchedAt;
                    }
                }
            });

            setWatchedEpisodes(episodesMap);
            setLastWatchedDates(lastWatchedMap);
        } catch (error) {
            console.error('Error fetching shows:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]); // Include user for better stability and to avoid lint warnings

    useEffect(() => {
        if (user?.id) {
            fetchShows();
        }
    }, [user?.id, fetchShows]);

    useEffect(() => {
        if (!user?.id) return;

        // Use a unique channel name per user to avoid collisions between tabs/sessions
        const channel = supabase
            .channel(`db-changes-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tracked_shows',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // console.log('Realtime change: tracked_shows');
                    fetchShows();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'watched_episodes',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // console.log('Realtime change: watched_episodes');
                    fetchShows();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'season_reviews',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // console.log('Realtime change: season_reviews');
                    fetchShows();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log('✅ Realtime connected');
                } else if (status === 'CHANNEL_ERROR') {
                    // console.error('❌ Realtime connection error');
                } else if (status === 'TIMED_OUT') {
                    // console.warn('⏰ Realtime subscription timed out');
                }
            });

        return () => {
            // console.log('Cleaning up realtime subscription');
            supabase.removeChannel(channel);
        };
    }, [user?.id, fetchShows]); // fetchShows is memoized with useCallback

    const addShow = useCallback(async (show: Omit<TrackedShow, 'addedAt'>) => {
        if (!user) return;
        const { error } = await supabase.from('tracked_shows').insert({
            user_id: user.id,
            show_id: show.id,
            name: show.name,
            image_url: show.image?.medium || show.image?.original || null,
            premiered: show.premiered,
            ended: show.ended,
            status: show.status || null,
            genres: show.genres,
            rating: show.rating?.average,
            summary: show.summary,
            track_status: show.trackStatus,
            source: show.source || 'tvmaze',
        });
        if (error) throw error;
        await fetchShows();
    }, [user, fetchShows]);

    const removeShow = useCallback(async (showId: number, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;
        const { error } = await supabase.from('tracked_shows').delete().eq('id', show.dbId);
        if (error) throw error;
        await fetchShows();
    }, [user, shows, fetchShows]);

    const updateShowStatus = useCallback(async (showId: number, status: 'watchlist' | 'watched' | 'watching', source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;
        const { error } = await supabase.from('tracked_shows').update({ track_status: status }).eq('id', show.dbId);
        if (error) throw error;
        await fetchShows();
    }, [user, shows, fetchShows]);

    const markAllEpisodesAsWatched = useCallback(async (showId: number, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;

        await updateShowStatus(showId, 'watched', source);

        if (source === 'tvmaze') {
            const response = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
            const data = await response.json();
            const episodesToInsert = (data as TVMazeEpisode[])
                .filter((ep) => ep.airdate && !isAfter(parseISO(ep.airdate), new Date()))
                .map((ep) => ({
                    user_id: user.id,
                    tracked_show_id: show.dbId,
                    season: ep.season,
                    episode: ep.number,
                    episode_name: ep.name,
                    airdate: ep.airdate,
                }));

            if (episodesToInsert.length > 0) {
                await supabase.from('watched_episodes').upsert(episodesToInsert, {
                    onConflict: 'user_id,tracked_show_id,season,episode'
                });
            }
        }
        await fetchShows();
    }, [user, shows, updateShowStatus, fetchShows]);

    const toggleEpisode = useCallback(async (showId: number, season: number, episode: number, episodeName: string, airdate: string, source: string = 'tvmaze', silent: boolean = false) => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;

        const isWatched = (watchedEpisodes[show.dbId] || []).some(ep => ep.season === season && ep.episode === episode);

        // --- OPTIMISTIC UPDATE START ---
        // Kita langsung update UI tanpa nunggu database
        setWatchedEpisodes(prev => {
            const current = prev[show.dbId!] || [];
            if (isWatched) {
                return { ...prev, [show.dbId!]: current.filter(ep => !(ep.season === season && ep.episode === episode)) };
            } else {
                return { ...prev, [show.dbId!]: [...current, { season, episode }] };
            }
        });
        // --- OPTIMISTIC UPDATE END ---

        try {
            if (isWatched) {
                await supabase.from('watched_episodes').delete()
                    .eq('user_id', user.id).eq('tracked_show_id', show.dbId).eq('season', season).eq('episode', episode);
            } else {
                await supabase.from('watched_episodes').insert({
                    user_id: user.id, tracked_show_id: show.dbId, season, episode, episode_name: episodeName, airdate,
                });
            }
            // Kita tidak perlu fetchShows() manual di sini karena Realtime akan mendeteksinya
            // dan melakukan sinkronisasi terakhir jika diperlukan.
        } catch (error) {
            // console.error('Error toggling episode:', error);
            // Revert state if error (opsional, tapi lebih aman)
            await fetchShows();
        }
    }, [user, shows, watchedEpisodes, fetchShows]);

    const toggleEpisodesBulk = useCallback(async (showId: number, episodes: Episode[], source: string = 'tvmaze') => {
        if (!user || episodes.length === 0) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;

        // Optimistic update untuk bulk
        setWatchedEpisodes(prev => {
            const current = prev[show.dbId!] || [];
            const episodeKeys = new Set(episodes.map(e => `${e.season}-${e.episode}`));
            const alreadyWatchedAll = episodes.every(e => current.some(ce => ce.season === e.season && ce.episode === e.episode));

            if (alreadyWatchedAll) {
                // Remove all
                return { ...prev, [show.dbId!]: current.filter(ce => !episodeKeys.has(`${ce.season}-${ce.episode}`)) };
            } else {
                // Add missing only
                const newItems = episodes
                    .filter(e => !current.some(ce => ce.season === e.season && ce.episode === e.episode))
                    .map(e => ({ season: e.season, episode: e.episode }));
                return { ...prev, [show.dbId!]: [...current, ...newItems] };
            }
        });

        // Di sini kita bisa pakai loop, tapi tanpa menunggu satu per satu selesai agar lebih cepat
        const promises = episodes.map(ep =>
            toggleEpisode(showId, ep.season, ep.episode, ep.episodeName, ep.airdate, source, true)
        );
        await Promise.all(promises);
        await fetchShows();
    }, [user, shows, toggleEpisode, fetchShows]);

    const resetWatchedEpisodes = useCallback(async (showId: number, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;
        await supabase.from('watched_episodes').delete().eq('user_id', user.id).eq('tracked_show_id', show.dbId);
        await fetchShows();
    }, [user, shows, fetchShows]);

    const isInList = useCallback((showId: number, source: string = 'tvmaze') =>
        shows.some((s) => s.id === showId && (s.source || 'tvmaze') === source), [shows]);

    const getShowStatus = useCallback((showId: number, source: string = 'tvmaze') =>
        shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source)?.trackStatus, [shows]);

    const getShowDbId = useCallback((showId: number, source: string = 'tvmaze') =>
        shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source)?.dbId, [shows]);

    const getShows = useCallback(async () => shows, [shows]);

    const updateShowReview = useCallback(async (showId: number, rating: number, notes: string, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;

        const { error } = await supabase
            .from('tracked_shows')
            .update({
                user_rating: rating,
                notes: notes
            })
            .eq('id', show.dbId);

        if (error) throw error;
        await fetchShows();
    }, [user, shows, fetchShows]);

    const saveSeasonReview = useCallback(async (showId: number, seasonNumber: number, rating: number, notes: string, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;

        const existingReview = seasonReviews[show.dbId]?.find(r => r.season_number === seasonNumber);

        const { error } = await supabase
            .from('season_reviews')
            .upsert({
                id: existingReview?.id,
                user_id: user.id,
                tracked_show_id: show.dbId,
                season_number: seasonNumber,
                rating,
                notes: notes || null
            });

        if (error) throw error;
        await fetchShows();
    }, [user, shows, seasonReviews, fetchShows]);

    const watchlist = React.useMemo(() => shows.filter((s) => s.trackStatus === 'watchlist'), [shows]);
    const watched = React.useMemo(() => shows.filter((s) => s.trackStatus === 'watched'), [shows]);
    const watching = React.useMemo(() => shows.filter((s) => s.trackStatus === 'watching'), [shows]);

    return (
        <ShowContext.Provider value={{
            shows, watchlist, watched, watching, watchedEpisodes, lastWatchedDates, isLoading,
            refreshShows: fetchShows, addShow, removeShow, updateShowStatus, toggleEpisode,
            toggleEpisodesBulk, resetWatchedEpisodes, markAllEpisodesAsWatched,
            isInList, getShowStatus, getShowDbId, getShows,
            seasonReviews, updateShowReview, saveSeasonReview
        }}>
            {children}
        </ShowContext.Provider>
    );
};
