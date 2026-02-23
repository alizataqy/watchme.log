import { TrackedShow, Notification } from "../types/show";
import { differenceInDays, parseISO, format } from "date-fns";

export function detectUpcomingEpisodes(trackedShows: TrackedShow[], userId: string): Notification[] {
    const notifications: Notification[] = [];
    const today = new Date();

    trackedShows.filter((show) => show.trackStatus === 'watching').forEach((show) => {
        const nextEpisode = show._embedded?.nextepisode;
        if (!nextEpisode) return;
        const airdate = parseISO(nextEpisode.airdate);
        const daysUntilAir = differenceInDays(airdate, today);
        if (daysUntilAir >= 0 && daysUntilAir <= 5) {
            const uniqueKey = `upcoming-${show.id}-${nextEpisode.season}-${nextEpisode.number}-${nextEpisode.airdate}-${userId}`;
            notifications.push({
                id: `upcoming-${show.id}-${nextEpisode.season}-${nextEpisode.number}`,
                type: 'upcoming',
                showId: show.id,
                showName: show.name,
                message:
                    daysUntilAir === 0
                        ? 'Tayang hari ini sekitar jam ' + format(parseISO(nextEpisode.airstamp), 'HH:mm')
                        : daysUntilAir === 1
                            ? 'Tayang Besok sekitar jam ' + format(parseISO(nextEpisode.airstamp), 'HH:mm')
                            : `Tayang Dalam ${daysUntilAir} hari`,
                timestamp: new Date().toISOString(),
                read: false,
                uniqueKey,
                episodeInfo: {
                    season: nextEpisode.season,
                    episode: nextEpisode.number,
                    episodeName: nextEpisode.name,
                    airdate: nextEpisode.airdate,
                    airstamp: nextEpisode.airstamp,
                },
            });
        }
    });
    return notifications;
}

export function detectUnwatchedEpisodes(
    trackedShows: TrackedShow[],
    userId: string,
    watchedEpisodes?: Map<number, Set<string>>,
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
            if (daysSinceAir > 7 && daysSinceAir <= 30 && !isWatched) {
                const uniqueKey = `unwatched-${show.id}-${prevEpisode.season}-${prevEpisode.number}-${prevEpisode.airdate}-${userId}`;
                notifications.push({
                    id: `unwatched-${show.id}-${prevEpisode.season}-${prevEpisode.number}`,
                    type: 'unwatched',
                    showId: show.id,
                    showName: show.name,
                    message: `Episode sudah tayang ${daysSinceAir} hari yang lalu`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    uniqueKey,
                    episodeInfo: {
                        season: prevEpisode.season,
                        episode: prevEpisode.number,
                        episodeName: prevEpisode.name,
                        airdate: prevEpisode.airdate,
                        airstamp: prevEpisode.airstamp,
                    },
                });
            }
        });
    return notifications;
}

export function detectInactiveSeries(
    trackedShows: TrackedShow[],
    userId: string,
    lastWatchedDates?: Map<number, Date>,
    watchedEpisodes?: Map<number, Set<string>>,
): Notification[] {
    const notifications: Notification[] = [];
    const today = new Date();
    const INACTIVE_DAYS = 7; // Ingatkan setelah 7 hari tidak menonton

    trackedShows
        .filter((show) => show.trackStatus === 'watching')
        .forEach((show) => {
            const lastWatched = lastWatchedDates?.get(show.id);

            // Jika ada data kapan terakhir menonton
            if (lastWatched) {
                const daysSinceLastWatch = differenceInDays(today, lastWatched);

                // Jika sudah 7+ hari tidak menonton
                if (daysSinceLastWatch >= INACTIVE_DAYS && daysSinceLastWatch <= 30) {
                    // uniqueKey based on date to allow re-notification every 7 days
                    const weekNumber = Math.floor(daysSinceLastWatch / 7);
                    const uniqueKey = `inactive-${show.id}-week${weekNumber}-${userId}`;

                    // Cari episode terakhir yang user tonton dari watchedEpisodes
                    let lastWatchedEpisode: { season: number; episode: number; } | undefined;
                    const watchedSet = watchedEpisodes?.get(show.id);

                    if (watchedSet && watchedSet.size > 0) {
                        // Parse semua episode yang ditonton dan cari yang terbesar
                        const episodes = Array.from(watchedSet).map(key => {
                            const match = key.match(/S(\d+)E(\d+)/);
                            if (match) {
                                return {
                                    season: parseInt(match[1]),
                                    episode: parseInt(match[2]),
                                };
                            }
                            return null;
                        }).filter(ep => ep !== null) as { season: number; episode: number }[];

                        // Sort: season descending, then episode descending
                        episodes.sort((a, b) => {
                            if (a.season !== b.season) {
                                return b.season - a.season;
                            }
                            return b.episode - a.episode;
                        });

                        lastWatchedEpisode = episodes[0];
                    }

                    notifications.push({
                        id: `inactive-${show.id}`,
                        type: 'inactive',
                        showId: show.id,
                        showName: show.name,
                        message: `Sudah ${daysSinceLastWatch} hari tidak menonton series ini`,
                        timestamp: new Date().toISOString(),
                        read: false,
                        uniqueKey,
                        episodeInfo: lastWatchedEpisode ? {
                            season: lastWatchedEpisode.season,
                            episode: lastWatchedEpisode.episode,
                            episodeName: show.name,
                            airdate: null,
                            airstamp: null,
                        } : undefined,
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