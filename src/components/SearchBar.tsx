import { useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";
import { SortFilterBar, SortOption } from './SortFiterBar';

interface SearchBarProps {
  onSearch: (query: string, skipNavigate?: boolean) => void;
  isLoading?: boolean;
  searchType: 'series' | 'movie' | 'all';
  onSearchTypeChange?: (type: 'series' | 'movie' | 'all', queryOverride?: string) => void;
  isLocalTab?: boolean;
  isUpcomingTab?: boolean;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  selectedGenres?: string[];
  onGenreChange?: (genres: string[]) => void;
  availableGenres?: string[];
  totalCount?: number | null;
  hideSort?: boolean;
  hideFilter?: boolean;
  // Controlled props
  query?: string;
  onQueryChange?: (val: string) => void;
}

export function SearchBar({
  onSearch,
  isLoading,
  searchType,
  onSearchTypeChange,
  isLocalTab,
  isUpcomingTab = false,
  sortBy = 'added-newest',
  onSortChange = () => { },
  selectedGenres = [],
  onGenreChange = () => { },
  availableGenres = [],
  totalCount = null,
  hideSort = true,
  hideFilter = true,
  query = "",
  onQueryChange = () => { },
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();



  // Handle live search with debouncing
  useEffect(() => {
    // Determine debounce time: faster for local search, slower for global API calls
    const debounceTime = isLocalTab ? 0 : 300;

    const timer = setTimeout(() => {
      // For global search, check if the query is already in the URL
      // Use window.location.search to avoid making location a dependency of the effect
      if (!isLocalTab) {
        const params = new URLSearchParams(window.location.search);
      if (query === (params.get('q') || '') || !query) return;
    } else if (!query) {
      return;
    }

    onSearch(query);
    }, debounceTime);

    return () => clearTimeout(timer);
  }, [query, isLocalTab, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };
  const handleClear = () => {
    onQueryChange('');
    onSearch('', false);
    if (onSearchTypeChange) {
      // Reset to search all without query
      router.push('/search/all');
    } else {
      router.push(`${pathname}`);
    }
  };

  const handleQueryChange = (newValue: string) => {
    onQueryChange(newValue);
    // When clearing, trigger immediate navigation/reset instead of waiting for debounce
    if (newValue === '') {
      onSearch('', false);
      // For search results tab, ensure we land on the base search page
      if (onSearchTypeChange) {
        router.push('/search/all');
      }
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={searchType === 'all' ? (t('search.placeholder.all') || 'Search all...') : (searchType === 'series' ? t('search.placeholder.series') : t('search.placeholder.movies'))}
          value={query}
          onChange={(e) => {
            handleQueryChange(e.target.value);
          }}
          className="pl-10 pr-10 bg-secondary border-border focus:border-primary focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </form>
      {!isLocalTab && (
        <SortFilterBar
          sortBy={sortBy}
          onSortChange={onSortChange}
          selectedGenres={selectedGenres}
          onGenreChange={onGenreChange}
          availableGenres={availableGenres}
          totalCount={totalCount}
          searchType={searchType}
          onSearchTypeChange={onSearchTypeChange}
          hideSort={hideSort}
          hideFilter={hideFilter}
        />
      )}
      {isLocalTab && !isUpcomingTab && (
        <SortFilterBar
          sortBy={sortBy}
          onSortChange={onSortChange}
          selectedGenres={selectedGenres}
          onGenreChange={onGenreChange}
          availableGenres={availableGenres}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
