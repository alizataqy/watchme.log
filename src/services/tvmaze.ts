import { SearchResult, Show } from "@/types/show";

const BASE_URL = 'https://api.tvmaze.com';

interface TVMazeCastItem {
  person: {
    name: string;
    image: { medium?: string; original?: string } | null;
  };
  character: {
    name: string;
  };
}

interface TVMazeScheduleItem {
  show: Show;
}

export const getShowDetails = async (id: number, includeCast: boolean = true): Promise<Show | null> => {
  try {
    const embeds = ['nextepisode', 'previousepisode'];
    if (includeCast) embeds.push('cast');

    const embedQuery = embeds.map(e => `embed[]=${e}`).join('&');
    const response = await fetch(`${BASE_URL}/shows/${id}?${embedQuery}`);
    const data = await response.json();

    return {
      ...data,
      source: 'tvmaze',
      _embedded: {
        ...data._embedded,
        cast: includeCast ? (data._embedded?.cast || []).map((c: TVMazeCastItem) => ({
          person: c.person,
          character: c.character.name
        })) : []
      }
    };
  } catch (error) {
    console.error('Error fetching show details:', error);
    return null;
  }
};

// Common TV Maze Genres
export const TVMAZE_GENRES = [
  'Action', 'Adventure', 'Anime', 'Comedy', 'Crime', 'Drama', 'Espionage', 'Family',
  'Fantasy', 'History', 'Horror', 'Legal', 'Medical', 'Music', 'Mystery', 'Romance',
  'Science-Fiction', 'Sports', 'Supernatural', 'Thriller', 'War', 'Western'
];

export const getSeriesByGenre = async (genre: string): Promise<SearchResult[]> => {
  try {
    // TVMaze doesn't have a direct "discover by genre" endpoint that is efficient.
    // We will search for shows and filter clientside, or use the schedule endpoint and filter.
    // For a "Genre" view, searching by genre name often works reasonably well on TVMaze search endpoint
    // or we can fetch a curated list.
    // Strategy: Use the /search/shows?q=genre endpoint which often returns shows matching that tag
    const response = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(genre)}`);
    const data = await response.json() as { score: number; show: Show }[];

    if (!Array.isArray(data)) return [];

    const results = data.map((item) => item.show)
      .filter((show) => show.genres?.includes(genre)) // Strict filter to ensure relevance
      .map((show) => ({
        score: show.rating?.average || 0,
        show: {
          ...show,
          source: 'tvmaze' as const
        }
      }));

    // Sort by rating
    return results.sort((a, b) => (b.show.rating?.average || 0) - (a.show.rating?.average || 0));

  } catch (error) {
    console.error('Error fetching series by genre:', error);
    return [];
  }
};

export const getRecommendedSeries = async (): Promise<SearchResult[]> => {
  try {
    // Fetch today's schedule for US to get relevant/popular shows
    // This is much faster than fetching the full show index
    const response = await fetch(`${BASE_URL}/schedule?country=US`);
    const data = await response.json();

    const showsMap = new Map<number, Show>();

    if (Array.isArray(data)) {
      data.forEach((item: TVMazeScheduleItem) => {
        const s = item.show;
        if (s && s.image && !showsMap.has(s.id)) {
          // Only include shows that have at least one genre or a rating
          if ((s.genres && s.genres.length > 0) || (s.rating && s.rating.average)) {
            showsMap.set(s.id, {
              ...s,
              genres: s.genres || [],
              source: 'tvmaze'
            });
          }
        }
      });
    }

    const uniqueShows = Array.from(showsMap.values())
      .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
      .slice(0, 13);

    return uniqueShows.map(show => ({
      score: show.rating?.average || 0,
      show: show
    }));
  } catch (error) {
    console.error('Error fetching recommended series:', error);
    return [];
  }
};
