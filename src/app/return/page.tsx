'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ReturnPage() {
  useEffect(() => {
    // Try to open the app via custom URL scheme as fallback
    // The universal link should handle this automatically, but this provides a backup
    window.location.href = 'tracks://return';
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-3xl font-bold mb-4">Returning to Tracks...</h1>
      <p className="text-muted-foreground mb-6">If you're not redirected automatically,</p>
      <Button asChild className="rounded-full">
        <a href="tracks://return">Tap here to return</a>
      </Button>
    </div>
  );
}

