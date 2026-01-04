import { SearchBar } from "./SearchBar";
import { User, LogOut, Film } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "./ModeToggle";

interface HeaderProps {
    onSearch: (query: string) => void;
    isSearching: boolean;
    searchType: 'series' | 'movie';
    onSearchTypeChange: (type: 'series' | 'movie') => void;
    isLocalTab?: boolean;
}

export const Header = ({ onSearch, isSearching, searchType, onSearchTypeChange, isLocalTab }: HeaderProps) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    return (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="container py-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gradient">WatchMe.log</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2 px-2 hover:bg-secondary/80 h-9"
                            onClick={() => navigate('/profile')}
                        >
                            <User className="h-4 w-4 text-primary" />
                            <span className="hidden sm:inline truncate max-w-[120px] text-xs text-muted-foreground">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>
                        </Button>
                        <ModeToggle />
                        <Button size="sm" variant="ghost" onClick={handleSignOut} title="Keluar">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                <SearchBar
                    onSearch={onSearch}
                    isLoading={isSearching}
                    searchType={searchType}
                    onSearchTypeChange={onSearchTypeChange}
                    isLocalTab={isLocalTab}
                />
            </div>
        </header>
    );
};