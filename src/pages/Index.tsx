import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Eye, Search as SearchIcon, CheckCircle, Star } from 'lucide-react';
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
import { Calendar } from 'lucide-react';
import { MobileNav } from '@/components/MobileNav';
import SEO from '@/components/SEO';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { useUpcomingShows } from '@/hooks/useUpcomingShows';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from 'lucide-react';

const Index = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchType, setSearchType] = useState<'series' | 'movie'>('series');
  const [recommendations, setRecommendations] = useState<SearchResult[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const [showDesktopModal, setShowDesktopModal] = useState(false);

  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const queryTab = searchParams.get('tab');
  const [activeTab, setActiveTabState] = useState(queryTab || 'search');

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

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
  }, [user, authLoading, navigate, isMobile]);

  const searchRequestId = useRef(0);
  const recommendationsRequestId = useRef(0);

  const handleSearch = useCallback(async (query: string) => {
    const requestId = ++searchRequestId.current;
    setLocalQuery(query);

    if (activeTab !== 'search') {
      return;
    }

    if (!query) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      if (searchType === 'series') {
        const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (requestId !== searchRequestId.current) return;

        // Fetch episodes for first few results to show next episode info
        const showsWithEpisodes = await Promise.all(
          data.slice(0, 5).map(async (result: { show: Show }) => {
            try {
              const showRes = await fetch(`https://api.tvmaze.com/shows/${result.show.id}?embed=nextepisode`);
              const showData = await showRes.json();
              return {
                ...result,
                show: { ...showData, source: 'tvmaze' }
              };
            } catch {
              return { ...result, show: { ...result.show, source: 'tvmaze' } };
            }
          })
        );

        if (requestId !== searchRequestId.current) return;

        // Add rest of results
        const remaining = data.slice(5).map((r: SearchResult) => ({ ...r, show: { ...r.show, source: 'tvmaze' } }));
        setSearchResults([...showsWithEpisodes, ...remaining]);
      } else {
        const results = await searchMovies(query);
        if (requestId !== searchRequestId.current) return;
        setSearchResults(results);
      }
    } catch (error) {
      if (requestId === searchRequestId.current) {
        toast({
          title: 'Error',
          description: 'Gagal mencari. Coba lagi nanti.',
          variant: 'destructive',
        });
      }
    } finally {
      if (requestId === searchRequestId.current) {
        setIsSearching(false);
      }
    }
  }, [activeTab, searchType, toast]);

  const fetchRecommendations = useCallback(async () => {
    const requestId = ++recommendationsRequestId.current;
    setIsLoadingRecs(true);
    try {
      if (searchType === 'series') {
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
      title: 'Ditambahkan ke Watchlist',
      description: `${show.name} berhasil ditambahkan.`,
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
        title: 'Ditandai Sudah Ditonton',
        description: `${show.name} ditandai sudah ditonton.`,
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
      title: 'Dihapus',
      description: `${show.name} dihapus dari daftar.`,
    });
  };

  const handleMoveToWatchlist = (show: TrackedShow) => {
    updateShowStatus(show.id, 'watchlist', show.source);
    toast({
      title: 'Dipindahkan ke Watchlist',
      description: `${show.name} dipindahkan ke watchlist.`,
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
        title: 'Sedang Ditonton',
        description: `${show.name} ditambahkan ke daftar sedang ditonton.${currentStatus === 'watched' ? ' Episode direset.' : ''}`,
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

    // Update show status if needed (only for first episode being watched from watchlist)
    if (status === 'watchlist' && !allWatched) {
      try {
        await updateShowStatus(showId, 'watching', source);
      } catch (error) {
        console.error('Error updating status during bulk toggle:', error);
      }
    }

    // Toggle all episodes in bulk
    await toggleEpisodesBulk(showId, episodes, source);

    // Show single toast
    const seasonNumber = episodes[0]?.season;
    toast({
      title: allWatched ? 'Season Di-uncheck' : 'Season Selesai',
      description: allWatched
        ? `Season ${seasonNumber} ditandai belum ditonton.`
        : `Season ${seasonNumber} berhasil ditandai sudah ditonton!`,
    });
  };

  const { upcomingShows, recentlyAired, isLoading: loadingUpcoming } = useUpcomingShows();

  // Use fuzzy search for local tabs instead of simple includes()
  // Must be called before any early returns (React Hooks rules)
  const filteredWatching = useFuzzySearch(watching, localQuery);
  const filteredWatchlist = useFuzzySearch(watchlist, localQuery);
  const filteredWatched = useFuzzySearch(watched, localQuery);
  const filteredUpcoming = useFuzzySearch(upcomingShows, localQuery);

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
        description="Pantau progres nonton film dan serial TV kamu dengan WatchMe.log."
      />
      {/* Header */}
      <Header
        onSearch={handleSearch}
        isSearching={isSearching}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        isLocalTab={activeTab !== 'search'}
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
                <span>Search</span>
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Watchlist</span>
                {watchlist.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watchlist.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="watching" className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>Watching</span>
                {watching.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watching.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Up Coming</span>
                {upcomingShows.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {upcomingShows.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="watched" className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                <span>Watched</span>
                {watched.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watched.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="search" className="mt-0">
            {isSearching || isLoadingRecs ? (
              <LoadingSpinner />
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <ShowCard
                    key={`${result.show.source}-${result.show.id}`}
                    show={result.show}
                    isInList={isInList(result.show.id, result.show.source)}
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
                <div className="px-1 pb-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    Rekomendasi {searchType === 'series' ? 'Serial TV' : 'Film'} Populer
                  </h2>
                  <p className="text-sm text-muted-foreground">Sedang tren hari ini</p>
                </div>
                {recommendations.map((result) => (
                  <ShowCard
                    key={`${result.show.source}-${result.show.id}`}
                    show={result.show}
                    isInList={isInList(result.show.id, result.show.source)}
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
                Tidak ada hasil ditemukan.
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="animate-fade-in outline-none">
            {loadingUpcoming ? (
              <LoadingSpinner />
            ) : upcomingShows.length === 0 && recentlyAired.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <EmptyState type="upcoming" />
                {shows.length > 0 && localQuery && (
                  <p className="mt-4 text-sm text-muted-foreground">Tidak ada jadwal tayang yang cocok dengan "{localQuery}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingShows.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-primary px-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Up Coming
                    </h2>
                    {upcomingShows.map((show) => (
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

                {recentlyAired.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recently Aired
                    </h2>
                    {recentlyAired.map((show) => (
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
            {filteredWatching.length > 0 ? (
              <div className="space-y-3">
                {filteredWatching.map((show) => (
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
                  <p className="mt-4 text-sm text-muted-foreground">Tidak ada tontonan yang cocok dengan "{localQuery}"</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watchlist" className="mt-0">
            {filteredWatchlist.length > 0 ? (
              <div className="space-y-3">
                {filteredWatchlist.map((show) => (
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
                  <p className="mt-4 text-sm text-muted-foreground">Tidak ada daftar tonton yang cocok dengan "{localQuery}"</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="watched" className="mt-0">
            {filteredWatched.length > 0 ? (
              <div className="space-y-3">
                {filteredWatched.map((show) => (
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
                  <p className="mt-4 text-sm text-muted-foreground">Tidak ada tontonan selesai yang cocok dengan "{localQuery}"</p>
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
