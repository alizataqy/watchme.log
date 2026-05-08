import UpcomingView from "./UpcomingView";
import { createClient } from "@/integrations/supabase/server";
import { getShowDetails } from "@/services/tvmaze";
import { Show, TrackedShowRow } from "@/types/show";
import { isAfter, parseISO } from 'date-fns';
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming Shows - WatchMe.log",
  description: "Lihat jadwal tayang episode terbaru dari serial TV dan film favoritmu.",
};

export default async function UpcomingPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    let initialUpcomingShows: Show[] = [];
    let initialRecentlyAired: Show[] = [];

    if (user) {
        try {
            const { data: showsData } = await supabase
                .from('tracked_shows')
                .select('*')
                .eq('user_id', user.id)
                .in('track_status', ['watching', 'watchlist']);

            if (showsData) {
                const showsToSync = showsData.map((s: TrackedShowRow) => ({
                    id: s.show_id,
                    dbId: s.id,
                    name: s.name,
                    source: s.source,
                    premiered: s.premiered,
                }));

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tenDaysAgo = new Date(today);
                tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

                // Process in parallel on the server
                const candidateResults = await Promise.all(
                    showsToSync.map(async (show) => {
                        if (show.source === 'tmdb') {
                            if (show.premiered && isAfter(parseISO(show.premiered), tenDaysAgo)) {
                                return { 
                                    id: show.id,
                                    name: show.name,
                                    premiered: show.premiered,
                                    source: 'tmdb',
                                    dbId: show.dbId,
                                    rating: { average: null },
                                    genres: [],
                                    image: null,
                                } as unknown as Show;
                            }
                            return null;
                        }

                        try {
                            const freshData = await getShowDetails(show.id, false);
                            if (!freshData) return null;
                            return { ...freshData, source: 'tvmaze', dbId: show.dbId } as Show;
                        } catch (e) {
                            return null;
                        }
                    })
                );

                const validCandidates = candidateResults.filter((s): s is Show => s !== null);

                initialUpcomingShows = validCandidates.filter(s => {
                    const airDateStr = s.source === 'tmdb' ? s.premiered : s._embedded?.nextepisode?.airdate;
                    if (!airDateStr) return false;
                    return !isAfter(today, parseISO(airDateStr));
                }).sort((a, b) => {
                    const getDate = (item: Show) => (item.source === 'tmdb' ? item.premiered : item._embedded?.nextepisode?.airdate) || '9999-12-31';
                    return new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime();
                });

                initialRecentlyAired = validCandidates.filter(s => {
                    const isUpcoming = initialUpcomingShows.some(u => u.id === s.id && u.source === s.source);
                    if (isUpcoming) return false;
                    const airDateStr = s.source === 'tmdb' ? s.premiered : (s._embedded?.nextepisode?.airdate || s._embedded?.previousepisode?.airdate);
                    if (!airDateStr) return false;
                    return isAfter(today, parseISO(airDateStr)) && isAfter(parseISO(airDateStr), tenDaysAgo);
                }).sort((a, b) => {
                    const getDate = (item: Show) => (item.source === 'tmdb' ? item.premiered : (item._embedded?.nextepisode?.airdate || item._embedded?.previousepisode?.airdate)) || '0000-01-01';
                    return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
                });
            }
        } catch (error) {
            console.error("Error in UpcomingPage SSR:", error);
        }
    }

    return (
        <UpcomingView 
            initialUpcomingShows={initialUpcomingShows} 
            initialRecentlyAired={initialRecentlyAired} 
        />
    );
}
