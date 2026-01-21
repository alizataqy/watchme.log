import { Search, Clock, Eye, CheckCircle, Calendar } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";

interface EmptyStateProps {
    type: 'search' | 'watchlist' | 'watched' | 'watching' | 'upcoming';
}

export function EmptyState({ type }: EmptyStateProps) {
    const { t } = useLanguage();
    const content = {
        search: {
            icon: Search,
            title: t('empty.search.title'),
            description: t('empty.search.desc'),
        },
        watching: {
            icon: Eye,
            title: t('empty.watching.title'),
            description: t('empty.watching.desc'),
        },
        watchlist: {
            icon: Clock,
            title: t('empty.watchlist.title'),
            description: t('empty.watchlist.desc'),
        },
        watched: {
            icon: CheckCircle,
            title: t('empty.watched.title'),
            description: t('empty.watched.desc'),
        },
        upcoming: {
            icon: Calendar,
            title: t('empty.upcoming.title'),
            description: t('empty.upcoming.desc'),
        },
    };

    const { icon: Icon, title, description } = content[type];

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-[240px]">{description}</p>
        </div>
    );
}
