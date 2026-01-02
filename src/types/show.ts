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
  status: string;
  genres: string[];
  rating: {
    average: number | null;
  };
  summary: string | null;
  _embedded?: {
    nextepisode?: {
      name: string;
      airdate: string;
      season: number;
      number: number;
    };
  };
}

export interface SearchResult {
  score: number;
  show: Show;
}

export interface TrackedShow extends Show {
  dbId?: string;
  addedAt: string;
  status: 'watchlist' | 'watched';
  notes?: string;
}
