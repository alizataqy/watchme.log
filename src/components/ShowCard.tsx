import { Link, useNavigate } from 'react-router-dom';
import { Show, TrackedShow } from '@/types/show';
import { Calendar, Star, Plus, Check, Eye, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, differenceInDays, formatDistanceToNow } from 'date-fns';
import { id as localeId, enUS as localeEn } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReviewDialog } from './ReviewDialog';
import { useShowContext } from '@/contexts/ShowContext';
import { SeasonReview } from '@/types/show';
import { MessageSquare } from 'lucide-react';

interface Episode {
    season: number;
    number: number;
    name: string;
    airdate: string;
}

interface ShowCardProps {
    show: Show | TrackedShow;
    isInList?: boolean;
    currentStatus?: string;
    watchedEpisodes?: { season: number; episode: number }[];
    onAddToWatchlist?: () => void;
    onMarkWatched?: () => void;
    onMarkWatching?: () => void;
    onRemove?: () => void;
    onToggleEpisode?: (season: number, episode: number, episodeName: string, airdate: string) => void;
    onToggleSeasonBulk?: (episodes: { season: number; episode: number; episodeName: string; airdate: string }[], allWatched: boolean) => void;
    showEpisodeTracking?: boolean;
    isUpcomingView?: boolean;
    isSearch?: boolean;
}

export function ShowCard({
    show,
    isInList,
    currentStatus,
    watchedEpisodes = [],
    onAddToWatchlist,
    onMarkWatched,
    onMarkWatching,
    onRemove,
    onToggleEpisode,
    onToggleSeasonBulk,
    showEpisodeTracking = false,
    isUpcomingView = false,
    isSearch = false,
}: ShowCardProps) {
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
    const [showEpisodes, setShowEpisodes] = useState(false);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [activeSeasonReview, setActiveSeasonReview] = useState<number | undefined>(undefined);
    const navigate = useNavigate();
    const { seasonReviews } = useShowContext();
    const { t, language } = useLanguage();

    const imageUrl = show.image?.medium || show.image?.original;
    const nextEpisode = show._embedded?.nextepisode;
    const isUpcoming = nextEpisode?.airdate && isAfter(parseISO(nextEpisode.airdate), new Date());

    const isMovie = show.source === 'tmdb';

    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    };

    const isEpisodeWatched = (season: number, episode: number) => {
        return watchedEpisodes.some(ep => ep.season === season && ep.episode === episode);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking buttons, dialogs, or episode selectors
        const target = e.target as HTMLElement;
        if (
            target.closest('button') ||
            target.closest('[role="dialog"]') ||
            target.closest('.episode-item') ||
            target.closest('.alert-dialog-trigger')
        ) {
            return;
        }
        navigate(`/show/${show.id}?source=${show.source || 'tvmaze'}`);
    };

    const loadEpisodes = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (episodes.length > 0) {
            setShowEpisodes(!showEpisodes);
            return;
        }

        if (isMovie) return;

        setIsLoadingEpisodes(true);
        try {
            fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`)
                .then(res => res.json())
                .then(data => {
                    setEpisodes(data.map((ep: Episode) => ({
                        season: ep.season,
                        number: ep.number,
                        name: ep.name,
                        airdate: ep.airdate,
                    })));
                    setShowEpisodes(true);
                })
                .finally(() => setIsLoadingEpisodes(false));
        } catch (error) {
            console.error('Failed to load episodes:', error);
            setIsLoadingEpisodes(false);
        }
    };

    // Auto-load episodes for progress tracking
    useEffect(() => {
        if (showEpisodeTracking && !isMovie && episodes.length === 0) {
            setIsLoadingEpisodes(true);
            fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`)
                .then(res => res.json())
                .then(data => {
                    setEpisodes(data.map((ep: Episode) => ({
                        season: ep.season,
                        number: ep.number,
                        name: ep.name,
                        airdate: ep.airdate,
                    })));
                })
                .catch(error => {
                    console.error('Failed to load episodes:', error);
                })
                .finally(() => setIsLoadingEpisodes(false));
        }
    }, [showEpisodeTracking, isMovie, show.id, episodes.length]);


    // Auto-mark as watched when all episodes are watched
    useEffect(() => {
        if (
            currentStatus === 'watching' &&
            episodes.length > 0 &&
            watchedEpisodes.length > 0 &&
            watchedEpisodes.length === episodes.length
        ) {
            onMarkWatched?.();
        }
    }, [watchedEpisodes, episodes, currentStatus, onMarkWatched]);

    // Group episodes by season
    const episodesBySeason = episodes.reduce((acc, ep) => {
        if (!acc[ep.season]) acc[ep.season] = [];
        acc[ep.season].push(ep);
        return acc;
    }, {} as Record<number, Episode[]>);

    const watchedCount = watchedEpisodes.length;
    const totalEpisodes = episodes.length;

    return (
        <div
            onClick={handleCardClick}
            className="glass-card rounded-lg overflow-hidden animate-fade-in hover:border-primary/50 transition-all duration-300 group cursor-pointer"
        >
            <div className="flex gap-3 p-3">
                {/* Poster */}
                <div className="relative w-20 h-28 flex-shrink-0 rounded-md overflow-hidden bg-secondary">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={show.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            {t('showCard.noImage')}
                        </div>
                    )}

                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between items-start gap-2">

                        <div className="flex items-center justify-between w-full gap-2">
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors leading-tight">{show.name}</h3>
                            <div className="flex items-center gap-1 shrink-0">
                                {show.rating?.average && isSearch && (
                                    <div className="bg-background/90 whitespace-nowrap backdrop-blur-sm px-1.5 py-0.5 rounded text-xs  font-medium flex items-center gap-1">
                                        <Star className="h-3 w-3 text-warning fill-warning" />
                                        {show.rating.average}
                                    </div>
                                )}
                                {showEpisodeTracking && totalEpisodes > 0 && !isMovie && (
                                    <div className="text-xs font-medium text-muted-foreground whitespace-nowrap pt-0.5">
                                        {watchedCount}/{totalEpisodes}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    <div className="flex flex-wrap gap-1 mt-1">
                        {show.genres?.slice(0, 2).map((genre) => (
                            <Badge key={genre} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {t(`genre.${genre}`) !== `genre.${genre}` ? t(`genre.${genre}`) : genre}
                            </Badge>
                        ))}
                    </div>
                    {show.premiered && !isUpcomingView && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(show.premiered), 'dd MMM yyyy', { locale: language === 'id' ? localeId : localeEn })}
                        </p>
                    )}

                    {/* Special Upcoming Display in Info section */}
                    {isUpcomingView && (
                        <div className="mt-2 p-2 bg-primary/10 rounded text-xs border border-primary/20">
                            <p className="text-primary font-medium flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4" />
                                {isMovie
                                    ? (() => {
                                        if (!show.premiered) return t('showCard.tba');

                                        const releaseDate = parseISO(show.premiered);
                                        const today = new Date();
                                        const daysDiff = differenceInDays(releaseDate, today);
                                        const locale = language === 'id' ? localeId : localeEn;

                                        if (daysDiff < 0 && daysDiff > -10) {
                                            return formatDistanceToNow(releaseDate, { addSuffix: true, locale });
                                        } else if (daysDiff >= 0 && daysDiff < 10) {
                                            return formatDistanceToNow(releaseDate, { addSuffix: true, locale });
                                        }

                                        return format(releaseDate, 'dd MMM yyyy', { locale });
                                    })()
                                    : (() => {
                                        const latestEpisode = show._embedded?.nextepisode || show._embedded?.previousepisode;
                                        if (!latestEpisode?.airdate) return t('showCard.tba');

                                        const airDate = latestEpisode.airstamp ? parseISO(latestEpisode.airstamp) : parseISO(latestEpisode.airdate);
                                        const today = new Date();
                                        const daysDiff = differenceInDays(airDate, today);
                                        const locale = language === 'id' ? localeId : localeEn;

                                        let relativeTime = '';
                                        if (Math.abs(daysDiff) < 10) {
                                            relativeTime = formatDistanceToNow(airDate, { addSuffix: true, locale });
                                        } else {
                                            relativeTime = format(airDate, 'dd MMM yyyy', { locale });
                                        }

                                        const timeStr = latestEpisode.airstamp
                                            ? ` ${format(parseISO(latestEpisode.airstamp), 'HH:mm')}`
                                            : '';

                                        return `${relativeTime}${timeStr}`;
                                    })()
                                }
                            </p>
                            {!isMovie && (show._embedded?.nextepisode || show._embedded?.previousepisode) && (
                                <p className="text-muted-foreground ml-6">
                                    {show._embedded?.nextepisode ? t('showCard.next') : t('showCard.latest')}: S{(show._embedded?.nextepisode || show._embedded?.previousepisode)!.season}E{(show._embedded?.nextepisode || show._embedded?.previousepisode)!.number}: {(show._embedded?.nextepisode || show._embedded?.previousepisode)!.name}
                                </p>
                            )}
                        </div>
                    )}

                    {nextEpisode && isUpcoming && !isMovie && !isUpcomingView && (
                        <div className="mt-1 p-1.5 bg-primary/10 rounded text-xs border border-primary/20">
                            <p className="text-primary font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                S{nextEpisode.season}E{nextEpisode.number}
                            </p>
                            <p className="text-muted-foreground truncate">{nextEpisode.name}</p>
                            <p className="text-primary">
                                {format(parseISO(nextEpisode.airdate), 'dd MMM yyyy', { locale: language === 'id' ? localeId : localeEn })}
                            </p>
                        </div>
                    )}



                    {show.summary && !nextEpisode && !showEpisodeTracking && !isUpcomingView && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {stripHtml(show.summary)}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions */}
            {!isUpcomingView ? (
                <div className="px-3 pb-3 flex flex-col gap-2">
                    {!isInList ? (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1 h-8 text-xs"
                                onClick={(e) => { e.stopPropagation(); onAddToWatchlist?.(); }}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                {t('showCard.watchlist')}
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                className="flex-1 h-8 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isMovie) {
                                        onMarkWatched?.();
                                    } else {
                                        onMarkWatching?.();
                                    }
                                }}
                            >
                                {isMovie ? (
                                    <>
                                        <Check className="h-3 w-3 mr-1" />
                                        {t('showCard.watched')}
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-3 w-3 mr-1" />
                                        {t('showCard.startWatching')}
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {(showEpisodeTracking || currentStatus === 'watching') && !isMovie && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1 h-8 text-xs"
                                    onClick={loadEpisodes}
                                    disabled={isLoadingEpisodes}
                                >
                                    {showEpisodes ? (
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                    )}
                                    {isLoadingEpisodes ? t('common.loading') : showEpisodes ? t('showCard.close') : t('showCard.episode')}
                                </Button>
                            )}

                            {currentStatus === 'watchlist' && (
                                isMovie ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                className="flex-1 h-8 text-xs alert-dialog-trigger"
                                            >
                                                <Check className="h-3 w-3 mr-1" />
                                                {t('showCard.done')}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('showCard.confirmDone')}</AlertDialogTitle>
                                                <AlertDialogDescription dangerouslySetInnerHTML={{ __html: t('showCard.confirmMarkWatched').replace('{name}', show.name) }} />
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); onMarkWatched?.(); }}>{t('showCard.yesDone')}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="flex-1 h-8 text-xs"
                                        onClick={(e) => { e.stopPropagation(); onMarkWatching?.(); }}
                                    >
                                        <Eye className="h-3 w-3 mr-1" />
                                        {t('showCard.watchAccuracy')}
                                    </Button>
                                )
                            )}

                            {currentStatus === 'watching' && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            className="flex-1 h-8 text-xs alert-dialog-trigger"
                                        >
                                            <Check className="h-3 w-3 mr-1" />
                                            {t('showCard.done')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('showCard.confirmDone')}</AlertDialogTitle>
                                            <AlertDialogDescription dangerouslySetInnerHTML={{ __html: t('showCard.confirmMarkWatchingDone').replace('{name}', show.name) }} />
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={(e) => { e.stopPropagation(); onMarkWatched?.(); }}>{t('showCard.yesAllDone')}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {currentStatus === 'watched' && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1 h-8 text-xs"
                                    onClick={(e) => { e.stopPropagation(); onMarkWatching?.(); }}
                                >
                                    <Eye className="h-3 w-3 mr-1" />
                                    {t('showCard.watchAgain')}
                                </Button>
                            )}

                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs px-3"
                                onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                            >
                                {t('showCard.remove')}
                            </Button>
                        </div>
                    )}
                    {isInList && currentStatus === 'watched' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs border-primary/20 hover:bg-primary/5"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveSeasonReview(undefined);
                                setReviewDialogOpen(true);
                            }}
                        >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {('user_rating' in show && (show as TrackedShow).user_rating) ? t('showCard.editReview') : t('showCard.writeReview')}
                        </Button>
                    )}
                </div>
            ) : (
                null
            )
            }

            {/* Episode List */}
            {
                showEpisodes && episodes.length > 0 && (
                    <div className="px-3 pb-3 max-h-64 overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
                        {Object.entries(episodesBySeason).map(([season, eps]) => (
                            <div key={season} className="mb-3">
                                <div className="flex justify-between">
                                    {(() => {
                                        // Calculate if all watchable episodes are watched (for visual feedback)
                                        const watchableEpisodes = eps.filter((ep) => {
                                            const isFuture = ep.airdate && isAfter(parseISO(ep.airdate), new Date());
                                            return !isFuture;
                                        });
                                        const allWatched = watchableEpisodes.every((ep) =>
                                            isEpisodeWatched(ep.season, ep.number)
                                        );

                                        return (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 mb-3"
                                                    onClick={(e) => {
                                                        e.stopPropagation();

                                                        // Use bulk handler if available (for better performance and single toast)
                                                        if (onToggleSeasonBulk) {
                                                            const episodesToToggle = allWatched
                                                                ? watchableEpisodes.map(ep => ({
                                                                    season: ep.season,
                                                                    episode: ep.number,
                                                                    episodeName: ep.name,
                                                                    airdate: ep.airdate
                                                                }))
                                                                : watchableEpisodes
                                                                    .filter(ep => !isEpisodeWatched(ep.season, ep.number))
                                                                    .map(ep => ({
                                                                        season: ep.season,
                                                                        episode: ep.number,
                                                                        episodeName: ep.name,
                                                                        airdate: ep.airdate
                                                                    }));

                                                            onToggleSeasonBulk(episodesToToggle, allWatched);
                                                        } else {
                                                            // Fallback to individual toggles
                                                            if (allWatched) {
                                                                watchableEpisodes.forEach((ep) => {
                                                                    onToggleEpisode?.(ep.season, ep.number, ep.name, ep.airdate);
                                                                });
                                                            } else {
                                                                watchableEpisodes.forEach((ep) => {
                                                                    const watched = isEpisodeWatched(ep.season, ep.number);
                                                                    if (!watched) {
                                                                        onToggleEpisode?.(ep.season, ep.number, ep.name, ep.airdate);
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Check />
                                                </Button>

                                                {allWatched && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary mb-3"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveSeasonReview(Number(season));
                                                            setReviewDialogOpen(true);
                                                        }}
                                                    >
                                                        <Star className={`h-4 w-4 ${seasonReviews[('dbId' in show ? show.dbId : '') || '']?.some(r => r.season_number === Number(season)) ? 'fill-primary text-primary' : ''}`} />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                        {t('showCard.season').replace('{number}', season)}
                                    </h4>
                                </div>
                                <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                                    {eps.map((ep) => {
                                        const watched = isEpisodeWatched(ep.season, ep.number);
                                        const isFuture = ep.airdate && isAfter(parseISO(ep.airdate), new Date());
                                        return (
                                            <div
                                                key={`${ep.season}-${ep.number}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!isFuture) onToggleEpisode?.(ep.season, ep.number, ep.name, ep.airdate);
                                                }}
                                                className={`
                        episode-item aspect-square rounded flex items-center justify-center text-sm font-bold transition-all
                        ${isFuture
                                                        ? "bg-muted text-gray-200 text-muted-foreground/30 cursor-not-allowed opacity-50 grayscale pointer-events-none"
                                                        : "cursor-pointer"
                                                    }
                        ${!isFuture && (watched
                                                        ? "bg-primary text-gray-200 dark:text-gray-800 hover:bg-primary/90 shadow-md"
                                                        : "bg-secondary text-gray-800 dark:text-gray-200 hover:bg-secondary/80"
                                                    )}
                      `}
                                                title={isFuture ? `${t('showCard.airing').replace('{date}', ep.airdate)}` : ep.name}
                                            >

                                                {ep.number}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
            <ReviewDialog
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
                showId={show.id}
                showName={show.name}
                seasonNumber={activeSeasonReview}
                initialRating={activeSeasonReview !== undefined
                    ? (seasonReviews[('dbId' in show ? show.dbId : '') || '']?.find(r => r.season_number === activeSeasonReview)?.rating || 0)
                    : ('user_rating' in show ? (show as TrackedShow).user_rating : 0)
                }
                initialNotes={activeSeasonReview !== undefined
                    ? (seasonReviews[('dbId' in show ? show.dbId : '') || '']?.find(r => r.season_number === activeSeasonReview)?.notes || '')
                    : ('notes' in show ? (show as TrackedShow).notes : '')
                }
                source={show.source}
            />
        </div >
    );
}
