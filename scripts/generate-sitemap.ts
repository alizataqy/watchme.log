import fs from 'fs';
import { env } from 'process';

/**
 * Simple Sitemap Generator tanpa dependencies eksternal
 * Generate sitemap.xml untuk WatchMe.log
 */

const BASE_URL = process.env.BASE_URL;

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

// Popular shows dari TVMaze (Top rated/popular)
const popularTVShows = [
    82,    // Game of Thrones
    169,   // Breaking Bad
    216,   // Rick and Morty
    1871,  // Westworld
    305,   // The Walking Dead
    73,    // The Flash
    13,    // Arrow
    210,   // Stranger Things
    175,   // The Big Bang Theory
    180,   // Firefly
    526,   // The Vampire Diaries
    37,    // Supernatural
    1,     // Under the Dome
    66,    // The 100
    431,   // Fargo
];

// Popular movies dari TMDB
const popularMovies = [
    550,    // Fight Club
    603,    // The Matrix
    13,     // Forrest Gump
    680,    // Pulp Fiction
    157336, // Interstellar
    27205,  // Inception
    278,    // The Shawshank Redemption
    238,    // The Godfather
    424,    // Schindler's List
    129,    // Spirited Away
    19404,  // Dilwale Dulhania Le Jayenge
    372058, // Your Name
    496243, // Parasite
    122,    // The Lord of the Rings: The Return of the King
    497,    // The Green Mile
];

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

function generateSitemap() {
    console.log('🚀 Generating sitemap.xml...');

    const today = new Date().toISOString().split('T')[0];

    // Generate URLs for shows and movies
    const dynamicUrls: SitemapUrl[] = [
        ...popularTVShows.map(id => ({
            loc: `/show/${id}`,
            changefreq: 'daily' as const,
            priority: 0.6,
            lastmod: today
        })),
        ...popularMovies.map(id => ({
            loc: `/movie/${id}`,
            changefreq: 'daily' as const,
            priority: 0.6,
            lastmod: today
        }))
    ];

    const allUrls = [...staticUrls, ...dynamicUrls];

    console.log(`📄 Total URLs: ${allUrls.length}`);
    console.log(`   - Static pages: ${staticUrls.length}`);
    console.log(`   - TV Shows: ${popularTVShows.length}`);
    console.log(`   - Movies: ${popularMovies.length}`);

    // Generate XML
    const xml = generateSitemapXML(allUrls);

    // Write to file
    const outputPath = './public/sitemap.xml';
    fs.writeFileSync(outputPath, xml, 'utf-8');

    console.log(`✅ Sitemap generated successfully!`);
    console.log(`📍 Location: ${outputPath}`);
    console.log(`🔗 Will be available at: ${BASE_URL}/sitemap.xml`);
}

// Run the generator
generateSitemap();
