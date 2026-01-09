import { TrackedShow, Notification } from "../types/show";
import { differenceInDays, parseISO } from "date-fns";

export function detectUpcomingEpisodes(trackedShows: TrackedShow[]): Notification[] {
    const notifications: Notification[] = [];
    const today = new Date();

    trackedShows.filter((show) => show.trackStatus === 'watching').forEach((show) => {
        const nextEpisode = show._embedded?.nextepisode;
        if (!nextEpisode) return;
        const airdate = parseISO(nextEpisode.airdate);
        const daysUntilAir = differenceInDays(airdate, today);

        if (daysUntilAir >= 0 && daysUntilAir <= 5) {
            notifications.push({
                id: `upcoming-${show.id}-${nextEpisode.season}-${nextEpisode.number}`,
                type: 'watching',
                showId: show.id,
                showName: show.name,
                message:
                    daysUntilAir === 0
                        ? 'Tayang hari ini!'
                        : daysUntilAir === 1
                            ? 'Tayang Besok!'
                            : `Tayang Dalam ${daysUntilAir} hari`,
                timestamp: new Date().toISOString(),
                read: false,
                episodeInfo: {
                    season: nextEpisode.season,
                    episode: nextEpisode.number,
                    episodeName: nextEpisode.name,
                    airdate: nextEpisode.airdate,
                },
            });
        }
    });
    return notifications;
}

export function detectUnwatchedEpisodes(
    trackedShows: TrackedShow[],
    watchedEpisodes?: Map<number, Set<string>>
): Notification[] {
    const notifications: Notification[] = [];
    const today = new Date();

    trackedShows
        .filter((show) => show.trackStatus === 'watching')
        .forEach((show) => {
            const prevEpisode = show._embedded?.previousepisode;
            if (!prevEpisode) return;

            const airDate = parseISO(prevEpisode.airdate);
            const daysSinceAir = differenceInDays(today, airDate);

            // Format episode key as "season-number"
            const episodeKey = `S${prevEpisode.season}E${prevEpisode.number}`;
            const isWatched = watchedEpisodes?.get(show.id)?.has(episodeKey);

            if (daysSinceAir > 7 && !isWatched) {
                notifications.push({
                    id: `unwatched-${show.id}-${prevEpisode.season}-${prevEpisode.number}`,
                    type: 'watchlist',
                    showId: show.id,
                    showName: show.name,
                    message: `Episode sudah tayang ${daysSinceAir} hari yang lalu`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    episodeInfo: {
                        season: prevEpisode.season,
                        episode: prevEpisode.number,
                        episodeName: prevEpisode.name,
                        airdate: prevEpisode.airdate,
                    },
                });
            }
        });
    return notifications;
}

export function detectInactiveSeries(
    trackedShows: TrackedShow[],
    lastWatchedDates?: Map<number, Date> // Map<showId, lastWatchedDate>
): Notification[] {
    const notifications: Notification[] = [];
    const today = new Date();
    const INACTIVE_DAYS = 15; // Ingatkan setelah 15 hari tidak menonton

    trackedShows
        .filter((show) => show.trackStatus === 'watching')
        .forEach((show) => {
            const lastWatched = lastWatchedDates?.get(show.id);

            // Jika ada data kapan terakhir menonton
            if (lastWatched) {
                const daysSinceLastWatch = differenceInDays(today, lastWatched);

                // Jika sudah 15+ hari tidak menonton
                if (daysSinceLastWatch >= INACTIVE_DAYS) {
                    notifications.push({
                        id: `inactive-${show.id}`,
                        type: 'watched',
                        showId: show.id,
                        showName: show.name,
                        message: `Sudah ${daysSinceLastWatch} hari tidak menonton series ini`,
                        timestamp: new Date().toISOString(),
                        read: false,
                    });
                }
            }
        });

    return notifications;
}

export function mergeNotifications(
    existing: Notification[],
    newNotifs: Notification[]
): Notification[] {
    const existingIds = new Set(existing.map((n) => n.id));
    const merged = [...existing];

    newNotifs.forEach((notif) => {
        if (!existingIds.has(notif.id)) {
            merged.push(notif);
        }
    });
    return merged.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}