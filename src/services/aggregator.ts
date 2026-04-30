import { SearchResult } from "@/types/show";
import { searchMovies } from "./tmdb";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();

const inFlightSearches = new Map<string, Promise<SearchResult[]>>();

export const searchUnified = async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];

    const cached = searchCache.get(query);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.results;
    }

    if (inFlightSearches.has(query)) {
        return inFlightSearches.get(query)!;
    }

    const searchPromise = (async () => {
        try {
            const [tvmazeResults, tmdbMovieResults] = await Promise.all([
                fetch(`/api/tvmaze/search/shows?q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .catch(() => []),
                searchMovies(query)
            ]);

            const processedTvmaze = (tvmazeResults || []).map((r: SearchResult) => ({
                ...r,
                show: { ...r.show, source: 'tvmaze' as const }
            }));

            const results = [
                ...processedTvmaze,
                ...tmdbMovieResults
            ].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);

            searchCache.set(query, { results, timestamp: Date.now() });

            return results;

        } catch (error) {
            console.error('Unified Search Error:', error);
            return [];
        } finally {
            inFlightSearches.delete(query);
        }
    })();

    inFlightSearches.set(query, searchPromise);
    return searchPromise;
};
