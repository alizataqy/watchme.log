"use client";

import { useUpcoming } from '@/contexts/UpcomingContext';

// Legacy hook wrapper for compatibility
export const useUpcomingShows = (initialUpcoming: any = [], initialRecent: any = []) => {
    return useUpcoming();
};
