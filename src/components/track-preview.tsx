'use client';

import { SpotifyTrack } from '@/lib/spotify-search';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface TrackPreviewProps {
  track: SpotifyTrack;
  onChange: () => void;
  isLoading?: boolean;
}

export function TrackPreview({
  track,
  onChange,
  isLoading = false,
}: TrackPreviewProps) {
  const albumImage = track.album.images?.[0]?.url || null;
  const artistNames = track.artists.map((a) => a.name).join(', ');

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      {/* Album Art */}
      <div className="shrink-0">
        {albumImage ? (
          <img
            src={albumImage}
            alt={`${track.name} album cover`}
            className="w-12 h-12 rounded object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
            <span className="text-xl">🎵</span>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate" title={track.name}>
          {track.name}
        </h4>
        <p className="text-xs text-muted-foreground truncate" title={artistNames}>
          {artistNames}
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {track.external_urls.spotify && (
          <a
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Open ${track.name} on Spotify`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <Button
          onClick={onChange}
          disabled={isLoading}
          size="sm"
          variant="outline"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            'Change'
          )}
        </Button>
      </div>
    </div>
  );
}
