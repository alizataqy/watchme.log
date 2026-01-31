import { createWriteStream } from 'fs';
import { SitemapStream } from 'sitemap';
import { Readable } from 'stream';

/**
 * Dynamic Sitemap Generator untuk WatchMe.log
 * 
 * Script ini generate sitemap.xml yang include:
 * 1. Static pages (homepage, auth, genre, etc)
 * 2. Dynamic show/movie pages berdasarkan popular shows
 */

const BASE_URL = process.env.BASE_URL;

// Static pages configuration
const staticPages = [
    {
        url: '/',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/auth',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/reset-password',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/genre',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/profile',
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/watching',
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/watched',
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/watchlist',
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/search',
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString().split('T')[0]
    },
    {
        url: '/upcoming',
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
    }
];

// Popular shows/movies - ini bisa diambil dari API atau database
// Untuk contoh, saya pakai popular shows
const popularShows = [
    // TV Shows dari TVMaze
    { id: 82, type: 'show', source: 'tvmaze', name: 'Game of Thrones' },
    { id: 169, type: 'show', source: 'tvmaze', name: 'Breaking Bad' },
    { id: 216, type: 'show', source: 'tvmaze', name: 'Rick and Morty' },
    { id: 1871, type: 'show', source: 'tvmaze', name: 'Westworld' },
    { id: 305, type: 'show', source: 'tvmaze', name: 'The Walking Dead' },
    { id: 73, type: 'show', source: 'tvmaze', name: 'The Flash' },
    { id: 13, type: 'show', source: 'tvmaze', name: 'Arrow' },
    { id: 210, type: 'show', source: 'tvmaze', name: 'Stranger Things' },
    { id: 175, type: 'show', source: 'tvmaze', name: 'The Big Bang Theory' },
    { id: 180, type: 'show', source: 'tvmaze', name: 'Firefly' },

    // Movies dari TMDB
    { id: 550, type: 'movie', source: 'tmdb', name: 'Fight Club' },
    { id: 603, type: 'movie', source: 'tmdb', name: 'The Matrix' },
    { id: 13, type: 'movie', source: 'tmdb', name: 'Forrest Gump' },
    { id: 680, type: 'movie', source: 'tmdb', name: 'Pulp Fiction' },
    { id: 157336, type: 'movie', source: 'tmdb', name: 'Interstellar' },
    { id: 27205, type: 'movie', source: 'tmdb', name: 'Inception' },
    { id: 278, type: 'movie', source: 'tmdb', name: 'The Shawshank Redemption' },
    { id: 238, type: 'movie', source: 'tmdb', name: 'The Godfather' },
    { id: 424, type: 'movie', source: 'tmdb', name: 'Schindler\'s List' },
    { id: 129, type: 'movie', source: 'tmdb', name: 'Spirited Away' }
];

async function generateSitemap() {
    // Create a stream to write to
    const stream = new SitemapStream({ hostname: BASE_URL });
    const writeStream = createWriteStream('./public/sitemap.xml');

    // Convert array to stream
    const links = [
        ...staticPages,
        ...popularShows.map(show => ({
            url: `/${show.type}/${show.id}?source=${show.source}`,
            changefreq: 'daily',
            priority: 0.6,
            lastmod: new Date().toISOString().split('T')[0]
        }))
    ];

    console.log('🚀 Generating sitemap.xml...');
    console.log(`📄 Total URLs: ${links.length}`);
    console.log(`   - Static pages: ${staticPages.length}`);
    console.log(`   - Dynamic show/movie pages: ${popularShows.length}`);

    // Pipe the sitemap stream to the file
    return new Promise((resolve, reject) => {
        Readable.from(links)
            .pipe(stream)
            .pipe(writeStream)
            .on('finish', () => {
                console.log('✅ Sitemap generated successfully at ./public/sitemap.xml');
                resolve();
            })
            .on('error', (err) => {
                console.error('❌ Error generating sitemap:', err);
                reject(err);
            });
    });
}

// Run the generator
generateSitemap().catch(console.error);
