import { Search, Eye, Clock, Calendar, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    counts: {
        watching: number;
        watchlist: number;
        upcoming: number;
        watched: number;
    };
}

import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

export function MobileNav({ activeTab, setActiveTab, counts }: MobileNavProps) {
    const { t } = useLanguage();

    const navItems = [
        { id: 'search', icon: Search, label: t('nav.search') },
        { id: 'watchlist', icon: Clock, label: t('nav.watchlist'), count: counts.watchlist },
        { id: 'watching', icon: Eye, label: t('nav.watching'), count: counts.watching },
        { id: 'upcoming', icon: Calendar, label: t('nav.upcoming'), count: counts.upcoming },
        { id: 'watched', icon: CheckCircle, label: t('nav.watched'), count: counts.watched },
    ];

    return (
        <nav className="fixed rounded-lg bottom-0 left-0 right-0 z-50 bg-background backdrop-blur-lg border-t border-border/50 safe-area-inset-bottom">
            <div className="grid grid-cols-5 h-16 max-w-md mx-auto relative">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative group",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "relative transition-transform duration-300",
                                isActive && "-translate-y-1"
                            )}>
                                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                                {item.count !== undefined && item.count > 0 && (
                                    <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in">
                                        {item.count}
                                    </span>
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-opacity duration-300",
                                isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                            )}>
                                {item.label}
                            </span>
                            {/* Active Background Glow */}
                            {isActive && (
                                <div className="absolute inset-0 bg-primary/15 dark:bg-primary/5 rounded-sm" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
