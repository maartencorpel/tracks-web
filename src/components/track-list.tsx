'use client';

import { useState, useMemo, useEffect } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { TrackCard } from '@/components/track-card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface TrackListProps {
  tracks: SpotifyTrack[];
  selectedTrackId: string | null;
  onSelectTrack: (track: SpotifyTrack) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function TrackList({
  tracks,
  selectedTrackId,
  onSelectTrack,
  isLoading = false,
  error = null,
}: TrackListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'year'>('title');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort tracks
  const filteredTracks = useMemo(() => {
    let filtered = [...tracks];

    // Filter by search query
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (track) =>
          track.name.toLowerCase().includes(query) ||
          track.artists.some((a) => a.name.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.name.localeCompare(b.name);
        case 'artist':
          return (a.artists[0]?.name || '').localeCompare(
            b.artists[0]?.name || ''
          );
        case 'year':
          const yearA = a.album.release_date?.substring(0, 4) || '';
          const yearB = b.album.release_date?.substring(0, 4) || '';
          return yearB.localeCompare(yearA); // Newest first
        default:
          return 0;
      }
    });

    return filtered;
  }, [tracks, debouncedSearchQuery, sortBy]);

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by track name or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="w-40">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'title' | 'artist' | 'year')
            }
            disabled={isLoading}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'cursor-pointer'
            )}
            aria-label="Sort tracks"
          >
            <option value="title">Sort by Title</option>
            <option value="artist">Sort by Artist</option>
            <option value="year">Sort by Year</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading tracks...</p>
        </div>
      )}

      {/* Track List */}
      {!isLoading && (
        <>
          {filteredTracks.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onSelect={onSelectTrack}
                  isSelected={selectedTrackId === track.id}
                />
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                {debouncedSearchQuery
                  ? 'No tracks match your search. Try a different query.'
                  : 'No tracks available.'}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
