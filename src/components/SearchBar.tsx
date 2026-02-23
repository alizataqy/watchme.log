import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { useNavigate, useLocation } from 'react-router-dom';
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
}: SearchBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const { t } = useLanguage();

  // Sync query from URL on mount/location change
  // Only sync when on the search tab — prevents clearing the query when switching tabs
  useEffect(() => {
    if (!location.pathname.startsWith('/search')) return;
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    if (q !== query) {
      setQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Handle live search with debouncing
  useEffect(() => {
    // Determine debounce time: faster for local search, slower for global API calls
    const debounceTime = isLocalTab ? 250 : 1500;

    const timer = setTimeout(() => {
      // For global search, only trigger if query changed from URL to avoid infinite loops
      if (!isLocalTab) {
        const params = new URLSearchParams(location.search);
        if (query === (params.get('q') || '')) return;
      }

      onSearch(query);
    }, debounceTime);

    return () => clearTimeout(timer);
  }, [query, isLocalTab, onSearch, location.search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    // Use onSearchTypeChange to reset URL and State at once
    if (onSearchTypeChange) {
      onSearchTypeChange(searchType, '');
    } else {
      onSearch('', true);
      navigate(`${location.pathname}`);
    }
  };

  const handleQueryChange = (newValue: string) => {
    setQuery(newValue);
    // Navigate to /search/all whenever field is cleared by ANY method
    // (Backspace, Ctrl+Backspace, Select+Delete, paste empty, etc.)
    if (newValue === '') {
      if (onSearchTypeChange) {
        onSearchTypeChange(searchType, '');
      } else {
        onSearch('', true);
        navigate(`${location.pathname}`);
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
