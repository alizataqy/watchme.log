import { SearchResult } from "@/types/show";
import { searchMovies } from "./tmdb";

export const searchUnified = async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];

    try {
        // Run all searches concurrently
        // Now only TVMaze for series and TMDB for movies (which already fetches 2 pages/40 results)
        const [tvmazeResults, tmdbMovieResults] = await Promise.all([
            fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .catch(() => []),
            searchMovies(query)
        ]);
        const processedTvmaze = (tvmazeResults || []).map((r: SearchResult) => ({
            ...r,
            show: { ...r.show, source: 'tvmaze' as const }
        }));

        const combined = [
            ...processedTvmaze,
            ...tmdbMovieResults
        ];

        return combined.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);

    } catch (error) {
        console.error('Unified Search Error:', error);
        return [];
    }
};
