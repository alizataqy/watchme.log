import { useShowContext } from '@/contexts/ShowContext';

export function useShowStorage() {
  const context = useShowContext();

  return {
    shows: context.shows,
    watchlist: context.watchlist,
    watched: context.watched,
    watching: context.watching,
    watchedEpisodes: context.watchedEpisodes,
    isLoading: context.isLoading,
    addShow: context.addShow,
    removeShow: context.removeShow,
    updateShowStatus: context.updateShowStatus,
    toggleEpisode: context.toggleEpisode,
    toggleEpisodesBulk: context.toggleEpisodesBulk,
    resetWatchedEpisodes: context.resetWatchedEpisodes,
    markAllEpisodesAsWatched: context.markAllEpisodesAsWatched,
    isInList: context.isInList,
    getShowStatus: context.getShowStatus,
    getShowDbId: context.getShowDbId,
    getShows: context.getShows,
    lastWatchedDates: context.lastWatchedDates,
    seasonReviews: context.seasonReviews,
    updateShowReview: context.updateShowReview,
    saveSeasonReview: context.saveSeasonReview,
  };
}
