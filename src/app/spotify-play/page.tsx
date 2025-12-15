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
        window.location.href = `https://spot-join-web.vercel.app/return?trackId=${trackId || ''}`;
      }, 3000);
    }
  }, [trackUrl, trackId]);

  if (!trackUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1DB954] to-[#191414]">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Error: No track URL provided</h1>
          <p className="opacity-80">Please use a valid Spotify track link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1DB954] to-[#191414] text-white">
      <div className="spinner mb-6"></div>
      <h1 className="text-3xl font-bold mb-2">Opening Spotify...</h1>
      <p className="opacity-80">You'll be redirected back automatically</p>
      
      <style jsx>{`
        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #1DB954;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SpotifyPlayPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1DB954] to-[#191414] text-white">
        <div className="spinner mb-6"></div>
        <h1 className="text-3xl font-bold mb-2">Loading...</h1>
        
        <style jsx>{`
          .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #1DB954;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <SpotifyPlayContent />
    </Suspense>
  );
}
