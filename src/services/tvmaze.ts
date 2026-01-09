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
