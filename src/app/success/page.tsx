'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateDeepLink } from '@/lib/spotify';
import { trackPageView } from '@/lib/analytics';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const [gameId, setGameId] = useState<string>('');

  useEffect(() => {
    // Get game ID from URL or localStorage
    const urlGameId = searchParams.get('game');
    const storedGameId = localStorage.getItem('pendingGameId');
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
      alert('You can now close this tab and return to the Spot app.');
    }, 100);
  };

  const openApp = () => {
    if (gameId) {
      window.location.href = generateDeepLink(gameId);
    } else {
      window.location.href = 'spot://';
    }
    
    // Fallback message
    setTimeout(() => {
      alert('If the app didn\'t open, make sure you have Spot installed.');
    }, 1500);
  };

  return (
    <div className="min-h-screen gradient-background flex items-center justify-center p-5">
      <Card className="spot-container animate-slide-up w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <CardTitle className="text-3xl">Successfully Joined!</CardTitle>
          <CardDescription className="text-lg">You're now part of the game</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Success Message */}
          <Alert variant="success">
            <AlertDescription>
              {gameId 
                ? `Welcome to game ${gameId}! You can now close this window and return to the Spot app.`
                : 'Welcome to the game! You can now close this window and return to the Spot app.'
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
                <li>• Close this window and return to the Spot app</li>
                <li>• Wait for the host to start the game</li>
                <li>• Get ready to discover amazing music together!</li>
              </ul>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={closeWindow}
              className="w-full spot-button"
              size="lg"
            >
              ✅ Close Window
            </Button>
            <Button 
              onClick={openApp}
              variant="secondary"
              className="w-full spot-button"
              size="lg"
            >
              📱 Open Spot App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
