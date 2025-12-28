'use client';

import { useState } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { TrackCard } from '@/components/track-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extractTrackIdFromUrl, fetchTrackById } from '@/lib/spotify';

interface CustomTrackInputProps {
  onTrackFound: (track: SpotifyTrack) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
  accessToken: string;
}

export function CustomTrackInput({
  onTrackFound,
  onCancel,
  isLoading: externalLoading = false,
  error: externalError = null,
  accessToken,
}: CustomTrackInputProps) {
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedTrack, setFetchedTrack] = useState<SpotifyTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchTrack = async () => {
    if (!url.trim()) {
      setError('Please enter a Spotify track URL');
      return;
    }

    // Extract track ID from URL
    const trackId = extractTrackIdFromUrl(url.trim());
    if (!trackId) {
      setError('Invalid Spotify URL format. Please enter a valid track URL.');
      return;
    }

    setIsFetching(true);
    setError(null);
    setFetchedTrack(null);

    try {
      const track = await fetchTrackById(accessToken, trackId);
      setFetchedTrack(track);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch track';
      setError(errorMessage);
    } finally {
      setIsFetching(false);
    }
  };

  const handleConfirm = () => {
    if (fetchedTrack) {
      onTrackFound(fetchedTrack);
      // Reset state
      setUrl('');
      setFetchedTrack(null);
      setError(null);
    }
  };

  const handleCancel = () => {
    setUrl('');
    setFetchedTrack(null);
    setError(null);
    onCancel();
  };

  const isLoading = externalLoading || isFetching;
  const displayError = externalError || error;

  return (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Paste Spotify track URL..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading && !fetchedTrack) {
              handleFetchTrack();
            }
          }}
        />
      </div>

        {displayError && (
          <Alert variant="destructive">
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        {isFetching && (
          <div className="text-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Fetching track...</p>
          </div>
        )}

        {fetchedTrack && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Track Preview:</p>
              <TrackCard
                track={fetchedTrack}
                onSelect={handleConfirm}
                isSelected={false}
                isLoading={isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={isLoading}>
                Add Track
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

      {!fetchedTrack && !isFetching && (
        <div className="flex gap-2">
          <Button onClick={handleFetchTrack} disabled={isLoading || !url.trim()}>
            Add track
          </Button>
          <Button onClick={handleCancel} variant="outline" disabled={isLoading}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
