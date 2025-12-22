'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Separate component that uses useSearchParams
function SpotifyPlayContent() {
  const searchParams = useSearchParams();
  const trackUrl = searchParams.get('trackUrl');
  const trackId = searchParams.get('trackId');

  useEffect(() => {
    if (trackUrl) {
      // Redirect to Spotify immediately
      window.location.href = trackUrl;
      
      // After 3 seconds, redirect back to app via universal link
      setTimeout(() => {
        window.location.href = `https://tracks-match.vercel.app/return?trackId=${trackId || ''}`;
      }, 3000);
    }
  }, [trackUrl, trackId]);

  if (!trackUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary to-background">
        <div className="text-center text-foreground">
          <h1 className="text-2xl font-bold mb-4">Error: No track URL provided</h1>
          <p className="text-muted-foreground">Please use a valid Spotify track link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary to-background text-foreground">
      <div className="h-12 w-12 border-4 border-muted border-t-primary rounded-full animate-spin mb-6" />
      <h1 className="text-3xl font-bold mb-2">Opening Spotify...</h1>
      <p className="text-muted-foreground">You'll be redirected back automatically</p>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SpotifyPlayPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary to-background text-foreground">
        <div className="h-12 w-12 border-4 border-muted border-t-primary rounded-full animate-spin mb-6" />
        <h1 className="text-3xl font-bold mb-2">Loading...</h1>
      </div>
    }>
      <SpotifyPlayContent />
    </Suspense>
  );
}

