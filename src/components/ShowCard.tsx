import { Show, TrackedShow } from '@/types/show';
import { Calendar, Star, Plus, Check, Eye, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, differenceInDays, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState, useEffect } from 'react';

interface Episode {
  season: number;
  number: number;
  name: string;
  airdate: string;
}

interface ShowCardProps {
  show: Show | TrackedShow;
  isInList?: boolean;
  currentStatus?: 'watchlist' | 'watched' | 'watching';
  watchedEpisodes?: { season: number; episode: number }[];
  onAddToWatchlist?: () => void;
  onMarkWatched?: () => void;
  onMarkWatching?: () => void;
  onRemove?: () => void;
  onToggleEpisode?: (season: number, episode: number, episodeName: string, airdate: string) => void;
  showEpisodeTracking?: boolean;
  isUpcomingView?: boolean;
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
  showEpisodeTracking = false,
  isUpcomingView = false,
}: ShowCardProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);

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

  const loadEpisodes = async () => {
    if (episodes.length > 0) {
      setShowEpisodes(!showEpisodes);
      return;
    }

    if (isMovie) return;

    setIsLoadingEpisodes(true);
    try {
      const response = await fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`);
      const data = await response.json();
      setEpisodes(data.map((ep: Episode) => ({
        season: ep.season,
        number: ep.number,
        name: ep.name,
        airdate: ep.airdate,
      })));
      setShowEpisodes(true);
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setIsLoadingEpisodes(false);
    }
  };

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
    <div className="glass-card rounded-lg overflow-hidden animate-fade-in hover:border-primary/50 transition-all duration-300 group">
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
              No Image
            </div>
          )}
          {show.rating?.average && (
            <div className="absolute top-1 left-1 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
              <Star className="h-3 w-3 text-warning fill-warning" />
              {show.rating.average}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h3 className="font-semibold text-sm truncate">{show.name}</h3>

          <div className="flex flex-wrap gap-1 mt-1">
            {show.genres?.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-[10px] px-1.5 py-0">
                {genre}
              </Badge>
            ))}
          </div>
          {show.premiered && !isUpcomingView && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(show.premiered), 'dd MMM yyyy', { locale: id })}
            </p>
          )}

          {/* Special Upcoming Display in Info section */}
          {isUpcomingView && (
            <div className="mt-2 p-2 bg-primary/10 rounded text-xs border border-primary/20">
              <p className="text-primary font-medium flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4" />
                {isMovie
                  ? (() => {
                    if (!show.premiered) return 'TBA';

                    const releaseDate = parseISO(show.premiered);
                    const today = new Date();
                    const daysDiff = differenceInDays(releaseDate, today);

                    if (daysDiff < 0 && daysDiff > -10) {
                      return formatDistanceToNow(releaseDate, { addSuffix: true, locale: id });
                    } else if (daysDiff >= 0 && daysDiff < 10) {
                      return formatDistanceToNow(releaseDate, { addSuffix: true, locale: id });
                    }

                    return format(releaseDate, 'dd MMM yyyy', { locale: id });
                  })()
                  : (() => {
                    const latestEpisode = show._embedded?.nextepisode || show._embedded?.previousepisode;
                    if (!latestEpisode?.airdate) return 'TBA';

                    const airDate = latestEpisode.airstamp ? parseISO(latestEpisode.airstamp) : parseISO(latestEpisode.airdate);
                    const today = new Date();
                    const daysDiff = differenceInDays(airDate, today);

                    let relativeTime = '';
                    if (Math.abs(daysDiff) < 10) {
                      relativeTime = formatDistanceToNow(airDate, { addSuffix: true, locale: id });
                    } else {
                      relativeTime = format(airDate, 'dd MMM yyyy', { locale: id });
                    }

                    const timeStr = latestEpisode.airstamp
                      ? ` Pukul ${format(parseISO(latestEpisode.airstamp), 'HH:mm')}`
                      : '';

                    return `${relativeTime}${timeStr}`;
                  })()
                }
              </p>
              {!isMovie && (show._embedded?.nextepisode || show._embedded?.previousepisode) && (
                <p className="text-muted-foreground ml-6">
                  {show._embedded?.nextepisode ? 'Next' : 'Latest'}: S{(show._embedded?.nextepisode || show._embedded?.previousepisode)!.season}E{(show._embedded?.nextepisode || show._embedded?.previousepisode)!.number}: {(show._embedded?.nextepisode || show._embedded?.previousepisode)!.name}
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
                {format(parseISO(nextEpisode.airdate), 'dd MMM yyyy', { locale: id })}
              </p>
            </div>
          )}

          {showEpisodeTracking && totalEpisodes > 0 && !isMovie && (
            <div className="mt-1 text-xs text-muted-foreground">
              Progress: {watchedCount}/{totalEpisodes} episode
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
                onClick={onAddToWatchlist}
              >
                <Plus className="h-3 w-3 mr-1" />
                Watchlist
              </Button>
              <Button
                size="sm"
                variant="default"
                className="flex-1 h-8 text-xs"
                onClick={isMovie ? onMarkWatched : onMarkWatching}
              >
                {isMovie ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Sudah Tonton
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Mulai Nonton
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
                  {isLoadingEpisodes ? 'Loading...' : showEpisodes ? 'Tutup' : 'Episode'}
                </Button>
              )}

              {currentStatus === 'watchlist' && (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={isMovie ? onMarkWatched : onMarkWatching}
                >
                  {isMovie ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Selesai
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Nonton
                    </>
                  )}
                </Button>
              )}

              {currentStatus === 'watching' && (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={onMarkWatched}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Selesai
                </Button>
              )}

              {currentStatus === 'watched' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-8 text-xs"
                  onClick={onMarkWatching}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Tonton Lagi
                </Button>
              )}

              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs px-3"
                onClick={onRemove}
              >
                Hapus
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Simplified Action for Upcoming View (Just Reminder text already shown above, maybe simple Remove/Check link?)
        // User said "dibuat reminder saja", but user might still want to remove it?
        // Let's keep it clean as requested.
        null
      )}

      {/* Episode List */}
      {showEpisodes && episodes.length > 0 && (
        <div className="px-3 pb-3 max-h-64 overflow-y-auto scrollbar-hide">
          {Object.entries(episodesBySeason).map(([season, eps]) => (
            <div key={season} className="mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Season {season}
              </h4>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
                {eps.map((ep) => {
                  const watched = isEpisodeWatched(ep.season, ep.number);
                  const isFuture = ep.airdate && isAfter(parseISO(ep.airdate), new Date());

                  return (
                    <div
                      key={`${ep.season}-${ep.number}`}
                      onClick={() => !isFuture && onToggleEpisode?.(ep.season, ep.number, ep.name, ep.airdate)}
                      className={`
                        aspect-square rounded flex items-center justify-center text-sm font-bold transition-all
                        ${isFuture
                          ? "bg-muted text-gray-200 text-muted-foreground/30 cursor-not-allowed opacity-50 grayscale pointer-events-none"
                          : "cursor-pointer"
                        }
                        ${!isFuture && (watched
                          ? "bg-primary text-gray-800 hover:bg-primary/90 shadow-md"
                          : "bg-secondary text-gray-200 hover:bg-secondary/80"
                        )}
                      `}
                      title={isFuture ? `Tayang: ${ep.airdate}` : ep.name}
                    >
                      {ep.number}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
