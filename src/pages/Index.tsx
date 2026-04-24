import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { ShowCard } from '@/components/ShowCard';
import { EmptyState } from '@/components/EmptyState';
import { ShowCardSkeleton } from '@/components/ShowCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useAuth } from '@/hooks/useAuth';
import { SearchResult, Show, Episode } from '@/types/show';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { searchMovies, getTrendingMovies } from '@/services/tmdb';
import { getRecommendedSeries } from '@/services/tvmaze';
import { searchUnified } from '@/services/aggregator';
import { MobileNav } from '@/components/MobileNav';
import SEO from '@/components/SEO';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { useUpcomingShows } from '@/hooks/useUpcomingShows';
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSortFilter } from "@/hooks/useSortFilter";
import { Onboarding } from "@/components/Onboarding";
import { Bell, Calendar, CheckCircle } from 'lucide-react';

interface TVMazeSearchItem {
  show: {
    id: number;
    name: string;
    summary: string | null;
    image: { medium?: string; original?: string } | null;
    rating: { average: number | null };
    genres: string[];
    status: string;
    premiered: string | null;
  }
}

const Index = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchType, setSearchType] = useState<'series' | 'movie' | 'all'>('all');
  const [recommendations, setRecommendations] = useState<SearchResult[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const {
    watchlist,
    watching,
    watched,
    watchedEpisodes,
    isLoading,
    addShow,
    removeShow,
    updateShowStatus,
    toggleEpisode,
    toggleEpisodesBulk,
    markAllEpisodesAsWatched,
    isInList,
    getShowStatus,
  } = useShowStorage();

  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  const getTabFromPath = (path: string) => {
    const parts = path.substring(1).split('/');
    const p = parts[0];
    if (p === 'search') return 'search';
    return ['watchlist', 'upcoming', 'watched'].includes(p) ? p : 'watching';
  };

  const activeTab = getTabFromPath(location.pathname);

  const setActiveTab = (tab: string) => {
    if (tab === 'search') {
      navigate('/search/all');
    } else {
      navigate(tab === 'watching' ? '/watching' : `/${tab}`);
    }
  };

  const handleSearchTypeChange = (type: 'series' | 'movie' | 'all', queryOverride?: string) => {
    const pathMap = {
      all: 'all',
      series: 'tvseries',
      movie: 'movies'
    };
    const q = queryOverride !== undefined ? queryOverride : localQuery;
    const queryParam = q ? `?q=${encodeURIComponent(q)}` : '';
    navigate(`/search/${pathMap[type]}${queryParam}`);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user && !isMobile) {
      const hasShownModal = sessionStorage.getItem('desktop-experience-modal-shown');
      if (!hasShownModal) {
        setShowDesktopModal(true);
      }
    }
  }, [authLoading, user, navigate, isMobile]);

  const searchCache = useRef<Record<string, SearchResult[]>>({});
  const lastSearchRef = useRef<{ query: string, type: string } | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const type = searchType;
    const cacheKey = `${type}-${query.toLowerCase().trim()}`;
    if (searchCache.current[cacheKey]) {
      setSearchResults(searchCache.current[cacheKey]);
      setHasSearched(true);
      return;
    }

    if (lastSearchRef.current?.query === query && lastSearchRef.current?.type === type) return;
    lastSearchRef.current = { query, type };

    setIsSearching(true);
    setHasSearched(true);
    try {
      let data: SearchResult[] = [];
      if (type === 'all') {
        data = await searchUnified(query);
      } else if (type === 'movie') {
        data = await searchMovies(query);
      } else {
        const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const json = await response.json();
        data = json.map((item: TVMazeSearchItem) => ({
          show: {
            id: item.show.id,
            name: item.show.name,
            summary: item.show.summary,
            image: item.show.image?.medium || item.show.image?.original,
            rating: item.show.rating?.average,
            genres: item.show.genres,
            status: item.show.status,
            premiered: item.show.premiered,
            source: 'tvmaze' as const
          }
        }));
      }
      searchCache.current[cacheKey] = data;
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast, t, searchType]);

  const fetchRecommendations = useCallback(async () => {
    if (recommendations.length > 0) return;
    setIsLoadingRecs(true);
    try {
      const [series, movies] = await Promise.all([
        getRecommendedSeries(),
        getTrendingMovies()
      ]);
      const combined = [...series, ...movies].sort(() => Math.random() - 0.5).slice(0, 10);
      setRecommendations(combined);
    } catch (error) {
      console.error('Recommendations error:', error);
    } finally {
      setIsLoadingRecs(false);
    }
  }, [recommendations.length]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q') || '';
    setLocalQuery(query);

    const path = location.pathname;
    if (path.startsWith('/search/')) {
      const type = path.split('/')[2];
      const typeMap: Record<string, 'series' | 'movie' | 'all'> = {
        all: 'all',
        tvseries: 'series',
        movies: 'movie'
      };
      setSearchType(typeMap[type] || 'all');

      if (query) {
        handleSearch(query);
      } else {
        setSearchResults([]);
        setHasSearched(false);
        fetchRecommendations();
      }
    }
  }, [location.pathname, location.search, handleSearch, fetchRecommendations]);

  useEffect(() => {
    if (activeTab === 'search' && !localQuery) {
      fetchRecommendations();
    }
  }, [activeTab, localQuery, fetchRecommendations]);

  const handleAddToWatchlist = (show: Show) => {
    addShow({ ...show, trackStatus: 'watchlist' });
    toast({
      title: t('toast.addedWatchlist'),
      description: `${show.name} ${t('toast.addedWatchlistDesc')}`,
    });
  };

  const handleMarkWatched = async (show: Show) => {
    try {
      if (isInList(show.id, show.source)) {
        await markAllEpisodesAsWatched(show.id, show.source);
      } else {
        await addShow({ ...show, trackStatus: 'watched' });
        if (show.source === 'tvmaze') {
          await markAllEpisodesAsWatched(show.id, show.source);
        }
      }
      toast({
        title: t('toast.markWatched'),
        description: `${show.name} ${t('toast.markWatchedDesc')}`,
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkWatching = async (show: Show) => {
    addShow({ ...show, trackStatus: 'watching' });
    toast({
      title: t('toast.watching'),
      description: `${show.name} ${t('toast.watchingDesc')}`,
    });
  };

  const handleMoveToWatchlist = (show: Show) => {
    updateShowStatus(show.id, 'watchlist', show.source);
    toast({
      title: t('toast.addedWatchlist'),
      description: `${show.name} ${t('toast.addedWatchlistDesc')}`,
    });
  };

  const handleRemove = (show: Show) => {
    removeShow(show.id, show.source);
    toast({
      title: t('toast.removed'),
      description: `${show.name} ${t('toast.removedDesc')}`,
    });
  };

  const handleToggleEpisode = async (showId: number | string, season: number, number: number, name: string, airdate: string, source: 'tvmaze' | 'tmdb') => {
    try {
      await toggleEpisode(Number(showId), season, number, name, airdate, source);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const handleToggleSeasonBulk = async (showId: number | string, episodes: Episode[], allWatched: boolean, source: 'tvmaze' | 'tmdb') => {
    try {
      await toggleEpisodesBulk(Number(showId), episodes, source);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const { upcomingShows, recentlyAired, isLoading: loadingUpcoming } = useUpcomingShows();

  const watchlistFuzzy = useFuzzySearch(watchlist, localQuery, { keys: ['name'] });
  const watchingFuzzy = useFuzzySearch(watching, localQuery, { keys: ['name'] });
  const watchedFuzzy = useFuzzySearch(watched, localQuery, { keys: ['name'] });
  const upcomingFuzzy = useFuzzySearch(upcomingShows, localQuery, { keys: ['name'] });
  const recentlyAiredFuzzy = useFuzzySearch(recentlyAired, localQuery, { keys: ['name'] });

  const watchingSortFilter = useSortFilter(watchingFuzzy);
  const watchlistSortFilter = useSortFilter(watchlistFuzzy);
  const watchedSortFilter = useSortFilter(watchedFuzzy);

  const currentSortFilter = 
    activeTab === 'watching' ? watchingSortFilter :
    activeTab === 'watchlist' ? watchlistSortFilter :
    activeTab === 'watched' ? watchedSortFilter : 
    null;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen container py-4">
        <div className="mt-20 space-y-4">
          <Skeleton className="h-10 w-full mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ShowCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        onSearch={handleSearch} 
        isSearching={isSearching}
        searchType={searchType}
        onSearchTypeChange={handleSearchTypeChange}
        query={localQuery}
        onQueryChange={setLocalQuery}
        isLocalTab={activeTab !== 'search' && activeTab !== 'upcoming'}
        sortBy={currentSortFilter?.sortBy}
        onSortChange={currentSortFilter?.onSortChange}
        selectedGenres={currentSortFilter?.selectedGenres}
        onGenreChange={currentSortFilter?.onGenreChange}
        availableGenres={currentSortFilter?.availableGenres}
        totalCount={currentSortFilter?.sortedAndFiltered.length}
      />

      <main className="container px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-4 w-full max-w-[400px]">
              <TabsTrigger value="search" className="text-xs sm:text-sm">
                {t('tabs.search')}
              </TabsTrigger>
              <TabsTrigger value="watching" className="text-xs sm:text-sm">
                {t('tabs.watching')}
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="text-xs sm:text-sm">
                {t('tabs.watchlist')}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                {t('tabs.upcoming')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="mt-0">
            <SEO
              title="Search"
              description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
            />
            {isSearching || isLoadingRecs ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ShowCardSkeleton key={i} />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-medium text-muted-foreground">Results</h2>
                  <div className="flex gap-2">
                    {(['all', 'series', 'movie'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleSearchTypeChange(type)}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          searchType === type 
                            ? 'bg-primary text-primary-foreground font-medium' 
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
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
            ) : hasSearched ? (
              <div className="flex flex-col items-center justify-center py-12">
                <EmptyState type="search" />
                <p className="mt-4 text-sm text-muted-foreground">{t('index.noResults').replace('{query}', localQuery)}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {recommendations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-medium text-muted-foreground">{t('index.recommendations')}</h2>
                      <div className="flex gap-2">
                        {(['all', 'series', 'movie'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => handleSearchTypeChange(type)}
                            className={`text-xs px-2 py-1 rounded-md transition-colors ${
                              searchType === type 
                                ? 'bg-primary text-primary-foreground font-medium' 
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
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
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0">
            <SEO
              title="Upcoming & Recently Aired"
              description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
            />
            {loadingUpcoming ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ShowCardSkeleton key={i} />
                ))}
              </div>
            ) : upcomingFuzzy.length === 0 && recentlyAiredFuzzy.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <EmptyState type="upcoming" />
              </div>
            ) : (
              <div className="space-y-8">
                {upcomingFuzzy.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('index.upcoming')}
                    </h2>
                    {upcomingFuzzy.map((show) => (
                      <ShowCard
                        key={show.id}
                        show={show}
                        isInList={true}
                        currentStatus={getShowStatus(show.id, show.source)}
                        watchedEpisodes={watchedEpisodes[show.dbId!] || []}
                        showEpisodeTracking={true}
                        onMarkWatched={() => handleMarkWatched(show)}
                        onMarkWatching={() => handleMarkWatching(show)}
                        onRemove={() => handleRemove(show)}
                        onToggleEpisode={(season, episode, name, airdate) =>
                          handleToggleEpisode(show.id, season, episode, name, airdate, show.source)
                        }
                        isUpcomingView={true}
                      />
                    ))}
                  </div>
                )}

                {recentlyAiredFuzzy.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {t('index.recentlyAired')}
                    </h2>
                    {recentlyAiredFuzzy.map((show) => (
                      <ShowCard
                        key={show.id}
                        show={show}
                        isInList={true}
                        currentStatus={getShowStatus(show.id, show.source)}
                        watchedEpisodes={watchedEpisodes[show.dbId!] || []}
                        showEpisodeTracking={true}
                        onMarkWatched={() => handleMarkWatched(show)}
                        onMarkWatching={() => handleMarkWatching(show)}
                        onRemove={() => handleRemove(show)}
                        onToggleEpisode={(season, episode, name, airdate) =>
                          handleToggleEpisode(show.id, season, episode, name, airdate, show.source)
                        }
                        isUpcomingView={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watching" className="mt-0">
            <SEO
              title="Watching"
              description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
            />
            {watchingFuzzy.length > 0 ? (
              <div className="space-y-3">
                {watchingSortFilter.sortedAndFiltered.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    isInList={true}
                    currentStatus="watching"
                    watchedEpisodes={watchedEpisodes[show.dbId!] || []}
                    showEpisodeTracking={true}
                    onMarkWatched={() => handleMarkWatched(show)}
                    onRemove={() => handleRemove(show)}
                    onMarkWatching={() => handleMarkWatching(show)}
                    onToggleEpisode={(season, episode, name, airdate) =>
                      handleToggleEpisode(show.id, season, episode, name, airdate, show.source)
                    }
                    onToggleSeasonBulk={(episodes, allWatched) =>
                      handleToggleSeasonBulk(show.id, episodes, allWatched, show.source)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <EmptyState type="watching" />
                {watching.length > 0 && localQuery && (
                  <p className="mt-4 text-sm text-muted-foreground">{t('index.noWatching').replace('{query}', localQuery)}</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist" className="mt-0">
            <SEO
              title="Watchlist"
              description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
            />
            {watchlistFuzzy.length > 0 ? (
              <div className="space-y-3">
                {watchlistSortFilter.sortedAndFiltered.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    isInList={true}
                    currentStatus="watchlist"
                    watchedEpisodes={watchedEpisodes[show.dbId!] || []}
                    showEpisodeTracking={true}
                    onMarkWatched={() => handleMarkWatched(show)}
                    onMarkWatching={() => handleMarkWatching(show)}
                    onRemove={() => handleRemove(show)}
                    onToggleEpisode={(season, episode, name, airdate) =>
                      handleToggleEpisode(show.id, season, episode, name, airdate, show.source)
                    }
                    onToggleSeasonBulk={(episodes, allWatched) =>
                      handleToggleSeasonBulk(show.id, episodes, allWatched, show.source)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <EmptyState type="watchlist" />
                {watchlist.length > 0 && localQuery && (
                  <p className="mt-4 text-sm text-muted-foreground">{t('index.noWatchlist').replace('{query}', localQuery)}</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watched" className="mt-0">
            <SEO
              title="Watched"
              description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
            />
            {watchedFuzzy.length > 0 ? (
              <div className="space-y-3">
                {watchedSortFilter.sortedAndFiltered.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    isInList={true}
                    currentStatus="watched"
                    watchedEpisodes={watchedEpisodes[show.dbId!] || []}
                    showEpisodeTracking={true}
                    onAddToWatchlist={() => handleMoveToWatchlist(show)}
                    onMarkWatching={() => handleMarkWatching(show)}
                    onRemove={() => handleRemove(show)}
                    onToggleEpisode={(season, episode, name, airdate) =>
                      handleToggleEpisode(show.id, season, episode, name, airdate, show.source)
                    }
                    onToggleSeasonBulk={(episodes, allWatched) =>
                      handleToggleSeasonBulk(show.id, episodes, allWatched, show.source)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <EmptyState type="watched" />
                {watched.length > 0 && localQuery && (
                  <p className="mt-4 text-sm text-muted-foreground">{t('index.noWatched').replace('{query}', localQuery)}</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {!isMobile && (
          <Dialog open={showDesktopModal} onOpenChange={(open) => {
            setShowDesktopModal(open);
            if (!open) {
              sessionStorage.setItem('desktop-experience-modal-shown', 'true');
            }
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="mt-1 flex w-full mx-auto justify-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification
                  </div>
                </DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  You'll get a <span className="text-primary font-bold italic"> better experience</span> if you open this app on your <span className="font-semibold text-foreground">mobile phone</span>.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-secondary/30 p-4 rounded-lg border border-border/50 text-sm text-muted-foreground italic">
                "WatchMe.log dirancang khusus untuk penggunaan mobile agar kamu bisa mencatat tontonanmu dengan cepat di mana saja!"
              </div>
              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowDesktopModal(false);
                    sessionStorage.setItem('desktop-experience-modal-shown', 'true');
                  }}
                >
                  Lanjutkan di Desktop
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Onboarding open={showOnboarding} onOpenChange={setShowOnboarding} />
      </main>

      {isMobile && (
        <MobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={{
            watching: watching.length,
            watchlist: watchlist.length,
            upcoming: upcomingShows.length,
            watched: watched.length
          }}
        />
      )}
    </div>
  );
};

export default Index;
