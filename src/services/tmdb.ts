import { SearchResult, Show } from "@/types/show";

const isServer = typeof window === 'undefined';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

const getFetchUrl = (endpoint: string) => {
    if (isServer) {
        const separator = endpoint.includes('?') ? '&' : '?';
        return `https://api.themoviedb.org/3${endpoint}${separator}api_key=${TMDB_API_KEY}`;
    }
    return `/api/tmdb${endpoint}`;
};

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

interface TmdbCastMember {
    name: string;
    profile_path: string | null;
    character: string;
}

interface TmdbMovieDetailResponse {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    overview: string;
    vote_average: number;
    genres: { id: number; name: string }[];
    homepage: string;
    runtime: number;
    status: string;
    credits?: {
        cast: TmdbCastMember[];
    };
    success?: boolean;
}

export const TMDB_GENRES: Record<number, string> = {
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

export const discoverMoviesByGenre = async (genreId: number): Promise<SearchResult[]> => {
    // if (!TMDB_API_KEY) return [];

    try {
        const response = await fetch(getFetchUrl(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`));
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
        console.error('TMDB Discover Error:', error);
        return [];
    }
};

export const searchMovies = async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];

    try {
        const [res1] = await Promise.all([
            fetch(getFetchUrl(`/search/movie?query=${encodeURIComponent(query)}&page=1`)),
        ]);

        const [data1] = await Promise.all([res1.json()]);
        const results = [...(data1.results || [])];
        const limit = 10;

        return results.slice(0, limit).map((movie: TmdbItem) => ({
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
    // if (!TMDB_API_KEY) return [];

    try {
        const response = await fetch(
            getFetchUrl(`/trending/movie/day`)
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

export const getMovieDetails = async (id: number): Promise<Show | null> => {
    // API key check is now handled by the backend proxy

    try {
        const response = await fetch(getFetchUrl(`/movie/${id}`));
        const movie: TmdbMovieDetailResponse = await response.json();

        if (movie.success === false) return null;

        return {
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
            status: movie.status,
            genres: (movie.genres || []).map((g: { name: string }) => g.name),
            rating: { average: movie.vote_average ? Number((Math.round(movie.vote_average * 10) / 10).toFixed(1)) : null },
            summary: movie.overview,
            officialSite: movie.homepage,
            runtime: movie.runtime,
            source: 'tmdb',
            _embedded: {
                cast: (movie.credits?.cast || []).slice(0, 10).map((c: TmdbCastMember) => ({
                    person: {
                        name: c.name,
                        image: c.profile_path ? { medium: `https://image.tmdb.org/t/p/w185${c.profile_path}` } : null
                    },
                    character: c.character
                }))
            }
        };
    } catch (error) {
        console.error('TMDB Movie Details Error:', error);
        return null;
    }
};
