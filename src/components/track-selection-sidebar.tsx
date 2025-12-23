'use client';

import { useEffect, useState } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { TrackList } from '@/components/track-list';
import { CustomTrackInput } from '@/components/custom-track-input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface TrackSelectionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  questionText: string | null;
  tracks: SpotifyTrack[];
  selectedTrackId: string | null;
  onSelectTrack: (track: SpotifyTrack) => void;
  onCustomTrackAdd: (track: SpotifyTrack) => void;
  accessToken: string | null;
  isLoading?: boolean;
  error?: string | null;
}

export function TrackSelectionSidebar({
  isOpen,
  onClose,
  questionText,
  tracks,
  selectedTrackId,
  onSelectTrack,
  onCustomTrackAdd,
  accessToken,
  isLoading = false,
  error = null,
}: TrackSelectionSidebarProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Reset custom input when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setShowCustomInput(false);
    }
  }, [isOpen]);

  const handleTrackSelect = (track: SpotifyTrack) => {
    onSelectTrack(track);
    onClose();
  };

  const handleCustomTrack = (track: SpotifyTrack) => {
    onCustomTrackAdd(track);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full md:w-[400px] flex flex-col p-0 h-full overflow-hidden"
      >
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle>Select Track</SheetTitle>
          {questionText && (
            <SheetDescription className="line-clamp-2">
              {questionText}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {showCustomInput ? (
            accessToken ? (
              <CustomTrackInput
                onTrackFound={handleCustomTrack}
                onCancel={() => setShowCustomInput(false)}
                accessToken={accessToken}
                error={error}
              />
            ) : null
          ) : (
            <div className="space-y-4">
              <TrackList
                tracks={tracks}
                selectedTrackId={selectedTrackId}
                onSelectTrack={handleTrackSelect}
                isLoading={isLoading}
                error={error}
              />
              {accessToken && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full"
                  >
                    Can't find your track? Add custom track
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
