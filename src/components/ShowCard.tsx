import { Show, TrackedShow } from '@/types/show';
import { Calendar, Star, Plus, Check, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter } from 'date-fns';
import { id } from 'date-fns/locale';

interface ShowCardProps {
  show: Show | TrackedShow;
  isInList?: boolean;
  currentStatus?: 'watchlist' | 'watched';
  onAddToWatchlist?: () => void;
  onMarkWatched?: () => void;
  onRemove?: () => void;
}

export function ShowCard({
  show,
  isInList,
  currentStatus,
  onAddToWatchlist,
  onMarkWatched,
  onRemove,
}: ShowCardProps) {
  const imageUrl = show.image?.medium || show.image?.original;
  const nextEpisode = show._embedded?.nextepisode;
  
  const isUpcoming = nextEpisode?.airdate && isAfter(parseISO(nextEpisode.airdate), new Date());

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

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
            <Badge 
              variant={show.status === 'Running' ? 'default' : 'secondary'}
              className="text-[10px] px-1.5 py-0"
            >
              {show.status}
            </Badge>
          </div>

          {show.premiered && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(show.premiered), 'dd MMM yyyy', { locale: id })}
            </p>
          )}

          {nextEpisode && isUpcoming && (
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

          {show.summary && !nextEpisode && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {stripHtml(show.summary)}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        {!isInList ? (
          <>
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
              className="flex-1 h-8 text-xs"
              onClick={onMarkWatched}
            >
              <Check className="h-3 w-3 mr-1" />
              Sudah Tonton
            </Button>
          </>
        ) : (
          <>
            {currentStatus === 'watchlist' ? (
              <Button
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={onMarkWatched}
              >
                <Eye className="h-3 w-3 mr-1" />
                Tandai Sudah Tonton
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-8 text-xs"
                onClick={onAddToWatchlist}
              >
                <Clock className="h-3 w-3 mr-1" />
                Pindah ke Watchlist
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
          </>
        )}
      </div>
    </div>
  );
}
