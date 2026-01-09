import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrackedShow, TrackedShowRow } from '@/types/show';
import { isAfter, parseISO } from 'date-fns';

export function useShowStorage() {
  const { user } = useAuth();
  const [shows, setShows] = useState<TrackedShow[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, { season: number; episode: number }[]>>({});
  const [lastWatchedDates, setLastWatchedDates] = useState<Record<number, Date>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchShows = useCallback(async () => {
    if (!user) {
      setShows([]);
      setWatchedEpisodes({});
      setLastWatchedDates({});
      setIsLoading(false);
      return;
    }

    try {
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
        productionStatus: s.status as 'Running' | 'Ended' | 'In Development' | 'Canceled' | null,
        genres: s.genres || [],
        rating: { average: s.rating ? Number(s.rating) : null },
        summary: s.summary,
        addedAt: s.created_at,
        trackStatus: s.track_status as 'watchlist' | 'watched' | 'watching',  // User's tracking status
        source: s.source,
      }));

      setShows(mapped);

      // Fetch watched episodes
      const { data: episodes, error: episodesError } = await supabase
        .from('watched_episodes')
        .select('*')
        .eq('user_id', user.id);

      if (episodesError) throw episodesError;

      const episodesMap: Record<string, { season: number; episode: number }[]> = {};
      const lastWatchedMap: Record<number, Date> = {}; // showId -> last watched date

      (episodes || []).forEach((ep) => {
        if (!episodesMap[ep.tracked_show_id]) {
          episodesMap[ep.tracked_show_id] = [];
        }
        episodesMap[ep.tracked_show_id].push({
          season: ep.season,
          episode: ep.episode,
        });

        // Find the show_id for this tracked_show_id
        const show = mapped.find((s) => s.dbId === ep.tracked_show_id);
        if (show) {
          const watchedAt = new Date(ep.watched_at);
          // Keep the most recent watched_at timestamp for each show
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

    try {
      const { error } = await supabase.from('tracked_shows').insert({
        user_id: user.id,
        show_id: show.id,
        name: show.name,
        image_url: show.image?.medium || show.image?.original || null,
        premiered: show.premiered,
        ended: show.ended,
        status: show.status || null,  // Show production status from API (Running/Ended/In Development/Canceled)
        genres: show.genres,
        rating: show.rating?.average,
        summary: show.summary,
        track_status: show.trackStatus,  // User's tracking status: watchlist/watching/watched
        source: show.source || 'tvmaze',
      });

      if (error) throw error;
      await fetchShows();
    } catch (error) {
      console.error('Error adding show:', error);
      throw error;
    }
  };

  const removeShow = async (showId: number, source: string = 'tvmaze') => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
    if (!show?.dbId) return;

    try {
      const { error } = await supabase
        .from('tracked_shows')
        .delete()
        .eq('id', show.dbId);

      if (error) throw error;
      await fetchShows();
    } catch (error) {
      console.error('Error removing show:', error);
    }
  };

  const updateShowStatus = async (showId: number, status: 'watchlist' | 'watched' | 'watching', source: string = 'tvmaze') => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
    if (!show?.dbId) return;

    try {
      const { error } = await supabase
        .from('tracked_shows')
        .update({ track_status: status })
        .eq('id', show.dbId);

      if (error) throw error;
      await fetchShows();
    } catch (error) {
      console.error('Error updating show status:', error);
      throw error;
    }
  };

  const markAllEpisodesAsWatched = async (showId: number, source: string = 'tvmaze') => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
    if (!show?.dbId) return;

    try {
      // Update status first
      await updateShowStatus(showId, 'watched', source);

      // If it's a series, fetch and mark all episodes
      if (source === 'tvmaze') {
        const response = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
        const data = await response.json();

        const episodesToInsert = data
          .filter((ep: { airdate: string }) => ep.airdate && !isAfter(parseISO(ep.airdate), new Date())) // Only mark aired episodes
          .map((ep: { season: number; number: number; name: string; airdate: string }) => ({
            user_id: user.id,
            tracked_show_id: show.dbId,
            season: ep.season,
            episode: ep.number,
            episode_name: ep.name,
            airdate: ep.airdate,
          }));

        if (episodesToInsert.length > 0) {
          // Use upsert to avoid duplicate errors
          const { error } = await supabase
            .from('watched_episodes')
            .upsert(episodesToInsert, {
              onConflict: 'user_id,tracked_show_id,season,episode'
            });

          if (error) {
            console.error('Error batch inserting episodes:', error);
          }
        }
      }

      await fetchShows();
    } catch (error) {
      console.error('Error marking all as watched:', error);
      throw error;
    }
  };

  const toggleEpisode = async (
    showId: number,
    season: number,
    episode: number,
    episodeName: string,
    airdate: string,
    source: string = 'tvmaze',
    silent: boolean = false // Don't refresh if in bulk mode
  ) => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
    if (!show?.dbId) return;

    const showEpisodes = watchedEpisodes[show.dbId] || [];
    const isWatched = showEpisodes.some(
      (ep) => ep.season === season && ep.episode === episode
    );

    try {
      if (isWatched) {
        const { error } = await supabase
          .from('watched_episodes')
          .delete()
          .eq('user_id', user.id)
          .eq('tracked_show_id', show.dbId)
          .eq('season', season)
          .eq('episode', episode);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('watched_episodes').insert({
          user_id: user.id,
          tracked_show_id: show.dbId,
          season,
          episode,
          episode_name: episodeName,
          airdate,
        });

        if (error) throw error;
      }
      if (!silent) {
        await fetchShows();
      }
    } catch (error) {
      console.error('Error toggling episode:', error);
    }
  };

  const toggleEpisodesBulk = async (
    showId: number,
    episodes: { season: number; episode: number; episodeName: string; airdate: string }[],
    source: string = 'tvmaze'
  ) => {
    if (!user || episodes.length === 0) return;

    const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
    if (!show?.dbId) return;

    try {
      // Process all episodes silently
      for (const ep of episodes) {
        await toggleEpisode(
          showId,
          ep.season,
          ep.episode,
          ep.episodeName,
          ep.airdate,
          source,
          true // silent mode
        );
      }

      // Refresh once at the end
      await fetchShows();
    } catch (error) {
      console.error('Error toggling episodes in bulk:', error);
    }
  };

  const resetWatchedEpisodes = async (showId: number, source: string = 'tvmaze') => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source);
    if (!show?.dbId) return;

    try {
      const { error } = await supabase
        .from('watched_episodes')
        .delete()
        .eq('user_id', user.id)
        .eq('tracked_show_id', show.dbId);

      if (error) throw error;
      await fetchShows();
    } catch (error) {
      console.error('Error resetting watched episodes:', error);
    }
  };

  const isInList = (showId: number, source: string = 'tvmaze') =>
    shows.some((s) => s.id === showId && (s.source || 'tvmaze') === source);

  const getShowStatus = (showId: number, source: string = 'tvmaze') =>
    shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source)?.trackStatus;

  const getShowDbId = (showId: number, source: string = 'tvmaze') =>
    shows.find((s) => s.id === showId && (s.source || 'tvmaze') === source)?.dbId;

  const getShows = useCallback(async () => {
    return shows;
  }, [shows]);

  const watchlist = shows.filter((s) => s.trackStatus === 'watchlist');
  const watched = shows.filter((s) => s.trackStatus === 'watched');
  const watching = shows.filter((s) => s.trackStatus === 'watching');

  return {
    shows,
    watchlist,
    watched,
    watching,
    watchedEpisodes,
    isLoading,
    addShow,
    removeShow,
    updateShowStatus,
    toggleEpisode,
    toggleEpisodesBulk,
    resetWatchedEpisodes,
    markAllEpisodesAsWatched,
    isInList,
    getShowStatus,
    getShowDbId,
    getShows,
    lastWatchedDates,
  };
}
