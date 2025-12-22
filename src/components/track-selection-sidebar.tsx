'use client';

import { useEffect, useState } from 'react';
import { SpotifyTrack } from '@/lib/spotify-search';
import { TrackList } from '@/components/track-list';
import { CustomTrackInput } from '@/components/custom-track-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTrackSelect = (track: SpotifyTrack) => {
    onSelectTrack(track);
    onClose();
  };

  const handleCustomTrack = (track: SpotifyTrack) => {
    onCustomTrackAdd(track);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop - mobile only */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:inset-auto md:right-0 md:top-0 md:h-full md:w-[400px]',
          'bg-background border-l shadow-lg transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 border-b shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Select Track</h2>
            {questionText && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {questionText}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full"
                >
                  Can't find your track? Add custom track
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
