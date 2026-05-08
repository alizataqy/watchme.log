"use client";

import { useState } from 'react';
import { useUpcomingShows } from '@/hooks/useUpcomingShows';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { ShowCard } from '@/components/ShowCard';
import { ShowCardSkeleton } from '@/components/ShowCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Calendar, Clock } from 'lucide-react';
import { Show } from '@/types/show';
import { DashboardShell } from '@/components/DashboardShell';
import { useToast } from '@/hooks/use-toast';

interface UpcomingViewProps {
  initialUpcomingShows?: Show[];
  initialRecentlyAired?: Show[];
}

export default function UpcomingView({ initialUpcomingShows, initialRecentlyAired }: UpcomingViewProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { 
    getShowStatus, 
    watchedEpisodes, 
    markAllEpisodesAsWatched, 
    updateShowStatus, 
    removeShow, 
    toggleEpisode, 
    shows,
    isInList
  } = useShowStorage();
  
  const { upcomingShows, recentlyAired, isLoading } = useUpcomingShows(initialUpcomingShows, initialRecentlyAired);
  const [localQuery, setLocalQuery] = useState('');

  const handleMarkWatched = async (show: Show) => {
    try {
      if (isInList(show.id, show.source)) {
        await markAllEpisodesAsWatched(show.id, show.source);
        toast({
          title: t('toast.updated'),
          description: `${show.name} ${t('toast.markedAsWatched')}`,
        });
      }
    } catch (error) {
      console.error('Error marking watched:', error);
    }
  };

  const handleMarkWatching = async (show: Show) => {
    try {
      await updateShowStatus(show.id, 'watching', show.source);
      toast({
        title: t('toast.updated'),
        description: `${show.name} ${t('toast.markedAsWatching')}`,
      });
    } catch (error) {
      console.error('Error marking watching:', error);
    }
  };

  const handleRemove = async (show: Show) => {
    try {
      await removeShow(show.id, show.source);
      toast({
        title: t('toast.removed'),
        description: `${show.name} ${t('toast.removedDesc')}`,
      });
    } catch (error) {
      console.error('Error removing show:', error);
    }
  };

  return (
    <DashboardShell 
      activeTab="upcoming"
      headerProps={{
        query: localQuery,
        onQueryChange: setLocalQuery,
        isUpcomingTab: true,
        hideSort: true,
        hideFilter: true,
      }}
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShowCardSkeleton key={i} />
          ))}
        </div>
      ) : upcomingShows.length === 0 && recentlyAired.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <EmptyState type="upcoming" />
          {shows.length > 0 && localQuery && (
            <p className="mt-4 text-sm text-muted-foreground">{t('index.noSchedule').replace('{query}', localQuery)}</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingShows.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-primary px-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('nav.upcoming')}
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
                    toggleEpisode(show.id, season, episode, name, airdate, show.source)
                  }
                  isUpcomingView={true}
                />
              ))}
            </div>
          )}

          {recentlyAired.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold px-1 flex items-center text-destructive gap-2">
                <Clock className="h-4 w-4" />
                {t('index.recentlyAired')}
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
                    toggleEpisode(show.id, season, episode, name, airdate, show.source)
                  }
                  isUpcomingView={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
