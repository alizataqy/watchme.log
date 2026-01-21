import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  searchType: 'series' | 'movie';
  onSearchTypeChange: (type: 'series' | 'movie') => void;
  isLocalTab?: boolean;
}

export function SearchBar({ onSearch, isLoading, searchType, onSearchTypeChange, isLocalTab }: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSearchTypeChange('series')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${searchType === 'series'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
        >
          TV Series
        </button>
        <button
          type="button"
          onClick={() => onSearchTypeChange('movie')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${searchType === 'movie'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
        >
          Movies
        </button>
        <button
          type="button"
          onClick={() => navigate('/genre')}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors`}
        >
          Genre
        </button>
      </div>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={searchType === 'series' ? "Search TV Series..." : "Search Movies..."}
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (isLocalTab) {
              onSearch(val);
            }
          }}
          className="pl-10 pr-10 bg-secondary border-border focus:border-primary focus:ring-primary/20"
          disabled={isLoading}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
