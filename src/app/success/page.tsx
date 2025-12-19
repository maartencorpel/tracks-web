'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trackPageView } from '@/lib/analytics';
import { browserStorage, PENDING_GAME_ID_KEY } from '@/lib/browser-storage';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const [gameId, setGameId] = useState<string>('');

  useEffect(() => {
    // Get game ID from URL or localStorage
    const urlGameId = searchParams.get('game');
    const storedGameId = browserStorage.get(PENDING_GAME_ID_KEY);
    const finalGameId = urlGameId || storedGameId;
    
    if (finalGameId) {
      setGameId(finalGameId);
    }

    // Track page view
    trackPageView('success', finalGameId || undefined);

    // Auto-close after 10 seconds
    const timer = setTimeout(() => {
      closeWindow();
    }, 10000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const closeWindow = () => {
    // Try to close the window
    window.close();
    
    // If that doesn't work, show a message
    setTimeout(() => {
      alert('You can now close this tab and return to the Tracks app.');
    }, 100);
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl">Successfully Joined!</CardTitle>
          <CardDescription className="text-lg">You've joined the game!</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Success Message */}
          <Alert variant="success">
            <AlertDescription>
              {gameId 
                ? `Welcome to game ${gameId}! Return to the host's device to start playing.`
                : 'Welcome to the game! Return to the host\'s device to start playing.'
              }
            </AlertDescription>
          </Alert>
          
          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Return to the host's device</li>
                <li>• Wait for the host to start the game</li>
                <li>• Get ready to discover amazing music together!</li>
              </ul>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={closeWindow}
              className="w-full"
              size="lg"
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
