import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Tv, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ShowCard } from '@/components/ShowCard';
import { ShowCardSkeleton } from '@/components/ShowCardSkeleton';
import { TMDB_GENRES, discoverMoviesByGenre } from '@/services/tmdb';
import { TVMAZE_GENRES, getSeriesByGenre } from '@/services/tvmaze';
import { SearchResult, Show } from '@/types/show';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';
import { MobileNav } from '@/components/MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUpcomingShows } from '@/hooks/useUpcomingShows';
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";

type GenreView = 'selection' | 'genres' | 'results';
type MediaType = 'movie' | 'series' | null;

const Genre = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const { t } = useLanguage();
    const { isInList, addShow, getShowStatus, removeShow, watching, watchlist, watched } = useShowStorage();
    const { upcomingShows } = useUpcomingShows();

    const [view, setView] = useState<GenreView>('selection');
    const [mediaType, setMediaType] = useState<MediaType>(null);
    const [selectedGenre, setSelectedGenre] = useState<number | string | null>(null);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const genres = mediaType === 'movie' ? TMDB_GENRES : TVMAZE_GENRES;

    const handleMediaTypeSelect = (type: MediaType) => {
        setMediaType(type);
        setView('genres');
    };

    const handleGenreSelect = async (genreId: number | string) => {
        setSelectedGenre(genreId);
        setView('results');
        setLoading(true);

        try {
            let data: SearchResult[] = [];
            if (mediaType === 'movie') {
                data = await discoverMoviesByGenre(Number(genreId));
            } else {
                data = await getSeriesByGenre(genreId as string);
            }
            setResults(data);
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('common.error'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (view === 'results') {
            setView('genres');
            setResults([]);
        } else if (view === 'genres') {
            setView('selection');
            setMediaType(null);
        } else {
            navigate(-1);
        }
    };

    const handleAddToWatchlist = (show: Show) => {
        addShow({ ...show, trackStatus: 'watchlist' });
        toast({
            title: t('toast.addedWatchlist'),
            description: `${show.name} ${t('toast.addedWatchlistDesc')}`,
        });
    };

    const handleMarkWatched = (show: Show) => {
        addShow({ ...show, trackStatus: 'watched' });
        toast({
            title: t('toast.markWatched'),
            description: `${show.name} ${t('toast.markWatchedDesc')}`,
        });
    };

    const handleMarkWatching = (show: Show) => {
        addShow({ ...show, trackStatus: 'watching' });
        toast({
            title: t('toast.watching'),
            description: `${show.name} ${t('toast.watchingDesc')}`,
        });
    };

    const handleRemove = (show: Show) => {
        removeShow(show.id, show.source);
        toast({
            title: t('toast.removed'),
            description: `${show.name} ${t('toast.removedDesc')}`,
        });
    };

    const setActiveTab = (tab: string) => {
        navigate(tab === 'watching' ? '/' : `/${tab}`);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <SEO
                title="Genre"
                description="Temukan film dan serial TV berdasarkan genre favoritmu di WatchMe.log."
            />
            
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="container py-4 px-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">
                        {view === 'selection' ? t('genre.title') : 
                         view === 'genres' ? (mediaType === 'movie' ? t('genre.movies') : t('genre.series')) :
                         genres.find(g => g.id === selectedGenre)?.name || t('genre.results')}
                    </h1>
                </div>
            </header>

            <main className="container px-4 py-6">
                {view === 'selection' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mt-10">
                        <Button 
                            variant="outline" 
                            className="h-32 flex flex-col gap-3 text-lg hover:bg-primary/5 hover:border-primary/50 transition-all"
                            onClick={() => handleMediaTypeSelect('movie')}
                        >
                            <Film className="h-8 w-8 text-primary" />
                            {t('genre.movies')}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="h-32 flex flex-col gap-3 text-lg hover:bg-primary/5 hover:border-primary/50 transition-all"
                            onClick={() => handleMediaTypeSelect('series')}
                        >
                            <Tv className="h-8 w-8 text-primary" />
                            {t('genre.series')}
                        </Button>
                    </div>
                )}

                {view === 'genres' && (
                    <div className="flex flex-wrap gap-2">
                        {genres.map((genre) => (
                            <Badge
                                key={genre.id}
                                variant="outline"
                                className="px-4 py-2 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() => handleGenreSelect(genre.id)}
                            >
                                {t(`genre.${genre.name}`) !== `genre.${genre.name}` ? t(`genre.${genre.name}`) : genre.name}
                            </Badge>
                        ))}
                    </div>
                )}

                {view === 'results' && (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <ShowCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : results.length > 0 ? (
                            <div className="space-y-3">
                                {results.map((result) => (
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
                            <div className="text-center py-20">
                                <Clapperboard className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground">{t('genre.noResults')}</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {isMobile && (
                <MobileNav
                    activeTab="search"
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

export default Genre;
