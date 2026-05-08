import SearchView from "./SearchView";
import { searchUnified } from "@/services/aggregator";
import { searchMovies, getTrendingMovies } from "@/services/tmdb";
import { getRecommendedSeries } from "@/services/tvmaze";
import { SearchResult } from "@/types/show";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const type = resolvedParams.slug?.[0] || 'all';
  const query = (resolvedSearchParams.q as string) || '';

  let initialSearchResults: SearchResult[] = [];
  let initialRecommendations: SearchResult[] = [];

  try {
    if (query) {
      if (type === 'all') {
        initialSearchResults = await searchUnified(query);
      } else if (type === 'tvseries') {
        const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        initialSearchResults = data.map((r: any) => ({
          ...r,
          show: { ...r.show, source: 'tvmaze' }
        }));
      } else if (type === 'movies') {
        initialSearchResults = await searchMovies(query);
      }
    } else {
      if (type === 'all') {
        const [series, movies] = await Promise.all([
          getRecommendedSeries(),
          getTrendingMovies()
        ]);
        initialRecommendations = [...series, ...movies]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 20);
      } else if (type === 'tvseries') {
        initialRecommendations = await getRecommendedSeries();
      } else if (type === 'movies') {
        initialRecommendations = await getTrendingMovies();
      }
    }
  } catch (error) {
    console.error("SSR API Fetch Error:", error);
  }

  return (
    <SearchView 
      initialSearchResults={initialSearchResults} 
      initialRecommendations={initialRecommendations} 
    />
  );
}
