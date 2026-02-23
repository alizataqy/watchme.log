import { SearchBar } from "./SearchBar";
import { User, LogOut, Film, Languages } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "./ModeToggle";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";
import { SortOption } from "./SortFiterBar";

interface HeaderProps {
    onSearch: (query: string, skipNavigate?: boolean) => void;
    isSearching: boolean;
    searchType: 'series' | 'movie' | 'all';
    onSearchTypeChange: (type: 'series' | 'movie' | 'all', queryOverride?: string) => void;
    isLocalTab?: boolean;
    isUpcomingTab?: boolean;
    // SortFilterBar props
    sortBy?: SortOption;
    onSortChange?: (sort: SortOption) => void;
    selectedGenres?: string[];
    onGenreChange?: (genres: string[]) => void;
    availableGenres?: string[];
    totalCount?: number;
    hideSort?: boolean;
    hideFilter?: boolean;
}

export const Header = ({
    onSearch,
    isSearching,
    searchType,
    onSearchTypeChange,
    isLocalTab,
    isUpcomingTab,
    sortBy,
    onSortChange,
    selectedGenres,
    onGenreChange,
    availableGenres,
    totalCount,
    hideSort,
    hideFilter,

}: HeaderProps) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };



    return (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="container py-4">
                <div className="flex justify-between mb-4 items-center">
                    <div className="flex items-center justify-center gap-2 ">
                        <h1 className="text-wrap overflow-hidden text-primary flex items-center gap-1 ">
                            <img src="/favicon.ico" alt="logo" className="w-8 h-8" />
                            <span className="text-sm font-bold">{user?.user_metadata?.full_name || user?.email}</span>
                        </h1>
                    </div>
                    <div className="flex items-center justify-enddisc gap-2">
                        <Button
                            variant="link"
                            size="sm"
                            className="flex items-center gap-2 px-2 h-9"
                            onClick={() => navigate('/profile')}
                        >
                            <User className="h-4 w-4 text-primary" />
                            <span className="hidden sm:inline truncate max-w-[120px] text-xs text-muted-foreground">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" title={t('header.changeLanguage')}>
                                    <Languages className="h-[1.2rem] w-[1.2rem]" />
                                    <span className="sr-only">{t('header.changeLanguage')}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setLanguage("id")} className={language === 'id' ? 'bg-primary/15 text-primary font-medium' : ''}>
                                    Bahasa Indonesia
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setLanguage("en")} className={language === 'en' ? 'bg-primary/15 text-primary font-medium' : ''}>
                                    English
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <ModeToggle />
                        <Button size="sm" variant="link" onClick={handleSignOut} title={t('header.signOut')}>
                            <LogOut className="h-5 w-5 text-destructive" />
                        </Button>
                    </div>
                </div>
                <SearchBar
                    onSearch={onSearch}
                    isLoading={isSearching}
                    searchType={searchType}
                    onSearchTypeChange={onSearchTypeChange}
                    isLocalTab={isLocalTab}
                    isUpcomingTab={isUpcomingTab}
                    sortBy={sortBy}
                    onSortChange={onSortChange}
                    selectedGenres={selectedGenres}
                    onGenreChange={onGenreChange}
                    availableGenres={availableGenres}
                    totalCount={totalCount}
                    hideSort={hideSort}
                    hideFilter={hideFilter}
                />
            </div>
        </header>
    );
};
