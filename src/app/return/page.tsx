'use client';

import { useEffect } from 'react';

export default function ReturnPage() {
  useEffect(() => {
    // Try to open the app via custom URL scheme as fallback
    // The universal link should handle this automatically, but this provides a backup
    window.location.href = 'spot://return';
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#191414] text-white">
      <h1 className="text-3xl font-bold mb-4">Returning to Spot...</h1>
      <p className="opacity-80 mb-6">If you're not redirected automatically,</p>
      <a 
        href="spot://return" 
        className="px-6 py-3 bg-[#1DB954] text-white rounded-full font-semibold hover:bg-[#1ed760] transition-colors"
      >
        Tap here to return
      </a>
    </div>
  );
}
