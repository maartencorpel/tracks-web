'use client';

import { SpotifyTrack } from '@/lib/spotify-search';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExternalLink, ChevronRight } from 'lucide-react';

interface TrackAnswerProps {
  track: SpotifyTrack;
  onChange: () => void;
  isLoading?: boolean;
}

export function TrackAnswer({
  track,
  onChange,
  isLoading = false,
}: TrackAnswerProps) {
  const albumImage = track.album.images?.[0]?.url || null;
  const artistNames = track.artists.map((a) => a.name).join(', ');
  const releaseYear = track.album.release_date
    ? track.album.release_date.substring(0, 4)
    : 'Unknown';

  return (
    <div className="group flex items-center gap-3 justify-start h-auto py-1 px-0">
      {/* Album Art */}
      <div className="shrink-0 relative">
        {albumImage ? (
          <>
            {track.external_urls.spotify && (
              <a
                href={track.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${track.name} on Spotify`}
                onClick={(e) => e.stopPropagation()}
                className="absolute inline-flex whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 bg-black/40 opacity-0 group-hover:opacity-100"
                style={{ margin: '0px', left: '12px', top: '12px', justifyContent: 'center', alignItems: 'center' }}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <img
              src={albumImage}
              alt={`${track.name} album cover`}
              className="w-16 h-16 rounded-xl object-cover"
            />
          </>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
            <span className="text-xl">🎵</span>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 space-y-1 flex flex-col">
        <div className="flex flex-col gap-1.5">
          <h4 className="font-medium text-sm truncate leading-4" title={track.name}>
            {track.name}
          </h4>
          <p className="text-sm text-muted-foreground truncate" title={artistNames}>
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

