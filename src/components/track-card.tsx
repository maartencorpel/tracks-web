'use client';

import { memo } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface TrackCardProps {
  track: SpotifyTrack;
  onSelect: (track: SpotifyTrack) => void;
  isSelected?: boolean;
  isLoading?: boolean;
  hideSelectButton?: boolean; // Kept for backward compatibility but no longer used
}

function TrackCardComponent({
  track,
  onSelect,
  isSelected = false,
  isLoading = false,
  hideSelectButton = false, // Kept for backward compatibility but no longer used
}: TrackCardProps) {
  const albumImage = track.album.images?.[0]?.url || null;
  const artistNames = track.artists.map((a) => a.name).join(', ');
  const releaseYear = track.album.release_date
    ? track.album.release_date.substring(0, 4)
    : 'Unknown';

  const handleSelect = () => {
    if (!isLoading && !isSelected) {
      onSelect(track);
    }
  };

  return (
    <Card
      onClick={handleSelect}
      className={cn(
        'transition-all hover:border-primary/50',
        isSelected && 'border-primary bg-accent/50',
        !isLoading && !isSelected && 'cursor-pointer',
        (isLoading || isSelected) && 'cursor-default'
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Album Art */}
          <div className="shrink-0">
            {albumImage ? (
              <img
                src={albumImage}
                alt={`${track.name} album cover`}
                className="w-16 h-16 rounded object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                <span className="text-2xl">🎵</span>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div>
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    'font-medium text-sm truncate',
                    isSelected && 'text-primary'
                  )}
                  title={track.name}
                >
                  {track.name}
                </h4>
                {isSelected && (
                  <Badge variant="secondary" className="text-xs">
                    Selected
                  </Badge>
                )}
              </div>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const TrackCard = memo(TrackCardComponent);
