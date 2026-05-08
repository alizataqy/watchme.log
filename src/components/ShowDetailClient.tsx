"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Calendar, Info, ExternalLink, Users, MessageSquare } from "lucide-react";
import { ReviewDialog } from "@/components/ReviewDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Show } from "@/types/show";
import { format, parseISO } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { useShowStorage } from "@/hooks/useShowStorage";
import { useToast } from "@/hooks/use-toast";
import { MobileNav } from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUpcomingShows } from "@/hooks/useUpcomingShows";
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";

interface ShowDetailClientProps {
    show: Show;
    source: string;
}

export default function ShowDetailClient({ show, source }: ShowDetailClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const { t, language } = useLanguage();

    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

    const { addShow, isInList, getShowStatus, removeShow, watching, watchlist, watched, shows, seasonReviews } = useShowStorage();
    const isMovie = source === "tmdb";

    const activeTab = "search";
    const { upcomingShows } = useUpcomingShows();

    const setActiveTab = (tab: string) => {
        router.push(tab === 'watching' ? '/' : `/${tab}`);
    };

    const inList = isInList(show.id, source as 'tvmaze' | 'tmdb');
    const currentStatus = getShowStatus(show.id, source as 'tvmaze' | 'tmdb');

    const handleAddClick = () => {
        addShow({
            ...show,
            trackStatus: 'watchlist',
            source: source as 'tvmaze' | 'tmdb',
            status: show.status,
        });
        toast({
            title: t('toast.success'),
            description: `${show.name} ${t('toast.addedWatchlistDesc')}`,
        });
    };

    const handleRemoveClick = () => {
        removeShow(show.id, source as 'tvmaze' | 'tmdb');
        toast({
            title: t('toast.removed'),
            description: `${show.name} ${t('toast.removedDesc')}`,
        });
    };

    const stripHtml = (html: string) => {
        if (typeof window === 'undefined') return html;
        const doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent || "";
    };

    const showStatus = show.status || '';
    const finalStatus = t(`status.${showStatus}`) !== `status.${showStatus}` ? t(`status.${showStatus}`) : showStatus;

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Header Branding */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none bg-background/95 backdrop-blur-sm rounded-b-lg">
                <Button
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto hover:bg-background/80"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Link href="/" className="pointer-events-auto">
                    <img src="/favicon.ico" alt="logo" className="w-8 h-8 mr-5" />
                </Link>
            </div>

            {/* Backdrop Area */}
            <div className="h-[40vh] sm:h-[70vh] w-full relative overflow-hidden bg-secondary">
                {show.image?.original && (
                    <img
                        src={show.image.original}
                        alt={show.name}
                        className="w-full h-auto object-cover opacity-40"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>

            <div className="container -mt-52 sm:-mt-80 relative z-10 px-4">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Poster and Buttons */}
                    <div className="flex flex-row gap-4 items-start">
                        {/* Poster - Left */}
                        <div className="w-32 sm:w-48 flex-shrink-0">
                            <div className="glass-card rounded-xl shadow-2xl overflow-hidden border-primary/20">
                                {show.image?.original || show.image?.medium ? (
                                    <img
                                        src={show.image.original || show.image.medium}
                                        alt={show.name}
                                        className="w-full h-auto aspect-[2/3] object-cover"
                                    />
                                ) : (
                                    <div className="w-full aspect-[2/3] flex items-center justify-center bg-secondary text-muted-foreground">
                                        {t('showCard.noImage')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Buttons - Right */}
                        <div className="flex-1 space-y-3 max-w-xs">
                            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">{show.name}</h1>
                            <div className="justify-start md:justify-start text-sm text-muted-foreground">
                                {show.premiered && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        <span className="text-foreground">{format(parseISO(show.premiered), "dd MMM yyyy", { locale: language === 'id' ? localeId : localeEn })}</span>
                                    </div>
                                )}
                            </div>
                            {!inList ? (
                                <Button className="w-full shadow-lg shadow-primary/20" onClick={handleAddClick}>
                                    {t('detail.addToWatchlist')}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <Badge className="w-full py-2 justify-center capitalize bg-primary/10 text-primary border-primary/30" variant="outline">
                                        {currentStatus === 'watching' ? t('detail.status.watching') : currentStatus === 'watched' ? t('detail.status.watched') : t('detail.status.watchlist')}
                                    </Badge>
                                    <Button className="w-full" variant="destructive" onClick={handleRemoveClick}>
                                        {t('detail.removeFromList')}
                                    </Button>
                                </div>
                            )}
                            {show.officialSite && (
                                <Button variant="outline" className="w-full" asChild>
                                    <a href={show.officialSite} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        {t('detail.officialSite')}
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="space-y-4 text-center md:text-left">
                            <div className="flex flex-wrap justify-start md:justify-start gap-3">
                                {show.rating.average && (
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-5 w-5 text-warning fill-warning" />
                                        <span className="font-bold text-lg text-foreground">{show.rating.average}</span>
                                        <span className="text-xs">/  10</span>
                                    </div>
                                )}
                                {show.genres.map((genre) => (
                                    <Badge key={genre} variant="secondary" className="px-3 py-1">
                                        {t(`genre.${genre}`) !== `genre.${genre}` ? t(`genre.${genre}`) : genre}
                                    </Badge>
                                ))}
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="capitalize py-1.5 px-3">
                                        {finalStatus}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {inList && currentStatus === 'watched' && (
                            <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        {t('detail.yourReview')}
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setReviewDialogOpen(true)}>
                                        {t('detail.edit')}
                                    </Button>
                                </div>
                                {(() => {
                                    const trackedShow = shows.find(s => s.id === show.id && s.source === source);
                                    if (!trackedShow || (!trackedShow.user_rating && !trackedShow.notes)) {
                                        return <p className="text-sm text-muted-foreground italic">{t('detail.noReview')}</p>;
                                    }
                                    return (
                                        <div className="space-y-3">
                                            {trackedShow.user_rating ? (
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`h-4 w-4 ${star <= (trackedShow.user_rating || 0) / 2 ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                                                        />
                                                    ))}
                                                    <span className="ml-2 font-bold">{trackedShow.user_rating}/10</span>
                                                </div>
                                            ) : null}
                                            {trackedShow.notes && (
                                                <p className="text-sm text-foreground bg-background/50 p-3 rounded-lg border border-border/50">
                                                    {trackedShow.notes}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {inList && !isMovie && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Star className="h-5 w-5 text-primary" />
                                    {t('detail.seasonReview')}
                                </h2>
                                {(() => {
                                    const dbId = shows.find(s => s.id === show.id && s.source === source)?.dbId;
                                    const reviews = dbId ? (seasonReviews[dbId] || []) : [];
                                    if (reviews.length === 0) {
                                        return <p className="text-sm text-muted-foreground italic">{t('detail.noSeasonReview')}</p>;
                                    }
                                    return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {reviews.sort((a, b) => a.season_number - b.season_number).map((review) => (
                                                <div key={review.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold">Season {review.season_number}</span>
                                                        <div className="flex items-center gap-1">
                                                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                                            <span className="text-xs font-bold">{review.rating}/10</span>
                                                        </div>
                                                    </div>
                                                    {review.notes && <p className="text-xs text-muted-foreground italic line-clamp-2">"{review.notes}"</p>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="space-y-3">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Info className="h-5 w-5 text-primary" />
                                {t('detail.synopsis')}
                            </h2>
                            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                                {show.summary ? stripHtml(show.summary) : t('detail.noSynopsis')}
                            </p>
                        </div>

                        {show._embedded?.cast && show._embedded.cast.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    {t('detail.cast')}
                                </h2>
                                <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 w-[calc(100%+2rem)] sm:w-full snap-x snap-mandatory touch-pan-x">
                                    {show._embedded.cast.map((member, index) => (
                                        <div key={index} className="flex-shrink-0 w-24 sm:w-28 text-center space-y-2 snap-start">
                                            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary border border-border/50">
                                                {member.person.image?.medium ? (
                                                    <img
                                                        src={member.person.image.medium}
                                                        alt={member.person.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                                                        <Users className="h-8 w-8 opacity-20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[11px] sm:text-xs font-bold truncate px-1">{member.person.name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate px-1 italic">{member.character}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 sm:grid-cols-3 gap-6 pt-6 border-t border-border/50">
                            {show.premiered && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">{t('detail.releaseDate')}</p>
                                    <p className="font-medium">
                                        {format(parseISO(show.premiered), "dd MMMM yyyy", { locale: language === 'id' ? localeId : localeEn })}
                                    </p>
                                </div>
                            )}
                            {(show.network || show.webChannel) && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">{t('detail.network')}</p>
                                    <p className="font-medium">{(show.network || show.webChannel)?.name}</p>
                                </div>
                            )}
                            {show.runtime && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">{t('detail.duration')}</p>
                                    <p className="font-medium text-foreground">{show.runtime} {t('detail.minutes')}</p>
                                </div>
                            )}
                            {show.type && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">{t('detail.contentType')}</p>
                                    <p className="font-medium text-foreground">{t(`type.${show.type}`) !== `type.${show.type}` ? t(`type.${show.type}`) : show.type}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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

            <ReviewDialog
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
                showId={show.id}
                showName={show.name}
                initialRating={shows.find(s => s.id === show.id && s.source === source)?.user_rating || 0}
                initialNotes={shows.find(s => s.id === show.id && s.source === source)?.notes || ''}
                source={source as 'tvmaze' | 'tmdb'}
            />
        </div>
    );
}
