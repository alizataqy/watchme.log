import { ArrowUpDown, Filter, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";


export type SortOption = 'name-asc' | 'name-desc' | 'added-newest' | 'added-oldest' | 'rating-high' | 'rating-low';
export type SourceOption = 'tvmaze' | 'tmdb';
export type GenresOption = 'all-genre' | 'all-source';

interface SortFilterBarProps {
    sortBy: SortOption;
    onSortChange: (sort: SortOption) => void;
    selectedGenres: string[];
    onGenreChange: (genres: string[]) => void;
    availableGenres: string[];
    totalCount: number;
    searchType?: 'series' | 'movie' | 'all';
    onSearchTypeChange?: (type: 'series' | 'movie' | 'all', queryOverride?: string) => void;
    hideSort?: boolean;
    hideFilter?: boolean;
}

export const SortFilterBar = ({
    sortBy,
    onSortChange,
    selectedGenres,
    onGenreChange,
    availableGenres,
    totalCount,
    searchType,
    onSearchTypeChange,
    hideSort = false,
    hideFilter = false,
}: SortFilterBarProps) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const toggleGenre = (genre: string) => {
        if (selectedGenres.includes(genre)) {
            onGenreChange(selectedGenres.filter((g) => g !== genre));
        } else {
            onGenreChange([...selectedGenres, genre]);
        }
    };

    const hasActiveFilter = selectedGenres.length > 0;
    const hasActiveSort = sortBy !== 'added-newest';

    return (
        <div className="flex flex-col gap-3 mb-4 px-1">
            <div className="flex justify-between">
                <span className="flex items-center text-sm text-muted-foreground capitalize font-semibold">
                    {totalCount} {t('search.cards')}
                </span>
                {onSearchTypeChange && (
                    <div className="grid grid-cols-3 bg-secondary/50 gap-2 justify-center items-center px-2 w-full py-1 rounded-lg border border-border/50">
                        <button
                            onClick={() => onSearchTypeChange('all')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${searchType === 'all'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('search.all') || 'ALL'}
                        </button>
                        <button
                            onClick={() => onSearchTypeChange('series')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${searchType === 'series'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('search.series') || 'SERIES'}
                        </button>
                        <button
                            onClick={() => onSearchTypeChange('movie')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${searchType === 'movie'
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('search.movies') || 'MOVIES'}
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Genre Explorer Button */}


                    {/* Sort */}
                    {!hideSort && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={hasActiveSort ? 'default' : 'ghost'} size="sm" className="h-8 gap-1.5">
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                    Sort
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>{t('sort.name')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
                                    <DropdownMenuRadioItem value="name-asc" className={sortBy === 'name-asc' ? 'bg-primary/15 text-primary font-medium' : ''}>{t('sort.nameAsc')}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="name-desc" className={sortBy === 'name-desc' ? 'bg-primary/15 text-primary font-medium' : ''}>{t('sort.nameDesc')}</DropdownMenuRadioItem>
                                    <DropdownMenuLabel>{t('sort.name.date')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioItem value="added-newest" className={sortBy === 'added-newest' ? 'bg-primary/15 text-primary font-medium' : ''}>{t('sort.dateAddedDesc')}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="added-oldest" className={sortBy === 'added-oldest' ? 'bg-primary/15 text-primary font-medium' : ''}>{t('sort.dateAddedAsc')}</DropdownMenuRadioItem>
                                    <DropdownMenuLabel>{t('sort.name.rating')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioItem value="rating-high" className={sortBy === 'rating-high' ? 'bg-primary/15 text-primary font-medium' : ''}>{t('sort.ratingDesc')}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="rating-low" className={sortBy === 'rating-low' ? 'bg-primary/15 text-primary font-medium' : ''}>{t('sort.ratingAsc')}</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {/* Filter Genre */}
                    {!hideFilter && availableGenres.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant={hasActiveFilter ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 gap-1.5"
                                >
                                    <Filter className="h-3.5 w-3.5" />
                                    Filter
                                    {hasActiveFilter && (
                                        <span className="ml-1 bg-primary-foreground text-primary text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                            {selectedGenres.length}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                                <DropdownMenuLabel>Filter Genre</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {availableGenres.map((genre) => {
                                    const isActive = selectedGenres.includes(genre);
                                    return (
                                        <DropdownMenuItem
                                            key={genre}
                                            className={`flex items-center gap-2 mb-2 cursor-pointer ${isActive ? 'bg-primary/15 text-primary font-medium' : ''}`}
                                            onSelect={(e) => { e.preventDefault(); toggleGenre(genre); }}
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isActive ? 'bg-primary' : 'bg-transparent border border-muted-foreground/40'}`} />
                                            {genre}
                                        </DropdownMenuItem>
                                    );
                                })}
                                {hasActiveFilter && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full text-xs font-bold"
                                            onClick={() => onGenreChange([])}
                                        >
                                            Reset Filter
                                        </Button>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </div>
    );
};
