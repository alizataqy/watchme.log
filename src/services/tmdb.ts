import { SearchResult, Show } from "@/types/show";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';

interface TmdbItem {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    overview: string;
    vote_average: number;
    genre_ids: number[];
}

const TMDB_GENRES: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

const getGenresFromIds = (ids: number[]): string[] => {
    return (ids || []).map(id => TMDB_GENRES[id]).filter(Boolean);
};

export const searchMovies = async (query: string): Promise<SearchResult[]> => {
    if (!query || !TMDB_API_KEY) return [];

    try {
        const response = await fetch(
            `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        return (data.results || []).map((movie: TmdbItem) => ({
            score: movie.vote_average,
            show: {
                id: movie.id,
                name: movie.title || movie.name || '',
                image: movie.poster_path
                    ? {
                        medium: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                        original: `https://image.tmdb.org/t/p/original${movie.poster_path}`,
                    }
                    : null,
                premiered: movie.release_date || movie.first_air_date || null,
                ended: null,
                status: 'Released',
                genres: getGenresFromIds(movie.genre_ids),
                rating: { average: movie.vote_average ? Number((Math.round(movie.vote_average * 10) / 10).toFixed(1)) : null },
                summary: movie.overview,
                source: 'tmdb',
            } as unknown as Show
        }));
    } catch (error) {
        console.error('TMDB Search Error:', error);
        return [];
    }
};

export const getTrendingMovies = async (): Promise<SearchResult[]> => {
    if (!TMDB_API_KEY) return [];

    try {
        const response = await fetch(
            `${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();

        return (data.results || []).slice(0, 10).map((movie: TmdbItem) => ({
            score: movie.vote_average,
            show: {
                id: movie.id,
                name: movie.title || movie.name || '',
                image: movie.poster_path
                    ? {
                        medium: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                        original: `https://image.tmdb.org/t/p/original${movie.poster_path}`,
                    }
                    : null,
                premiered: movie.release_date || movie.first_air_date || null,
                ended: null,
                status: 'Released',
                genres: getGenresFromIds(movie.genre_ids),
                rating: { average: movie.vote_average ? Number((Math.round(movie.vote_average * 10) / 10).toFixed(1)) : null },
                summary: movie.overview,
                source: 'tmdb',
            } as unknown as Show
        }));
    } catch (error) {
        console.error('TMDB Trending Movies Error:', error);
        return [];
    }
};
