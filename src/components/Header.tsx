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
                        <h1 className="text-xl font-bold text-gradient">TrackerWatch</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-5 w-5" />
                            <span className="hidden sm:inline truncate max-w-[120px]">{user?.email}</span>
                        </div>
                        <ModeToggle />
                        <Button size="sm" variant="ghost" onClick={handleSignOut}>
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