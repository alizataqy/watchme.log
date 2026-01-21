import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Tv, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ShowCard } from '@/components/ShowCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
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
    const [view, setView] = useState<GenreView>('selection');
    const [mediaType, setMediaType] = useState<MediaType>(null);
    const [selectedGenre, setSelectedGenre] = useState<string | number | null>(null);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const activeTab = "search";
    const setActiveTab = (tab: string) => {
        navigate(tab === 'watching' ? '/' : `/${tab}`);
    };

    const isMobile = useIsMobile();
    const { upcomingShows } = useUpcomingShows();
    const { t } = useLanguage();

    const {
        addShow, isInList, getShowStatus, removeShow, watching, watchlist, watched,
        markAllEpisodesAsWatched,
        updateShowStatus
    } = useShowStorage();

    const handleTypeSelect = (type: MediaType) => {
        setMediaType(type);
        setView('genres');
    };

    const handleGenreSelect = async (genre: string | number) => {
        setSelectedGenre(genre);
        setView('results');
        setLoading(true);
        setResults([]);

        try {
            if (mediaType === 'movie') {
                const data = await discoverMoviesByGenre(Number(genre));
                setResults(data);
            } else {
                const data = await getSeriesByGenre(String(genre));
                setResults(data);
            }
        } catch (error) {
            console.error(error);
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
            setSelectedGenre(null);
        } else if (view === 'genres') {
            setView('selection');
            setMediaType(null);
        } else {
            navigate(-1);
        }
    };

    // Titles helper
    const getTitle = () => {
        if (view === 'selection') return t('genre.title.selection');
        if (view === 'genres') return t('genre.title.genres').replace('{type}', mediaType === 'movie' ? t('genre.movies') : t('genre.series'));
        const genreName = mediaType === 'movie'
            ? TMDB_GENRES[Number(selectedGenre)]
            : selectedGenre;
        return `${genreName} ${mediaType === 'movie' ? 'Movies' : 'Series'}`;
    };

    // Action handlers reused from Index.tsx
    const handleAddToWatchlist = (show: Show) => {
        addShow({ ...show, trackStatus: 'watchlist' });
        toast({ title: t('toast.addedWatchlist'), description: `${show.name} ${t('toast.addedWatchlistDesc')}` });
    };

    const handleMarkWatched = async (show: Show) => {
        try {
            if (isInList(show.id, show.source)) {
                await markAllEpisodesAsWatched(show.id, show.source);
            } else {
                await addShow({ ...show, trackStatus: 'watched' });
                if (show.source === 'tvmaze') await markAllEpisodesAsWatched(show.id, show.source);
            }
            toast({ title: t('toast.markWatched'), description: `${show.name} ${t('toast.markWatchedDesc')}` });
        } catch (error) {
            toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
        }
    };

    const handleRemove = (show: Show) => {
        removeShow(show.id, show.source);
        toast({ title: t('toast.removed'), description: `${show.name} ${t('toast.removedDesc')}` });
    };

    const handleMarkWatching = async (show: Show) => {
        addShow({ ...show, trackStatus: 'watching' });
        toast({ title: t('toast.watching'), description: `${show.name} ${t('toast.watchingDesc')}` });
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <SEO
                title="Genre"
                description="Temukan film dan serial TV berdasarkan genre favoritmu."
            />

            {/* Header */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
                <div className="container flex items-center h-14 px-4 gap-2">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="font-semibold text-lg">{getTitle()}</h1>
                </div>
            </div>

            <main className="container p-4">
                {/* VIEW: Selection */}
                {view === 'selection' && (
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                        <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                            <button
                                onClick={() => handleTypeSelect('movie')}
                                className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors border-2 border-transparent hover:border-primary/20 group"
                            >
                                <div className="p-4 rounded-full bg-background group-hover:bg-primary/10 transition-colors">
                                    <Film className="h-12 w-12 text-primary" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-xl font-bold">{t('genre.movies')}</h2>
                                </div>
                            </button>

                            <button
                                onClick={() => handleTypeSelect('series')}
                                className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors border-2 border-transparent hover:border-primary/20 group"
                            >
                                <div className="p-4 rounded-full bg-background group-hover:bg-primary/10 transition-colors">
                                    <Tv className="h-12 w-12 text-primary" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-xl font-bold">{t('genre.series')}</h2>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* VIEW: Genres List */}
                {view === 'genres' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {mediaType === 'movie' ? (
                            Object.entries(TMDB_GENRES).map(([id, name]) => (
                                <button
                                    key={id}
                                    onClick={() => handleGenreSelect(Number(id))}
                                    className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all text-left"
                                >
                                    <Clapperboard className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">{t(`genre.${name}`) !== `genre.${name}` ? t(`genre.${name}`) : name}</span>
                                </button>
                            ))
                        ) : (
                            TVMAZE_GENRES.map((genre) => (
                                <button
                                    key={genre}
                                    onClick={() => handleGenreSelect(genre)}
                                    className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all text-left"
                                >
                                    <Tv className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">{t(`genre.${genre}`) !== `genre.${genre}` ? t(`genre.${genre}`) : genre}</span>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* VIEW: Results */}
                {view === 'results' && (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <LoadingSpinner />
                            </div>
                        ) : results.length > 0 ? (
                            <div className="space-y-3">
                                {results.map((result) => (
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
                            <div className="text-center py-12 text-muted-foreground">
                                {t('genre.noResults')}
                            </div>
                        )}
                    </div>
                )}
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

export default Genre;
