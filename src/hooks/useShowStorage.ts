import { useState, useEffect } from 'react';
import { TrackedShow } from '@/types/show';

const STORAGE_KEY = 'watchtracker_shows';

export function useShowStorage() {
  const [shows, setShows] = useState<TrackedShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setShows(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const saveShows = (newShows: TrackedShow[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShows));
    setShows(newShows);
  };

  const addShow = (show: TrackedShow) => {
    const exists = shows.find(s => s.id === show.id);
    if (!exists) {
      saveShows([...shows, show]);
    }
  };

  const removeShow = (id: number) => {
    saveShows(shows.filter(s => s.id !== id));
  };

  const updateShowStatus = (id: number, status: 'watchlist' | 'watched') => {
    saveShows(shows.map(s => 
      s.id === id ? { ...s, status } : s
    ));
  };

  const isInList = (id: number) => shows.some(s => s.id === id);
  
  const getShowStatus = (id: number) => shows.find(s => s.id === id)?.status;

  const watchlist = shows.filter(s => s.status === 'watchlist');
  const watched = shows.filter(s => s.status === 'watched');

  return {
    shows,
    watchlist,
    watched,
    isLoading,
    addShow,
    removeShow,
    updateShowStatus,
    isInList,
    getShowStatus,
  };
}
