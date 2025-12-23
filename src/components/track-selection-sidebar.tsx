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
        className="w-full md:w-[400px] flex flex-col p-0 h-full overflow-hidden gap-0"
      >
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex flex-col items-start justify-between gap-2">
            <div className="flex-1">
              <SheetTitle>{questionText || 'Select Track'}</SheetTitle>
              <SheetDescription>
                Select a track from the list or add a custom track.
              </SheetDescription>
            </div>
            {accessToken && !showCustomInput && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomInput(true)}
                className="shrink-0"
              >
                Add Custom Track
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 pb-5 min-h-0 track-list-scroll">
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
            <TrackList
              tracks={tracks}
              selectedTrackId={selectedTrackId}
              onSelectTrack={handleTrackSelect}
              isLoading={isLoading}
              error={error}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
