import { TrackedShow, Episode, SeasonReview } from '@/types/show';

export interface ShowContextType {
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
    seasonReviews: Record<string, SeasonReview[]>;
    updateShowReview: (showId: number, rating: number, notes: string, source?: string) => Promise<void>;
    saveSeasonReview: (showId: number, seasonNumber: number, rating: number, notes: string, source?: string) => Promise<void>;
}
