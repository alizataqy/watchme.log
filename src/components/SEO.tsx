import { Helmet } from "react-helmet-async";

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
    const siteTitle = "WatchMe.log";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const defaultDescription = "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi episode terbaru.";
    const defaultKeywords = "watchme log, watchme.log, movie tracker, series tracker, track shows, movie list, daftar tontonan, tv shows progress, tracker film gratis";

    // Clean canonical URL - remove query parameters for SEO
    const canonicalUrl = url.split('?')[0];

    // Enhanced keywords with genres if available
    const enhancedKeywords = genres.length > 0
        ? `${keywords || defaultKeywords}, ${genres.join(', ')}`
        : keywords || defaultKeywords;

    // Base JSON-LD for the application
    const appJsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": siteTitle,
        "operatingSystem": "Any",
        "applicationCategory": "EntertainmentApplication",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": defaultDescription,
        "author": {
            "@type": "Person",
            "name": author
        },
        "url": "https://watchme-log.vercel.app/"
    };

    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": "https://watchme-log.vercel.app/",
        "name": siteTitle,
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://watchme-log.vercel.app/?tab=search&q={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };

    // Generate specific JSON-LD based on type
    let contentJsonLd = null;

    if (type === 'tv-series' && title) {
        contentJsonLd = {
            "@context": "https://schema.org",
            "@type": "TVSeries",
            "name": title,
            "image": image,
            "description": description || defaultDescription,
            ...(genres.length > 0 && { "genre": genres }),
            ...(rating && {
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": rating.toString(),
                    "bestRating": "10",
                    "worstRating": "0"
                }
            }),
            ...(releaseDate && { "datePublished": releaseDate }),
            ...(status && { "productionStatus": status }),
            "url": canonicalUrl
        };
    } else if (type === 'movie' && title) {
        contentJsonLd = {
            "@context": "https://schema.org",
            "@type": "Movie",
            "name": title,
            "image": image,
            "description": description || defaultDescription,
            ...(genres.length > 0 && { "genre": genres }),
            ...(rating && {
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": rating.toString(),
                    "bestRating": "10",
                    "worstRating": "0"
                }
            }),
            ...(releaseDate && { "datePublished": releaseDate }),
            "url": canonicalUrl
        };
    }

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description || defaultDescription} />
            <meta name="keywords" content={enhancedKeywords} />
            <meta name="author" content={author} />
            <meta name="robots" content="index, follow, max-image-preview:large" />
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type === 'website' ? 'website' : 'video.other'} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description || defaultDescription} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={siteTitle} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={canonicalUrl} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description || defaultDescription} />
            <meta property="twitter:image" content={image} />

            {/* JSON-LD Structured Data */}
            {type === 'website' && (
                <>
                    <script type="application/ld+json">
                        {JSON.stringify(appJsonLd)}
                    </script>
                    <script type="application/ld+json">
                        {JSON.stringify(websiteJsonLd)}
                    </script>
                </>
            )}

            {contentJsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(contentJsonLd)}
                </script>
            )}
        </Helmet>
    );
};

export default SEO;
