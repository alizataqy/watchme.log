import { Helmet } from "react-helmet-async";

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    author?: string;
}

const SEO = ({
    title,
    description,
    keywords,
    image = "/og-image.png",
    url = "https://watchme-log.vercel.app/",
    author = "taqy"
}: SEOProps) => {
    const siteTitle = "WatchMe.log";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const defaultDescription = "Simpan dan pantau progress nonton film serta series TV favoritmu dengan WatchMe.log. Kelola watchlist dengan mudah dan dapatkan notifikasi episode terbaru.";
    const defaultKeywords = "watchme log, watchme.log, movie tracker, series tracker, track shows, movie list, daftar tontonan, tv shows progress, tracker film gratis";

    const jsonLd = {
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
        "url": url
    };

    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": url,
        "name": siteTitle,
        "potentialAction": {
            "@type": "SearchAction",
            "target": `${url}?tab=search&q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    };

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description || defaultDescription} />
            <meta name="keywords" content={keywords || defaultKeywords} />
            <meta name="author" content={author} />
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description || defaultDescription} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description || defaultDescription} />
            <meta property="twitter:image" content={image} />

            {/* JSON-LD Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(websiteJsonLd)}
            </script>
        </Helmet>
    );
};

export default SEO;
