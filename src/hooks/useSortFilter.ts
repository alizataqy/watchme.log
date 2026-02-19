import { SortOption } from "@/components/SortFiterBar";
import { TrackedShow } from "@/types/show";
import { useState, useMemo } from 'react';

const STORAGE_KEY = 'watchme-sort-preferece';

export const useSortFilter = (shows: TrackedShow[]) => {
    const [sortBy, setSortBy] = useState<SortOption>(
        () => (localStorage.getItem(STORAGE_KEY) as SortOption) || 'added-newest'
    );
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

    const handleSortChange = (sort: SortOption) => {
        setSortBy(sort);
        localStorage.setItem(STORAGE_KEY, sort);
    };

    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        shows.forEach((show) =>
            show.genres.forEach((g) => genres.add(g))
        );
        return Array.from(genres).sort();
    }, [shows]);
    const sortedAndFiltered = useMemo(() => {
        let result = [...shows];

        if (selectedGenres.length > 0) {
            result = result.filter((show) =>
                show.genres.some((g) => selectedGenres.includes(g))
            );
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'added-newest':
                    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
                case 'added-oldest':
                    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
                case 'rating-high':
                    return (b.rating?.average ?? 0) - (a.rating?.average ?? 0);
                case 'rating-low':
                    return (a.rating?.average ?? 0) - (b.rating?.average ?? 0);
                default:
                    return 0;
            }
        });
        return result;
    }, [shows, sortBy, selectedGenres]);

    return {
        sortBy,
        onSortChange: handleSortChange,
        selectedGenres,
        onGenreChange: setSelectedGenres,
        availableGenres,
        sortedAndFiltered,
    };
};
