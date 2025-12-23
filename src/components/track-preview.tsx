'use client';

import { SpotifyTrack } from '@/lib/spotify-search';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExternalLink, ChevronRight } from 'lucide-react';

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
  const releaseYear = track.album.release_date
    ? track.album.release_date.substring(0, 4)
    : 'Unknown';

  return (
    <div className="flex items-center gap-3 justify-start h-auto py-1 px-3">
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
      <div className="flex-1 min-w-0 space-y-1">
        <div>
          <h4 className="font-medium text-sm truncate" title={track.name}>
            {track.name}
          </h4>
          <p className="text-xs text-muted-foreground truncate" title={artistNames}>
            {artistNames}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{releaseYear}</span>
          {track.album.name && (
            <>
              <span>•</span>
              <span className="truncate" title={track.album.name}>
                {track.album.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {track.external_urls.spotify && (
          <Button
            variant="ghost"
            size="icon"
            asChild
          >
            <a
              href={track.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${track.name} on Spotify`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button
          onClick={onChange}
          disabled={isLoading}
          size="icon"
          variant="outline"
          className="rounded-full"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
