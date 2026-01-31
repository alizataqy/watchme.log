import fs from 'fs';
import { env } from 'process';

/**
 * Simple Sitemap Generator tanpa dependencies eksternal
 * Generate sitemap.xml untuk WatchMe.log
 */

const BASE_URL = 'https://watchme-log.vercel.app';

interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

// Static pages
const staticUrls: SitemapUrl[] = [
    {
        loc: '/',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/auth',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/reset-password',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/genre',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/profile',
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/watching',
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/watched',
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/watchlist',
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/search',
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        loc: '/upcoming',
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
    }
];

interface TVMazeScheduleItem {
    show: {
        id: number;
        image: {
            medium?: string;
            original?: string;
        } | null;
        rating?: {
            average?: number;
        };
    };
}

interface TMDBMovie {
    id: number;
}

interface TMDBResponse {
    results: TMDBMovie[];
}

// Popular shows dari TVMaze (Top rated/popular)
async function fetchPopularTVShows(): Promise<number[]> {
    try {
        // Fetch today's schedule from TVMaze to get popular shows
        const response = await fetch('https://api.tvmaze.com/schedule?country=US');
        if (!response.ok) {
            console.error('Failed to fetch TVMaze shows, using fallback');
            return getFallbackTVShows();
        }

        const data: TVMazeScheduleItem[] = await response.json();

        // Extract unique show IDs and sort by rating
        const showsMap = new Map<number, { id: number; rating: number }>();

        data.forEach((item) => {
            const show = item.show;
            if (show && show.id && show.image) {
                const rating = show.rating?.average || 0;
                if (!showsMap.has(show.id) || (showsMap.get(show.id)!.rating < rating)) {
                    showsMap.set(show.id, { id: show.id, rating });
                }
            }
        });

        // Sort by rating and get top 15
        const popularShows = Array.from(showsMap.values())
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 15)
            .map(show => show.id);

        return popularShows.length > 0 ? popularShows : getFallbackTVShows();
    } catch (error) {
        console.error('Error fetching TVMaze shows:', error);
        return getFallbackTVShows();
    }
}

// Fallback popular TV shows jika API gagal
function getFallbackTVShows(): number[] {
    return [
        82, 169, 216, 1871, 305, 73, 13, 210, 175, 180, 526, 37, 1, 66, 431
    ];
}

// Popular movies dari TMDB
async function fetchPopularMovies(): Promise<number[]> {
    try {
        const apiKey = process.env.VITE_TMDB_API_KEY || '';
        if (!apiKey) {
            console.warn('TMDB API key not found, using fallback movies');
            return getFallbackMovies();
        }

        // Fetch trending movies from TMDB
        const response = await fetch(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`
        );

        if (!response.ok) {
            console.error('Failed to fetch TMDB movies, using fallback');
            return getFallbackMovies();
        }

        const data: TMDBResponse = await response.json();

        // Get top 15 trending movies
        const popularMovies = data.results
            .slice(0, 15)
            .map((movie) => movie.id);

        return popularMovies.length > 0 ? popularMovies : getFallbackMovies();
    } catch (error) {
        console.error('Error fetching TMDB movies:', error);
        return getFallbackMovies();
    }
}

// Fallback popular movies jika API gagal
function getFallbackMovies(): number[] {
    return [
        550, 603, 13, 680, 157336, 27205, 278, 238, 424, 129, 19404, 372058, 496243, 122, 497
    ];
}

function generateSitemapXML(urls: SitemapUrl[]): string {
    const urlEntries = urls.map(url => {
        const loc = `${BASE_URL}${url.loc}`;
        let entry = `  <url>\n    <loc>${loc}</loc>\n`;

        if (url.lastmod) {
            entry += `    <lastmod>${url.lastmod}</lastmod>\n`;
        }
        if (url.changefreq) {
            entry += `    <changefreq>${url.changefreq}</changefreq>\n`;
        }
        if (url.priority !== undefined) {
            entry += `    <priority>${url.priority}</priority>\n`;
        }

        entry += '  </url>';
        return entry;
    }).join('\n\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
  <!-- Static Pages -->
${urlEntries.substring(0, urlEntries.lastIndexOf('</url>') + 8)}

  <!-- Dynamic Show Pages -->
${urlEntries.substring(urlEntries.lastIndexOf('</url>') + 10)}

</urlset>`;
}

async function generateSitemap() {
    console.log('🚀 Generating sitemap.xml...');

    const today = new Date().toISOString().split('T')[0];

    // Fetch popular shows and movies from APIs
    const [popularTVShows, popularMovies] = await Promise.all([
        fetchPopularTVShows(),
        fetchPopularMovies()
    ]);

    // Generate URLs for shows and movies
    const dynamicUrls: SitemapUrl[] = [
        ...popularTVShows.map((id: number) => ({
            loc: `/show/${id}?source=tvmaze`,
            changefreq: 'daily' as const,
            priority: 0.6,
            lastmod: today
        })),
        ...popularMovies.map((id: number) => ({
            loc: `/show/${id}?source=tmdb`,
            changefreq: 'daily' as const,
            priority: 0.6,
            lastmod: today
        }))
    ];

    const allUrls = [...staticUrls, ...dynamicUrls];

    // Generate XML
    const xml = generateSitemapXML(allUrls);

    // Write to file
    const outputPath = './public/sitemap.xml';
    fs.writeFileSync(outputPath, xml, 'utf-8');

    console.log(`Sitemap generated successfully!`);
}

// Run the generator
generateSitemap();
