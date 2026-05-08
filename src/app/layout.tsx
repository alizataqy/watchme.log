import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { createClient } from "@/integrations/supabase/server";
import { TrackedShow, TrackedShowRow, SeasonReview } from "@/types/show";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WatchMe.log - Track Your Shows & Movies",
  description: "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log. Kelola daftar tontonan dengan mudah.",
  keywords: ["watchme log", "watchme.log", "movie tracker", "series tracker", "track shows", "movie list", "daftar tontonan", "tv shows progress"],
  authors: [{ name: "taqy" }],
  robots: "index, follow",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://watchme-log.vercel.app/",
    title: "WatchMe.log - Track Your Shows & Movies",
    description: "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WatchMe.log",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WatchMe.log - Track Your Shows & Movies",
    description: "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log.",
    images: ["/og-image.png"],
  },
  other: {
    "google-site-verification": "CtKabgz4N2_NiMCQ74QNaLx6QFZhGUfvUuIcyk03IKc",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;

  let initialShows: TrackedShow[] = [];
  let initialWatchedEpisodes: Record<string, { season: number; episode: number }[]> = {};
  let initialLastWatchedDates: Record<number, Date> = {};
  let initialSeasonReviews: Record<string, SeasonReview[]> = {};

  if (user) {
    try {
      const { data: trackedShows } = await supabase
        .from('tracked_shows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (trackedShows) {
        initialShows = trackedShows.map((s: TrackedShowRow) => ({
          id: s.show_id,
          dbId: s.id,
          name: s.name,
          image: s.image_url ? { medium: s.image_url, original: s.image_url } : null,
          premiered: s.premiered,
          ended: s.ended,
          status: s.status,
          genres: s.genres || [],
          rating: { average: s.rating ? Number(s.rating) : null },
          summary: s.summary,
          addedAt: s.created_at,
          trackStatus: s.track_status as TrackedShow['trackStatus'],
          source: s.source as TrackedShow['source'],
          user_rating: s.user_rating || undefined,
          notes: s.notes || undefined,
        }));
      }

      const { data: reviews } = await supabase
        .from('season_reviews')
        .select('*')
        .eq('user_id', user.id);

      if (reviews) {
        reviews.forEach(review => {
          if (!initialSeasonReviews[review.tracked_show_id]) {
            initialSeasonReviews[review.tracked_show_id] = [];
          }
          initialSeasonReviews[review.tracked_show_id].push(review);
        });
      }

      const { data: episodes } = await supabase
        .from('watched_episodes')
        .select('*')
        .eq('user_id', user.id);

      if (episodes) {
        episodes.forEach((ep) => {
          if (!initialWatchedEpisodes[ep.tracked_show_id]) {
            initialWatchedEpisodes[ep.tracked_show_id] = [];
          }
          initialWatchedEpisodes[ep.tracked_show_id].push({
            season: ep.season,
            episode: ep.episode,
          });

          const show = initialShows.find((s) => s.dbId === ep.tracked_show_id);
          if (show) {
            const watchedAt = new Date(ep.watched_at);
            if (!initialLastWatchedDates[show.id] || watchedAt > initialLastWatchedDates[show.id]) {
              initialLastWatchedDates[show.id] = watchedAt;
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers
          initialUser={user}
          initialSession={session}
          initialShows={initialShows}
          initialWatchedEpisodes={initialWatchedEpisodes}
          initialLastWatchedDates={initialLastWatchedDates}
          initialSeasonReviews={initialSeasonReviews}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
