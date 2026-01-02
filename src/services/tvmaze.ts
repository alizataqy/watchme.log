import { SearchResult, Show } from "@/types/show";

const BASE_URL = 'https://api.tvmaze.com';

export const getShowDetails = async (id: number): Promise<Show | null> => {
  try {
    const response = await fetch(`${BASE_URL}/shows/${id}?embed[]=nextepisode&embed[]=previousepisode`);
    const data = await response.json();
    return {
      ...data,
      source: 'tvmaze',
    };
  } catch (error) {
    console.error('Error fetching show details:', error);
    return null;
  }
};

export const getRecommendedSeries = async (): Promise<SearchResult[]> => {
  try {
    // Fetch today's schedule for US to get more popular/relevant shows
    const response = await fetch(`${BASE_URL}/schedule?country=US`);
    const data = await response.json();

    // Deduplicate shows from episodes and filter for quality
    const showsMap = new Map<number, Show>();

    (data as Array<{ show: Show }> || []).forEach((item) => {
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

    // If we didn't get enough from US schedule, try to fill with general schedule
    if (showsMap.size < 5) {
      const genResponse = await fetch(`${BASE_URL}/schedule`);
      const genData = await genResponse.json();
      (genData as Array<{ show: Show }> || []).forEach((item) => {
        const s = item.show;
        if (s && s.image && !showsMap.has(s.id) && showsMap.size < 20) {
          showsMap.set(s.id, {
            ...s,
            genres: s.genres || [],
            source: 'tvmaze'
          });
        }
      });
    }

    const uniqueShows = Array.from(showsMap.values())
      .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
      .slice(0, 10);

    return uniqueShows.map(show => ({
      score: show.rating?.average || 0,
      show: show
    }));
  } catch (error) {
    console.error('Error fetching recommended series:', error);
    return [];
  }
};
