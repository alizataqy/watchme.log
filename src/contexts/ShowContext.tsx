import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrackedShow, TrackedShowRow, TVMazeEpisode, Episode, SeasonReview } from '@/types/show';
import { isAfter, parseISO } from 'date-fns';

interface ShowContextType {
    shows: TrackedShow[];
    watchlist: TrackedShow[];
    watched: TrackedShow[];
    watching: TrackedShow[];
    watchedEpisodes: Record<string, { season: number; episode: number }[]>;
    lastWatchedDates: Record<number, Date>;
    isLoading: boolean;
    refreshShows: () => Promise<void>;
    addShow: (show: Omit<TrackedShow, 'addedAt'>) => Promise<void>;
    removeShow: (showId: number, source?: string) => Promise<void>;
    updateShowStatus: (showId: number, status: 'watchlist' | 'watched' | 'watching', source?: string) => Promise<void>;
    toggleEpisode: (showId: number, season: number, episode: number, episodeName: string, airdate: string, source?: string, silent?: boolean) => Promise<void>;
    toggleEpisodesBulk: (showId: number, episodes: Episode[], source?: string) => Promise<void>;
    resetWatchedEpisodes: (showId: number, source?: string) => Promise<void>;
    markAllEpisodesAsWatched: (showId: number, source?: string) => Promise<void>;
    isInList: (showId: number, source?: string) => boolean;
    getShowStatus: (showId: number, source?: string) => 'watchlist' | 'watched' | 'watching' | undefined;
    getShowDbId: (showId: number, source?: string) => string | undefined;
    getShows: () => Promise<TrackedShow[]>;
    seasonReviews: SeasonReview[];
    updateShowReview: (showId: number, rating: number, notes: string, source?: string) => Promise<void>;
    saveSeasonReview: (showId: number, seasonNumber: number, rating: number, notes: string, source?: string) => Promise<void>;
}

const ShowContext = createContext<ShowContextType | undefined>(undefined);

export const ShowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [shows, setShows] = useState<TrackedShow[]>([]);
    const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, { season: number; episode: number }[]>>({});
    const [lastWatchedDates, setLastWatchedDates] = useState<Record<number, Date>>({});
    const [seasonReviews, setSeasonReviews] = useState<SeasonReview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchShows = useCallback(async () => {
        if (!user) {
            setShows([]);
            setWatchedEpisodes({});
            setLastWatchedDates({});
            setSeasonReviews([]);
            setIsLoading(false);
            return;
        }

        try {
            console.log('Fetching shows from Supabase...');
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
            setSeasonReviews(reviews || []);

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
    }, [user]);

    useEffect(() => {
        fetchShows();
    }, [fetchShows]);

    const addShow = async (show: Omit<TrackedShow, 'addedAt'>) => {
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
    };

    const removeShow = async (showId: number, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;
        const { error } = await supabase.from('tracked_shows').delete().eq('id', show.dbId);
        if (error) throw error;
        await fetchShows();
    };

    const updateShowStatus = async (showId: number, status: 'watchlist' | 'watched' | 'watching', source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;
        const { error } = await supabase.from('tracked_shows').update({ track_status: status }).eq('id', show.dbId);
        if (error) throw error;
        await fetchShows();
    };

    const markAllEpisodesAsWatched = async (showId: number, source: string = 'tvmaze') => {
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
    };

    const toggleEpisode = async (showId: number, season: number, episode: number, episodeName: string, airdate: string, source: string = 'tvmaze', silent: boolean = false) => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;

        const isWatched = (watchedEpisodes[show.dbId] || []).some(ep => ep.season === season && ep.episode === episode);

        if (isWatched) {
            await supabase.from('watched_episodes').delete()
                .eq('user_id', user.id).eq('tracked_show_id', show.dbId).eq('season', season).eq('episode', episode);
        } else {
            await supabase.from('watched_episodes').insert({
                user_id: user.id, tracked_show_id: show.dbId, season, episode, episode_name: episodeName, airdate,
            });
        }
        if (!silent) await fetchShows();
    };

    const toggleEpisodesBulk = async (showId: number, episodes: Episode[], source: string = 'tvmaze') => {
        if (!user || episodes.length === 0) return;
        for (const ep of episodes) {
            await toggleEpisode(showId, ep.season, ep.episode, ep.episodeName, ep.airdate, source, true);
        }
        await fetchShows();
    };

    const resetWatchedEpisodes = async (showId: number, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;
        await supabase.from('watched_episodes').delete().eq('user_id', user.id).eq('tracked_show_id', show.dbId);
        await fetchShows();
    };

    const isInList = (showId: number, source: string = 'tvmaze') =>
        shows.some((s) => s.id === showId && (s.source || 'tvmaze') === source);

    const getShowStatus = (showId: number, source: string = 'tvmaze') =>
        shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source)?.trackStatus;

    const getShowDbId = (showId: number, source: string = 'tvmaze') =>
        shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source)?.dbId;

    const getShows = useCallback(async () => shows, [shows]);

    const updateShowReview = async (showId: number, rating: number, notes: string, source: string = 'tvmaze') => {
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
    };

    const saveSeasonReview = async (showId: number, seasonNumber: number, rating: number, notes: string, source: string = 'tvmaze') => {
        if (!user) return;
        const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
        if (!show?.dbId) return;

        const { error } = await supabase
            .from('season_reviews')
            .upsert({
                user_id: user.id,
                tracked_show_id: show.dbId,
                season_number: seasonNumber,
                rating,
                notes
            }, {
                onConflict: 'user_id,tracked_show_id,season_number'
            });

        if (error) throw error;
        await fetchShows();
    };

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

export const useShowContext = () => {
    const context = useContext(ShowContext);
    if (!context) throw new Error('useShowContext must be used within a ShowProvider');
    return context;
};
