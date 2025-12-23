'use client';

import { memo } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const handleSelect = () => {
    if (!isLoading && !isSelected) {
      onSelect(track);
    }
  };

  return (
    <Card
      onClick={handleSelect}
      className={cn(
        'group transition-all hover:border-primary/50 rounded-none border-0 bg-transparent shadow-none',
        'hover:bg-accent/50 hover:border-accent',
        isSelected && 'border-primary bg-accent/50',
        !isLoading && !isSelected && 'cursor-pointer',
        (isLoading || isSelected) && 'cursor-default',
        'p-2'
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-3 justify-start h-fit">
          {/* Album Art */}
          <div className="shrink-0 relative">
            {/* Actions */}
            <div className="shrink-0 flex items-center gap-2 absolute m-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </div>
            {albumImage ? (
              <img
                src={albumImage}
                alt={`${track.name} album cover`}
                className="w-14 h-14 rounded object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                <span className="text-2xl">🎵</span>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
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
        </div>
      </CardContent>
    </Card>
  );
}

export const TrackCard = memo(TrackCardComponent);
