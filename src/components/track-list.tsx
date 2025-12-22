'use client';

import { useState, useMemo, useEffect } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { TrackCard } from '@/components/track-card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
          <Select
            value={sortBy}
            onValueChange={(value) =>
              setSortBy(value as 'title' | 'artist' | 'year')
            }
            disabled={isLoading}
          >
            <SelectTrigger aria-label="Sort tracks">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Sort by Title</SelectItem>
              <SelectItem value="artist">Sort by Artist</SelectItem>
              <SelectItem value="year">Sort by Year</SelectItem>
            </SelectContent>
          </Select>
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
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
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
