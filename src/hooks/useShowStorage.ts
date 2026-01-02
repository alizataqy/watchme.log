import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrackedShow } from '@/types/show';

export function useShowStorage() {
  const { user } = useAuth();
  const [shows, setShows] = useState<TrackedShow[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, { season: number; episode: number }[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchShows = useCallback(async () => {
    if (!user) {
      setShows([]);
      setWatchedEpisodes({});
      setIsLoading(false);
      return;
    }

    try {
      const { data: trackedShows, error: showsError } = await supabase
        .from('tracked_shows')
        .select('*')
        .eq('user_id', user.id);

      if (showsError) throw showsError;

      const mapped: TrackedShow[] = (trackedShows || []).map((s) => ({
        id: s.show_id,
        dbId: s.id,
        name: s.name,
        image: s.image_url ? { medium: s.image_url, original: s.image_url } : null,
        premiered: s.premiered,
        ended: s.ended,
        genres: s.genres || [],
        rating: { average: s.rating ? Number(s.rating) : null },
        summary: s.summary,
        addedAt: s.created_at,
        status: s.track_status as 'watchlist' | 'watched',
      }));

      setShows(mapped);

      // Fetch watched episodes
      const { data: episodes, error: episodesError } = await supabase
        .from('watched_episodes')
        .select('*')
        .eq('user_id', user.id);

      if (episodesError) throw episodesError;

      const episodesMap: Record<string, { season: number; episode: number }[]> = {};
      (episodes || []).forEach((ep) => {
        if (!episodesMap[ep.tracked_show_id]) {
          episodesMap[ep.tracked_show_id] = [];
        }
        episodesMap[ep.tracked_show_id].push({
          season: ep.season,
          episode: ep.episode,
        });
      });
      setWatchedEpisodes(episodesMap);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  const addShow = async (show: Omit<TrackedShow, 'addedAt'> & { status: 'watchlist' | 'watched' }) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('tracked_shows').insert({
        user_id: user.id,
        show_id: show.id,
        name: show.name,
        image_url: show.image?.medium || show.image?.original || null,
        premiered: show.premiered,
        ended: show.ended,
        status: show.status,
        genres: show.genres,
        rating: show.rating?.average,
        summary: show.summary,
        track_status: show.status,
      });

      if (error) throw error;
      await fetchShows();
    } catch (error) {
      console.error('Error adding show:', error);
    }
  };

  const removeShow = async (showId: number) => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId);
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

  const updateShowStatus = async (showId: number, status: 'watchlist' | 'watched') => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId);
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
    }
  };

  const toggleEpisode = async (
    showId: number,
    season: number,
    episode: number,
    episodeName: string,
    airdate: string
  ) => {
    if (!user) return;

    const show = shows.find((s) => s.id === showId);
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
      await fetchShows();
    } catch (error) {
      console.error('Error toggling episode:', error);
    }
  };

  const isInList = (showId: number) => shows.some((s) => s.id === showId);
  const getShowStatus = (showId: number) => shows.find((s) => s.id === showId)?.status;
  const getShowDbId = (showId: number) => shows.find((s) => s.id === showId)?.dbId;

  const watchlist = shows.filter((s) => s.status === 'watchlist');
  const watched = shows.filter((s) => s.status === 'watched');

  return {
    shows,
    watchlist,
    watched,
    watchedEpisodes,
    isLoading,
    addShow,
    removeShow,
    updateShowStatus,
    toggleEpisode,
    isInList,
    getShowStatus,
    getShowDbId,
  };
}
