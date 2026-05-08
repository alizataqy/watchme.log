"use client";

import { useEffect } from "react";

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    author?: string;
    type?: 'website' | 'tv-series' | 'movie';
    // Additional props for TV Series and Movie schema
    genres?: string[];
    rating?: number;
    releaseDate?: string;
    status?: string;
}

const SEO = ({
    title,
    description,
    keywords,
    image = "/og-image.png",
    url = "https://watchme-log.vercel.app/",
    author = "taqy",
    type = 'website',
    genres = [],
    rating,
    releaseDate,
    status
}: SEOProps) => {
    useEffect(() => {
        const siteTitle = "WatchMe.log";
        const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
        document.title = fullTitle;
    }, [title]);

    return null;
};

export default SEO;
