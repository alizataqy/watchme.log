"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { ShowCard } from '@/components/ShowCard';
import { ShowCardSkeleton } from '@/components/ShowCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Star, LayoutGrid } from 'lucide-react';
import { Show, SearchResult } from '@/types/show';
import { DashboardShell } from '@/components/DashboardShell';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface SearchViewProps {
  initialSearchResults?: SearchResult[];
  initialRecommendations?: SearchResult[];
}

export default function SearchView({ initialSearchResults, initialRecommendations }: SearchViewProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const { 
    getShowStatus, 
    markAllEpisodesAsWatched, 
    updateShowStatus, 
    removeShow, 
    addShow,
    isInList,
    shows 
  } = useShowStorage();
  
  const [searchResults, setSearchResults] = useState<SearchResult[]>(initialSearchResults || []);
  const [recommendations, setRecommendations] = useState<SearchResult[]>(initialRecommendations || []);
  const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');
  const [hasSearched, setHasSearched] = useState(!!searchParams.get('q'));
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialSearchResults) {
      setSearchResults(initialSearchResults);
      setHasSearched(initialSearchResults.length > 0 || !!searchParams.get('q'));
    }
  }, [initialSearchResults, searchParams]);

  useEffect(() => {
    if (initialRecommendations) {
      setRecommendations(initialRecommendations);
    }
  }, [initialRecommendations]);

  const handleSearch = useCallback((query: string) => {
    const path = pathname.startsWith('/search') ? pathname : '/search/all';
    if (!query) {
      router.push(path);
    } else {
      router.push(`${path}?q=${encodeURIComponent(query)}`);
    }
  }, [pathname, router]);

  const handleSearchTypeChange = (type: 'series' | 'movie' | 'all') => {
    const pathMap = {
      all: 'all',
      series: 'tvseries',
      movie: 'movies'
    };
    const q = searchParams.get('q');
    const queryParam = q ? `?q=${encodeURIComponent(q)}` : '';
    router.push(`/search/${pathMap[type]}${queryParam}`);
  };

  const handleAddToWatchlist = (show: Show) => {
    addShow({ ...show, trackStatus: 'watchlist' });
    toast({
      title: t('toast.addedWatchlist'),
      description: `${show.name} ${t('toast.addedWatchlistDesc')}`,
    });
  };

  const handleMarkWatched = async (show: Show) => {
    await markAllEpisodesAsWatched(show.id, show.source);
    toast({
      title: t('toast.updated'),
      description: `${show.name} ${t('toast.markedAsWatched')}`,
    });
  };

  const handleMarkWatching = async (show: Show) => {
    await updateShowStatus(show.id, 'watching', show.source);
    toast({
      title: t('toast.updated'),
      description: `${show.name} ${t('toast.markedAsWatching')}`,
    });
  };

  const handleRemove = async (show: Show) => {
    await removeShow(show.id, show.source);
    toast({
      title: t('toast.removed'),
      description: `${show.name} ${t('toast.removedDesc')}`,
    });
  };

  const searchType = pathname.includes('tvseries') ? 'series' : pathname.includes('movies') ? 'movie' : 'all';

  return (
    <DashboardShell 
      activeTab="search"
      headerProps={{
        query: localQuery,
        onQueryChange: setLocalQuery,
        onSearch: handleSearch,
        searchType: searchType,
        onSearchTypeChange: handleSearchTypeChange,
        totalCount: hasSearched ? searchResults.length : recommendations.length,
        hideSort: true,
        hideFilter: true,
      }}
    >
      {isSearching ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShowCardSkeleton key={i} />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-3">
          {searchResults.map((result) => (
            <ShowCard
              key={`${result.show.source}-${result.show.id}`}
              show={result.show}
              isInList={isInList(result.show.id, result.show.source)}
              isSearch={true}
              currentStatus={getShowStatus(result.show.id, result.show.source)}
              onAddToWatchlist={() => handleAddToWatchlist(result.show)}
              onMarkWatched={() => handleMarkWatched(result.show)}
              onMarkWatching={() => handleMarkWatching(result.show)}
              onRemove={() => handleRemove(result.show)}
            />
          ))}
        </div>
      ) : !hasSearched && recommendations.length > 0 ? (
        <div className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              {t('index.recommendations').replace('{type}', searchType === 'all' ? 'TV Series & Movies' : (searchType === 'series' ? 'TV Series' : 'Movie'))}
            </h2>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => router.push('/genre')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Genre
            </Button>
          </div>

          {recommendations.map((result) => (
            <ShowCard
              key={`${result.show.source}-${result.show.id}`}
              show={result.show}
              isInList={isInList(result.show.id, result.show.source)}
              isSearch={true}
              currentStatus={getShowStatus(result.show.id, result.show.source)}
              onAddToWatchlist={() => handleAddToWatchlist(result.show)}
              onMarkWatched={() => handleMarkWatched(result.show)}
              onMarkWatching={() => handleMarkWatching(result.show)}
              onRemove={() => handleRemove(result.show)}
            />
          ))}
        </div>
      ) : (
        !hasSearched && <EmptyState type="search" />
      )}
      {hasSearched && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-12 text-muted-foreground">
          {t('index.noResults')}
        </div>
      )}
    </DashboardShell>
  );
}
