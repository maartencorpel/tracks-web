'use client';

import { useState, useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { TrackCard } from '@/components/track-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'year'>('title');

  // Sort tracks
  const sortedTracks = useMemo(() => {
    const sorted = [...tracks];
    
    sorted.sort((a, b) => {
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

    return sorted;
  }, [tracks, sortBy]);

  return (
    <div className="space-y-4 my-4">
      {/* Sort Controls */}
      <div className="flex justify-end">
        <Select
          value={sortBy}
          onValueChange={(value) =>
            setSortBy(value as 'title' | 'artist' | 'year')
          }
          disabled={isLoading}
        >
          <SelectTrigger aria-label="Sort tracks" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Sort by Title</SelectItem>
            <SelectItem value="artist">Sort by Artist</SelectItem>
            <SelectItem value="year">Sort by Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex gap-4">
                <Skeleton className="h-14 w-14 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Track List */}
      {!isLoading && (
        <>
          {sortedTracks.length > 0 ? (
            <div className="space-y-2">
              {sortedTracks.map((track) => (
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
              <AlertDescription>No tracks available.</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
