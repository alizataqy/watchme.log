import { Metadata } from "next";
import { getShowDetails } from "@/services/tvmaze";
import { getMovieDetails } from "@/services/tmdb";
import ShowDetailClient from "@/components/ShowDetailClient";
import { Show } from "@/types/show";

export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ source?: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const { source = "tvmaze" } = await searchParams;

    let show: Show | null = null;
    try {
        if (source === "tmdb") {
            show = await getMovieDetails(Number(id));
        } else {
            show = await getShowDetails(Number(id));
        }
    } catch (e) {
        // Silently fail for metadata
    }

    if (!show) {
        return {
            title: "Show Not Found - WatchMe.log",
        };
    }

    const cleanSummary = show.summary?.replace(/<[^>]*>?/gm, '').substring(0, 160) || `Track progress of ${show.name}`;

    return {
        title: `${show.name} - WatchMe.log`,
        description: cleanSummary,
        openGraph: {
            title: `${show.name} - WatchMe.log`,
            description: cleanSummary,
            images: show.image?.original ? [show.image.original] : [],
        },
        twitter: {
            card: "summary_large_image",
            title: `${show.name} - WatchMe.log`,
            description: cleanSummary,
            images: show.image?.original ? [show.image.original] : [],
        }
    };
}

export default async function DetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ source?: string }>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const id = resolvedParams.id;
    const source = resolvedSearchParams.source || "tvmaze";

    let show: Show | null = null;
    try {
        if (source === "tmdb") {
            show = await getMovieDetails(Number(id));
        } else {
            show = await getShowDetails(Number(id));
        }
    } catch (error) {
        console.error("Error fetching show details in SSR:", error);
    }

    if (!show) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Show tidak ditemukan.</p>
            </div>
        );
    }

    return <ShowDetailClient show={show} source={source} />;
}
