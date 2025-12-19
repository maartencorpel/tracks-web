'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SEARCH_DEBOUNCE_MS, MIN_SEARCH_LENGTH } from '@/lib/constants';

interface TrackSearchProps {
  onSearch: (query: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  error?: string | null;
}

export function TrackSearch({
  onSearch,
  isLoading = false,
  placeholder = 'Search for a track...',
  error,
}: TrackSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= MIN_SEARCH_LENGTH) {
      onSearch(debouncedQuery.trim());
    }
  }, [debouncedQuery, onSearch]);

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(error && 'border-destructive')}
          aria-label="Search for tracks"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={isLoading}
            className="shrink-0"
            aria-label="Clear search"
          >
            ×
          </Button>
        )}
      </div>
      {isLoading && query.trim().length >= MIN_SEARCH_LENGTH && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH && (
        <p className="text-sm text-muted-foreground">
          Type at least {MIN_SEARCH_LENGTH} characters to search
        </p>
      )}
    </div>
  );
}
