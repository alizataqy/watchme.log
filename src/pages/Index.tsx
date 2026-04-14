import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, Eye, Search as SearchIcon, CheckCircle, Star, Bell, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { ShowCard } from '@/components/ShowCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useAuth } from '@/hooks/useAuth';
import { SearchResult, Show, TrackedShow } from '@/types/show';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { searchMovies, getTrendingMovies } from '@/services/tmdb';
import { getRecommendedSeries } from '@/services/tvmaze';
import { searchUnified } from '@/services/aggregator';
import { Calendar } from 'lucide-react';
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
    resetWatchedEpisodes,
    markAllEpisodesAsWatched,
    isInList,
    getShowStatus,
    getShowDbId,
    shows, // Need access to all shows for upcoming logic
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
      // Check if modal has already been shown in this session
      const hasShownModal = sessionStorage.getItem('desktop-experience-modal-shown');
      if (!hasShownModal) {
        setShowDesktopModal(true);
      }
    }

    if (user && !authLoading && !isLoading) {
      const hasOnboarded = user.user_metadata?.has_onboarded || localStorage.getItem('has_onboarded') === 'true';
      if (!hasOnboarded && shows.length === 0) {
        setShowOnboarding(true);
      }
    }
  }, [user, authLoading, navigate, isMobile, isLoading, shows.length]);

  const searchRequestId = useRef(0);
  const recommendationsRequestId = useRef(0);
  const lastSearchedQueryRef = useRef('');

  const handleSearch = useCallback(async (query: string, skipNavigate = false) => {
    const requestId = ++searchRequestId.current;
    lastSearchedQueryRef.current = query; // Track last searched query to prevent duplicate triggers
    setLocalQuery(query);

    if (activeTab !== 'search') {
      return;
    }

    const pathMap = {
      all: 'all',
      series: 'tvseries',
      movie: 'movies'
    };

    if (!query) {
      setSearchResults([]);
      setHasSearched(false);
      if (!skipNavigate) {
        navigate(`/search/${pathMap[searchType]}`, { replace: true });
      }
      return;
    }

    navigate(`/search/${pathMap[searchType]}?q=${encodeURIComponent(query)}`, { replace: true });

    setIsSearching(true);
    setHasSearched(true);
    try {
      if (searchType === 'all') {
        const results = await searchUnified(query);
        if (requestId !== searchRequestId.current) return;
        setSearchResults(results);
      } else if (searchType === 'series') {
        const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (requestId !== searchRequestId.current) return;

        const results = data.map((r: SearchResult) => ({
          ...r,
          show: { ...r.show, source: 'tvmaze' as const }
        }));
        setSearchResults(results);
      } else {
        const results = await searchMovies(query);
        if (requestId !== searchRequestId.current) return;
        setSearchResults(results);
      }
    } catch (error) {
      if (requestId === searchRequestId.current) {
        toast({
          title: t('common.error'),
          description: t('toast.errorSearch'),
          variant: 'destructive',
        });
      }
    } finally {
      if (requestId === searchRequestId.current) {
        setIsSearching(false);
      }
    }
  }, [activeTab, searchType, toast, t, navigate]);

  const fetchRecommendations = useCallback(async () => {
    const requestId = ++recommendationsRequestId.current;
    setIsLoadingRecs(true);
    try {
      if (searchType === 'all') {
        const [series, movies] = await Promise.all([
          getRecommendedSeries(),
          getTrendingMovies()
        ]);
        if (requestId !== recommendationsRequestId.current) return;
        setRecommendations([...series, ...movies].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20));
      } else if (searchType === 'series') {
        const results = await getRecommendedSeries();
        if (requestId !== recommendationsRequestId.current) return;
        setRecommendations(results);
      } else {
        const results = await getTrendingMovies();
        if (requestId !== recommendationsRequestId.current) return;
        setRecommendations(results);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      if (requestId === recommendationsRequestId.current) {
        setIsLoadingRecs(false);
      }
    }
  }, [searchType]);

  useEffect(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q') || '';

    if (query && query !== lastSearchedQueryRef.current && activeTab === 'search') {
      setLocalQuery(query);
      handleSearch(query);
    } else if (!query && localQuery && activeTab === 'search') {
      setLocalQuery('');
      setSearchResults([]);
      setHasSearched(false);
    }

    if (path.startsWith('/search/')) {
      const type = path.split('/').pop();
      if (type === 'all') setSearchType('all');
      else if (type === 'tvseries') setSearchType('series');
      else if (type === 'movies') setSearchType('movie');
    } else if (path === '/search') {
      setSearchType('all');
      navigate(`/search/all${location.search}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, navigate, activeTab, handleSearch]);


  // Consolidate search and recommendation triggers
  useEffect(() => {
    if (activeTab !== 'search') return;

    if (hasSearched && localQuery) {
      handleSearch(localQuery);
    } else if (!hasSearched) {
      fetchRecommendations();
    }
    // We only want to re-run this when the search type or recommended-source changes
    // or when we first land on/return to the search tab.
    // Adding handleSearch/fetchRecommendations to deps is safe as they are memoized.
    // hasSearched/localQuery are omitted to avoid double-triggering during a normal search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType, activeTab, fetchRecommendations, handleSearch]);

  const handleAddToWatchlist = (show: Show) => {
    addShow({
      ...show,
      trackStatus: 'watchlist',
    });
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
        await addShow({
          ...show,
          trackStatus: 'watched',
        });
        // If it's a new show being marked as watched directly, also mark all episodes
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
        title: 'Gagal Memperbarui',
        description: 'Terjadi kesalahan saat menandai sudah ditonton.',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = (show: Show) => {
    removeShow(show.id, show.source);
    toast({
      title: t('toast.removed'),
      description: `${show.name} ${t('toast.removedDesc')}`,
    });
  };

  const handleMoveToWatchlist = (show: TrackedShow) => {
    updateShowStatus(show.id, 'watchlist', show.source);
    toast({
      title: t('toast.moveToWatchlist'),
      description: `${show.name} ${t('toast.moveToWatchlistDesc')}`,
    });
  };

  const handleMarkWatching = async (show: Show) => {
    try {
      const currentStatus = getShowStatus(show.id, show.source);

      if (isInList(show.id, show.source)) {
        // If moving from watched to watching, reset episodes
        if (currentStatus === 'watched' && show.source === 'tvmaze') {
          await resetWatchedEpisodes(show.id, show.source);
        }
        await updateShowStatus(show.id, 'watching', show.source);
      } else {
        await addShow({
          ...show,
          trackStatus: 'watching',
        });
      }
      toast({
        title: t('toast.watching'),
        description: `${show.name} ${t('toast.watchingDesc')}${currentStatus === 'watched' ? ' Episode direset.' : ''}`,
      });
      setActiveTab('watching');
    } catch (error) {
      toast({
        title: 'Gagal Menyimpan',
        description: 'Pastikan database Anda mendukung status "watching" (Check Constraint).',
        variant: 'destructive',
      });
    }
  };

  const handleToggleEpisode = async (showId: number, season: number, episode: number, name: string, airdate: string, source: string = 'tvmaze') => {
    const status = getShowStatus(showId, source);
    if (status === 'watchlist') {
      try {
        await updateShowStatus(showId, 'watching', source);
        toast({
          title: 'Status Diperbarui',
          description: `Acara dipindahkan ke "Watching" karena Anda mulai menonton episode.`,
        });
      } catch (error) {
        console.error('Error updating status during toggle:', error);
      }
    }
    toggleEpisode(showId, season, episode, name, airdate, source);
  };

  const handleToggleSeasonBulk = async (
    showId: number,
    episodes: { season: number; episode: number; episodeName: string; airdate: string }[],
    allWatched: boolean,
    source: string = 'tvmaze'
  ) => {
    const status = getShowStatus(showId, source);

    if (status === 'watchlist' && !allWatched) {
      try {
        await updateShowStatus(showId, 'watching', source);
      } catch (error) {
        console.error('Error updating status during bulk toggle:', error);
      }
    }

    await toggleEpisodesBulk(showId, episodes, source);

    const seasonNumber = episodes[0]?.season;
    if (seasonNumber === undefined) {
      toast({
        title: allWatched ? t('toast.seasonUnchecked') : t('toast.seasonFinished'),
        description: allWatched
          ? t('toast.seasonUncheckedDescUnknown')
          : t('toast.seasonFinishedDescUnknown'),
      });
      return;
    }

    toast({
      title: allWatched ? t('toast.seasonUnchecked') : t('toast.seasonFinished'),
      description: allWatched
        ? t('toast.seasonUncheckedDesc').replace('{number}', String(seasonNumber))
        : t('toast.seasonFinishedDesc').replace('{number}', String(seasonNumber)),
    });
  };

  const { upcomingShows, recentlyAired, isLoading: loadingUpcoming } = useUpcomingShows();

  const filteredWatching = useFuzzySearch(watching, localQuery);
  const filteredWatchlist = useFuzzySearch(watchlist, localQuery);
  const filteredWatched = useFuzzySearch(watched, localQuery);
  const filteredUpcoming = useFuzzySearch(upcomingShows, localQuery);
  const filteredRecentlyAired = useFuzzySearch(recentlyAired, localQuery);

  const watchingSortFilter = useSortFilter(filteredWatching);
  const watchlistSortFilter = useSortFilter(filteredWatchlist);
  const watchedSortFilter = useSortFilter(filteredWatched);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Home"
        description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
      />
      {/* Header */}
      <Header
        onSearch={handleSearch}
        isSearching={isSearching}
        searchType={searchType}
        onSearchTypeChange={handleSearchTypeChange}
        query={localQuery}
        onQueryChange={setLocalQuery}
        isLocalTab={activeTab !== 'search'}
        {...(activeTab === 'watching' ? {
          sortBy: watchingSortFilter.sortBy,
          onSortChange: watchingSortFilter.onSortChange,
          selectedGenres: watchingSortFilter.selectedGenres,
          onGenreChange: watchingSortFilter.onGenreChange,
          availableGenres: watchingSortFilter.availableGenres,
          totalCount: watchingSortFilter.sortedAndFiltered.length,
        } : activeTab === 'watchlist' ? {
          sortBy: watchlistSortFilter.sortBy,
          onSortChange: watchlistSortFilter.onSortChange,
          selectedGenres: watchlistSortFilter.selectedGenres,
          onGenreChange: watchlistSortFilter.onGenreChange,
          availableGenres: watchlistSortFilter.availableGenres,
          totalCount: watchlistSortFilter.sortedAndFiltered.length,
        } : activeTab === 'watched' ? {
          sortBy: watchedSortFilter.sortBy,
          onSortChange: watchedSortFilter.onSortChange,
          selectedGenres: watchedSortFilter.selectedGenres,
          onGenreChange: watchedSortFilter.onGenreChange,
          availableGenres: watchedSortFilter.availableGenres,
          totalCount: watchedSortFilter.sortedAndFiltered.length,
        } : activeTab === 'search' ? {
          totalCount: hasSearched ? searchResults.length : recommendations.length,
          hideSort: true,
          hideFilter: true,
          isUpcomingTab: false,
        } : activeTab === 'upcoming' ? {
          isUpcomingTab: true,
          hideSort: true,
          hideFilter: true,
          totalCount: null
        } : {
          hideSort: true,
          hideFilter: true,
          totalCount: 0,
          isUpcomingTab: false,
        })}
      />

      {/* Main Content */}
      <main className={`container py-4 ${isMobile ? 'pb-20' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {isMobile ? (
            // Mobile Bottom Navigation Tabs
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
          ) : (
            // Desktop Tabs
            <TabsList className="w-full grid grid-cols-5 mb-8">
              <TabsTrigger value="search" className="flex items-center gap-1.5">
                <SearchIcon className="h-4 w-4" />
                <span>{t('nav.search')}</span>
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{t('nav.watchlist')}</span>
                {watchlist.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watchlist.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="watching" className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{t('nav.watching')}</span>
                {watching.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watching.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{t('nav.upcoming')}</span>
                {upcomingShows.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {upcomingShows.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="watched" className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                <span>{t('nav.watched')}</span>
                {watched.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watched.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="search" className="mt-0">
            <SEO
              title="Search"
              description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
            />
            {isSearching || isLoadingRecs ? (
              <LoadingSpinner />
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
                    onClick={() => navigate('/genre')}
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
          </TabsContent>

          <TabsContent value="upcoming" className="animate-fade-in outline-none">
            <SEO
              title="Upcoming"
              description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi tayang."
            />
            {loadingUpcoming ? (
              <LoadingSpinner />
            ) : filteredUpcoming.length === 0 && filteredRecentlyAired.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <EmptyState type="upcoming" />
                {shows.length > 0 && localQuery && (
                  <p className="mt-4 text-sm text-muted-foreground">{t('index.noSchedule').replace('{query}', localQuery)}</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredUpcoming.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-primary px-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('nav.upcoming')}
                    </h2>
                    {filteredUpcoming.map((show) => (
                      <ShowCard
                        key={`${show.source}-${show.id}`}
                        show={show}
                        isInList={true}
                        currentStatus={getShowStatus(show.id, show.source)}
                        watchedEpisodes={watchedEpisodes[show.dbId!] || []}
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

                {filteredRecentlyAired.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold px-1 flex items-center text-destructive gap-2">
                      <Clock className="h-4 w-4" />
                      {t('index.recentlyAired')}
                    </h2>
                    {filteredRecentlyAired.map((show) => (
                      <ShowCard
                        key={`${show.source}-${show.id}`}
                        show={show}
                        isInList={true}
                        currentStatus={getShowStatus(show.id, show.source)}
                        watchedEpisodes={watchedEpisodes[show.dbId!] || []}
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
            {filteredWatching.length > 0 ? (
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
            {filteredWatchlist.length > 0 ? (
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
            {filteredWatched.length > 0 ? (
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
        {/* Desktop Experience Modal */}
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

      {/* Mobile Bottom Navigation */}
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
