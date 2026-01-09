export interface Show {
  id: number;
  dbId?: string;
  name: string;
  image: {
    medium?: string;
    original?: string;
  } | null;
  premiered: string | null;
  ended: string | null;
  status?: string | null;  // Production status from API
  genres: string[];
  rating: {
    average: number | null;
  };
  summary: string | null;
  officialSite?: string | null;
  runtime?: number | null;
  type?: string | null;
  network?: {
    id: number;
    name: string;
    country: {
      name: string;
      code: string;
      timezone: string;
    } | null;
    officialSite: string | null;
  } | null;
  webChannel?: {
    id: number;
    name: string;
    country: {
      name: string;
      code: string;
      timezone: string;
    } | null;
    officialSite: string | null;
  } | null;
  source?: 'tvmaze' | 'tmdb';
  _embedded?: {
    nextepisode?: {
      name: string;
      airdate: string;
      airstamp: string;
      season: number;
      number: number;
    };
    previousepisode?: {
      name: string;
      airdate: string;
      airstamp: string;
      season: number;
      number: number;
    };
    cast?: Array<{
      person: {
        name: string;
        image: { medium?: string; original?: string } | null;
      };
      character: string;
    }>;
  };
}

export interface TVMazeEpisode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number;
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
  _links: { self: { href: string }; show: { href: string } };
}

export interface Episode {
  season: number;
  episode: number;
  episodeName: string;
  airdate: string;
}

export interface SearchResult {
  score: number;
  show: Show;
}

export interface TrackedShow extends Show {
  dbId?: string;
  addedAt: string;
  trackStatus: 'watchlist' | 'watched' | 'watching';  // User's tracking status
  notes?: string;
}

export interface TrackedShowRow {
  id: string;
  user_id: string;
  show_id: number;
  name: string;
  image_url: string | null;
  premiered: string | null;
  ended: string | null;
  status: string | null;  // Production status from database
  genres: string[] | null;
  rating: number | null;
  summary: string | null;
  created_at: string;
  track_status: string;  // User's tracking status from database
  source?: 'tvmaze' | 'tmdb';
}

export interface Notification {
  id: string;
  type: 'upcoming' | 'unwatched' | 'inactive';
  showId: number;
  showName: string;
  message: string;
  timestamp: string;
  read: boolean;
  uniqueKey: string; // For duplicate detection
  sentAt?: string; // When notification was sent (for database sync)
  episodeInfo?: {
    season: number;
    episode: number;
    episodeName: string;
    airdate: string;
  };
}