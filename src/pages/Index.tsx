import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Clock, Eye, Search as SearchIcon, LogOut, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/SearchBar';
import { ShowCard } from '@/components/ShowCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useAuth } from '@/hooks/useAuth';
import { SearchResult, Show, TrackedShow } from '@/types/show';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const {
    watchlist,
    watched,
    watchedEpisodes,
    isLoading,
    addShow,
    removeShow,
    updateShowStatus,
    toggleEpisode,
    isInList,
    getShowStatus,
    getShowDbId,
  } = useShowStorage();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSearch = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`
      );
      const data: SearchResult[] = await response.json();
      
      const showsWithEpisodes = await Promise.all(
        data.map(async (result) => {
          try {
            const showResponse = await fetch(
              `https://api.tvmaze.com/shows/${result.show.id}?embed=nextepisode`
            );
            const showData = await showResponse.json();
            return { ...result, show: showData };
          } catch {
            return result;
          }
        })
      );
      
      setSearchResults(showsWithEpisodes);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mencari. Coba lagi nanti.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToWatchlist = (show: Show) => {
    addShow({
      ...show,
      status: 'watchlist',
    });
    toast({
      title: 'Ditambahkan ke Watchlist',
      description: `${show.name} berhasil ditambahkan.`,
    });
  };

  const handleMarkWatched = (show: Show) => {
    if (isInList(show.id)) {
      updateShowStatus(show.id, 'watched');
    } else {
      addShow({
        ...show,
        status: 'watched',
      });
    }
    toast({
      title: 'Ditandai Sudah Ditonton',
      description: `${show.name} ditandai sudah ditonton.`,
    });
  };

  const handleRemove = (show: Show) => {
    removeShow(show.id);
    toast({
      title: 'Dihapus',
      description: `${show.name} dihapus dari daftar.`,
    });
  };

  const handleMoveToWatchlist = (show: TrackedShow) => {
    updateShowStatus(show.id, 'watchlist');
    toast({
      title: 'Dipindahkan ke Watchlist',
      description: `${show.name} dipindahkan ke watchlist.`,
    });
  };

  const handleToggleEpisode = (showId: number, season: number, episode: number, name: string, airdate: string) => {
    toggleEpisode(showId, season, episode, name, airdate);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Film className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-gradient">WatchTracker</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="hidden sm:inline truncate max-w-[120px]">{user.email}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="search" className="flex items-center gap-1.5">
              <SearchIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Cari</span>
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Watchlist</span>
              {watchlist.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                  {watchlist.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="watched" className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Sudah</span>
              {watched.length > 0 && (
                <span className="bg-success/20 text-success text-xs px-1.5 rounded-full">
                  {watched.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            {isSearching ? (
              <LoadingSpinner />
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <ShowCard
                    key={result.show.id}
                    show={result.show}
                    isInList={isInList(result.show.id)}
                    currentStatus={getShowStatus(result.show.id)}
                    onAddToWatchlist={() => handleAddToWatchlist(result.show)}
                    onMarkWatched={() => handleMarkWatched(result.show)}
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

          <TabsContent value="watchlist" className="mt-0">
            {watchlist.length > 0 ? (
              <div className="space-y-3">
                {watchlist.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    isInList={true}
                    currentStatus="watchlist"
                    watchedEpisodes={watchedEpisodes[show.dbId!] || []}
                    showEpisodeTracking={true}
                    onMarkWatched={() => handleMarkWatched(show)}
                    onRemove={() => handleRemove(show)}
                    onToggleEpisode={(season, episode, name, airdate) => 
                      handleToggleEpisode(show.id, season, episode, name, airdate)
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="watchlist" />
            )}
          </TabsContent>

          <TabsContent value="watched" className="mt-0">
            {watched.length > 0 ? (
              <div className="space-y-3">
                {watched.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    isInList={true}
                    currentStatus="watched"
                    watchedEpisodes={watchedEpisodes[show.dbId!] || []}
                    showEpisodeTracking={true}
                    onAddToWatchlist={() => handleMoveToWatchlist(show)}
                    onRemove={() => handleRemove(show)}
                    onToggleEpisode={(season, episode, name, airdate) => 
                      handleToggleEpisode(show.id, season, episode, name, airdate)
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="watched" />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
