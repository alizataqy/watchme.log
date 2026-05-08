"use client";

import { useState } from 'react';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { ShowCard } from '@/components/ShowCard';
import { EmptyState } from '@/components/EmptyState';
import { Show } from '@/types/show';
import { DashboardShell } from '@/components/DashboardShell';
import { useToast } from '@/hooks/use-toast';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { useSortFilter } from '@/hooks/useSortFilter';

interface ShowsViewProps {
  type: 'watching' | 'watchlist' | 'watched';
}

export default function ShowsView({ type }: ShowsViewProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const { 
    watchlist,
    watching,
    watched,
    watchedEpisodes,
    markAllEpisodesAsWatched, 
    updateShowStatus, 
    removeShow, 
    addShow,
    toggleEpisode,
    toggleEpisodesBulk,
    isInList,
    getShowStatus
  } = useShowStorage();
  
  const [localQuery, setLocalQuery] = useState('');
  
  const showsToDisplay = type === 'watching' ? watching : type === 'watchlist' ? watchlist : watched;
  
  const filteredShows = useFuzzySearch(showsToDisplay, localQuery);
  const sortFilter = useSortFilter(filteredShows);

  const handleMarkWatched = async (show: Show) => {
    await markAllEpisodesAsWatched(show.id, show.source);
    toast({
      title: t('toast.updated'),
      description: `${show.name} ${t('toast.markedAsWatched')}`,
    });
  };

  const handleMarkWatching = async (show: Show) => {
    await updateShowStatus(show.id, 'watching', show.source);
    toast({
      title: t('toast.updated'),
      description: `${show.name} ${t('toast.markedAsWatching')}`,
    });
  };

  const handleRemove = async (show: Show) => {
    await removeShow(show.id, show.source);
    toast({
      title: t('toast.removed'),
      description: `${show.name} ${t('toast.removedDesc')}`,
    });
  };

  const handleToggleEpisode = (showId: number, season: number, episode: number, name: string, airdate: string, source: string) => {
    toggleEpisode(showId, season, episode, name, airdate, source);
  };

  const handleToggleSeasonBulk = (showId: number, episodes: any[], allWatched: boolean, source: string) => {
    toggleEpisodesBulk(showId, episodes, source);
  };

  const handleMoveToWatchlist = (show: Show) => {
    updateShowStatus(show.id, 'watchlist', show.source);
    toast({
      title: t('toast.updated'),
      description: `${show.name} ${t('toast.addedWatchlistDesc')}`,
    });
  };

  return (
    <DashboardShell 
      activeTab={type}
      headerProps={{
        query: localQuery,
        onQueryChange: setLocalQuery,
        sortBy: sortFilter.sortBy,
        onSortChange: sortFilter.onSortChange,
        selectedGenres: sortFilter.selectedGenres,
        onGenreChange: sortFilter.onGenreChange,
        availableGenres: sortFilter.availableGenres,
        totalCount: sortFilter.sortedAndFiltered.length,
      }}
    >
      {sortFilter.sortedAndFiltered.length > 0 ? (
        <div className="space-y-3">
          {sortFilter.sortedAndFiltered.map((show) => (
            <ShowCard
              key={`${show.source}-${show.id}`}
              show={show}
              isInList={true}
              currentStatus={type}
              watchedEpisodes={watchedEpisodes[show.dbId!] || []}
              showEpisodeTracking={true}
              onMarkWatched={() => handleMarkWatched(show)}
              onRemove={() => handleRemove(show)}
              onMarkWatching={() => handleMarkWatching(show)}
              onAddToWatchlist={type === 'watched' ? () => handleMoveToWatchlist(show) : undefined}
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
          <EmptyState type={type} />
          {showsToDisplay.length > 0 && localQuery && (
            <p className="mt-4 text-sm text-muted-foreground">{t('index.noResults').replace('{query}', localQuery)}</p>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
