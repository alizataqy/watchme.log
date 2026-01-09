import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Star, Calendar, Clock, Info, ExternalLink, Users, MessageSquare } from "lucide-react";
import { ReviewDialog } from "@/components/ReviewDialog";
import { useShowContext } from "@/contexts/ShowContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getShowDetails } from "@/services/tvmaze";
import { getMovieDetails } from "@/services/tmdb";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Show } from "@/types/show";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useShowStorage } from "@/hooks/useShowStorage";
import { useToast } from "@/hooks/use-toast";
import { MobileNav } from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUpcomingShows } from "@/hooks/useUpcomingShows";
import SEO from "@/components/SEO";


const Detail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const source = searchParams.get("source") || "tvmaze";
    const navigate = useNavigate();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [show, setShow] = useState<Show | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

    const { addShow, isInList, getShowStatus, removeShow, watching, watchlist, watched, shows, seasonReviews } = useShowStorage();
    const isMovie = source === "tmdb";

    // Missing states for MobileNav
    const activeTab = "search"; // Default for detail page context
    const setActiveTab = (tab: string) => navigate(`/?tab=${tab}`);
    const { upcomingShows } = useUpcomingShows();

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                let data: Show | null = null;
                if (source === "tmdb") {
                    data = await getMovieDetails(Number(id));
                } else {
                    data = await getShowDetails(Number(id));
                }
                setShow(data);
            } catch (error) {
                console.error("Error fetching show details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, source]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!show) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Detail tidak ditemukan.</p>
                <Button onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                </Button>
            </div>
        );
    }

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
            title: "Berhasil",
            description: `${show.name} ditambahkan ke Watchlist`,
        });
    };

    const handleRemoveClick = () => {
        removeShow(show.id, source as 'tvmaze' | 'tmdb');
        toast({
            title: "Dihapus",
            description: `${show.name} dihapus dari daftar`,
        });
    };

    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent || "";
    };

    return (
        <div className="min-h-screen bg-background pb-32">
            <SEO
                title={show.name}
                description={show.summary ? stripHtml(show.summary).substring(0, 160) : `Informasi detail tentang ${show.name}`}
                image={show.image?.original || show.image?.medium}
            />
            {/* Header Branding */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-background/50 backdrop-blur-sm pointer-events-auto hover:bg-background/80"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Link to="/" className="pointer-events-auto">
                    <h1 className="text-xl font-bold text-gradient drop-shadow-md">WatchMe.log</h1>
                </Link>
            </div>

            {/* Backdrop Area */}
            <div className="h-[40vh] sm:h-[50vh] w-full relative overflow-hidden bg-secondary">
                {show.image?.original && (
                    <img
                        src={show.image.original}
                        alt={show.name}
                        className="w-full h-full object-cover opacity-40"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>

            <div className="container -mt-40 sm:-mt-56 relative z-10 px-4">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Poster */}
                    <div className="w-48 sm:w-64 flex-shrink-0 mx-auto md:mx-0">
                        <div className="glass-card rounded-xl shadow-2xl overflow-hidden border-primary/20">
                            {show.image?.original || show.image?.medium ? (
                                <img
                                    src={show.image.original || show.image.medium}
                                    alt={show.name}
                                    className="w-full h-auto aspect-[2/3] object-cover"
                                />
                            ) : (
                                <div className="w-full aspect-[2/3] flex items-center justify-center bg-secondary text-muted-foreground">
                                    No Image
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-3">
                            {!inList ? (
                                <Button className="w-full shadow-lg shadow-primary/20" onClick={handleAddClick}>
                                    Tambah ke Watchlist
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <Badge className="w-full py-2 justify-center capitalize bg-primary/10 text-primary border-primary/30" variant="outline">
                                        {currentStatus === 'watching' ? 'Sedang Ditonton' : currentStatus === 'watched' ? 'Sudah Ditonton' : 'Di Watchlist'}
                                    </Badge>
                                    <Button className="w-full" variant="destructive" onClick={handleRemoveClick}>
                                        Hapus dari Daftar
                                    </Button>
                                </div>
                            )}
                            {show.officialSite && (
                                <Button variant="outline" className="w-full" asChild>
                                    <a href={show.officialSite} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Official Site
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-6 pt-4 md:pt-12">
                        <div className="space-y-4 text-center md:text-left">
                            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">{show.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                {show.genres.map((genre) => (
                                    <Badge key={genre} variant="secondary" className="px-3 py-1">
                                        {genre}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-muted-foreground">
                                {show.rating.average && (
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-5 w-5 text-warning fill-warning" />
                                        <span className="font-bold text-lg text-foreground">{show.rating.average}</span>
                                        <span className="text-xs">/ 10</span>
                                    </div>
                                )}
                                {show.premiered && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        <span className="text-foreground">{format(parseISO(show.premiered), "yyyy")}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="capitalize px-3 border-muted-foreground/30">
                                        {show.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 uppercase tracking-wider">
                                    <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-none px-3">
                                        {source}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {inList && currentStatus === 'watched' && (
                            <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        Review Kamu
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setReviewDialogOpen(true)}>
                                        Edit
                                    </Button>
                                </div>
                                {(() => {
                                    const trackedShow = shows.find(s => s.id === show.id && s.source === source);
                                    if (!trackedShow || (!trackedShow.user_rating && !trackedShow.notes)) {
                                        return <p className="text-sm text-muted-foreground italic">Belum ada review. Bagikan pendapatmu!</p>;
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
                                    Review Season
                                </h2>
                                {(() => {
                                    const dbId = shows.find(s => s.id === show.id && s.source === source)?.dbId;
                                    const reviews = dbId ? (seasonReviews[dbId] || []) : [];
                                    if (reviews.length === 0) {
                                        return <p className="text-sm text-muted-foreground italic">Belum ada review per season.</p>;
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
                                Sinopsis
                            </h2>
                            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                                {show.summary ? stripHtml(show.summary) : "Tidak ada ringkasan tersedia."}
                            </p>
                        </div>

                        {show._embedded?.cast && show._embedded.cast.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    Cast
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border/50">
                            {show.premiered && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Tanggal Rilis</p>
                                    <p className="font-medium">
                                        {format(parseISO(show.premiered), "dd MMMM yyyy", { locale: localeId })}
                                    </p>
                                </div>
                            )}
                            {(show.network || show.webChannel) && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Network</p>
                                    <p className="font-medium">{(show.network || show.webChannel)?.name}</p>
                                </div>
                            )}
                            {show.runtime && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Durasi</p>
                                    <p className="font-medium text-foreground">{show.runtime} menit</p>
                                </div>
                            )}
                            {show.type && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Tipe Konten</p>
                                    <p className="font-medium text-foreground">{show.type}</p>
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
};

export default Detail;
