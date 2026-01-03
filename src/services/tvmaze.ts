import { SearchResult, Show } from "@/types/show";

const BASE_URL = 'https://api.tvmaze.com';

export const getShowDetails = async (id: number): Promise<Show | null> => {
  try {
    const response = await fetch(`${BASE_URL}/shows/${id}?embed[]=nextepisode&embed[]=previousepisode&embed[]=cast`);
    const data = await response.json();
    return {
      ...data,
      source: 'tvmaze',
      _embedded: {
        ...data._embedded,
        cast: (data._embedded?.cast || []).map((c: { person: { name: string; image: { medium?: string; original?: string } | null }; character: { name: string } }) => ({
          person: c.person,
          character: c.character.name
        }))
      }
    };
  } catch (error) {
    console.error('Error fetching show details:', error);
    return null;
  }
};

export const getRecommendedSeries = async (): Promise<SearchResult[]> => {
  try {
    // Fetch today's schedule for US to get more popular/relevant shows
    const response = await fetch(`${BASE_URL}/shows`);
    const data = await response.json();

    // Deduplicate shows from episodes and filter for quality
    const showsMap = new Map<number, Show>();

    if (Array.isArray(data)) {
      data.forEach((s: Show) => {
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

    // If we didn't get enough results, try another page or fallback (though page 1 usually has ~250 shows)
    if (showsMap.size < 20) {
      const genResponse = await fetch(`${BASE_URL}/shows?page=1`);
      const genData = await genResponse.json();
      if (Array.isArray(genData)) {
        genData.forEach((s: Show) => {
          if (s && s.image && !showsMap.has(s.id) && showsMap.size < 20) {
            showsMap.set(s.id, {
              ...s,
              genres: s.genres || [],
              source: 'tvmaze'
            });
          }
        });
      }
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
