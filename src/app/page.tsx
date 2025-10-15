'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GameCodeInput } from '@/components/game-code-input';
import { ErrorDisplay } from '@/components/error-display';
import { SupabaseService } from '@/lib/supabase';
import { generateSpotifyAuthUrl, openApp } from '@/lib/spotify';
import { trackPageView, trackGameEvent, trackOAuthEvent, trackError } from '@/lib/analytics';
import { JoinState } from '@/types';

export default function HomePage() {
  const searchParams = useSearchParams();
  const [gameId, setGameId] = useState<string>('');
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showGameInput, setShowGameInput] = useState(false);
  const [showDownloadLink, setShowDownloadLink] = useState(false);

  // Get game ID from URL parameters
  useEffect(() => {
    const urlGameId = searchParams.get('game')?.toUpperCase();
    if (urlGameId) {
      setGameId(urlGameId);
      setJoinState('verifying');
      checkGame(urlGameId);
    } else {
      setShowGameInput(true);
      setJoinState('idle');
    }

    // Track page view
    trackPageView('join_game', urlGameId || undefined);
  }, [searchParams]);

  const checkGame = async (gameIdToCheck: string) => {
    try {
      setJoinState('verifying');
      setErrorMessage('');
      
      const exists = await SupabaseService.checkGameExists(gameIdToCheck);
      
      if (exists) {
        setJoinState('idle');
        trackGameEvent('game_verified', gameIdToCheck);
        
        // Try to open app automatically
        attemptAppOpen(gameIdToCheck);
      } else {
        setJoinState('error');
        setErrorMessage('This game code doesn\'t exist. Please check the code and try again.');
        trackGameEvent('game_not_found', gameIdToCheck);
      }
    } catch (error) {
      console.error('Error checking game:', error);
      setJoinState('error');
      setErrorMessage('Unable to verify the game. Please check your internet connection and try again.');
      trackError('game_verification_failed', 'checkGame', gameIdToCheck);
    }
  };

  const attemptAppOpen = (gameIdToOpen: string) => {
    openApp(gameIdToOpen);
    
    // If app doesn't open in 2 seconds, show download link
    setTimeout(() => {
      setShowDownloadLink(true);
    }, 2000);
  };

  const handleJoinWithGameId = async (inputGameId: string) => {
    setGameId(inputGameId);
    setShowGameInput(false);
    await checkGame(inputGameId);
  };

  const handleOpenApp = () => {
    if (gameId) {
      trackGameEvent('app_open_attempted', gameId);
      openApp(gameId);
    }
  };

  const handleAuthenticateSpotify = () => {
    if (gameId) {
      trackOAuthEvent('spotify_auth_attempted', gameId);
      
      // Store game ID for after redirect
      localStorage.setItem('pendingGameId', gameId);
      
      // Redirect to Spotify
      window.location.href = generateSpotifyAuthUrl(gameId);
    }
  };

  const getStatusMessage = () => {
    switch (joinState) {
      case 'verifying':
        return 'Verifying game...';
      case 'idle':
        return gameId ? 'Game found! Ready to join' : 'Enter the game code below to join';
      case 'error':
        return 'Something went wrong';
      default:
        return 'Ready to join!';
    }
  };

  const getStatusVariant = () => {
    switch (joinState) {
      case 'verifying':
        return 'default';
      case 'idle':
        return gameId ? 'success' : 'default';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen gradient-background flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="text-7xl mb-6 animate-float">🎵</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Join Spot Game</h1>
          <p className="text-muted-foreground">Connect with friends and discover music together</p>
        </div>

        {/* Game ID Display */}
        {gameId && (
          <Card className="spot-container animate-slide-up">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-secondary mb-4 font-mono tracking-wider">
                  {gameId}
                </div>
                <Alert variant={getStatusVariant()}>
                  <AlertDescription>{getStatusMessage()}</AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Code Input */}
        {showGameInput && (
          <div className="animate-slide-up">
            <GameCodeInput 
              onJoin={handleJoinWithGameId}
              isLoading={joinState === 'verifying'}
            />
          </div>
        )}

        {/* Error Display */}
        {joinState === 'error' && errorMessage && (
          <div className="animate-slide-up">
            <ErrorDisplay 
              message={errorMessage}
              onRetry={showGameInput ? () => setShowGameInput(true) : undefined}
            />
          </div>
        )}

        {/* Action Buttons */}
        {gameId && joinState === 'idle' && !showGameInput && (
          <div className="space-y-3 animate-slide-up">
            <Button 
              onClick={handleOpenApp}
              className="w-full spot-button"
              size="lg"
            >
              📱 Open in Spot App
            </Button>
            <Button 
              onClick={handleAuthenticateSpotify}
              variant="secondary"
              className="w-full spot-button"
              size="lg"
            >
              🌐 Join via Browser
            </Button>
          </div>
        )}

        {/* Download Link */}
        {showDownloadLink && (
          <div className="text-center animate-slide-up">
            <a
              href="https://apps.apple.com/app/spot"
              className="inline-flex items-center text-secondary hover:text-secondary/80 transition-colors"
            >
              ⬇️ Don't have the app? Download Spot
            </a>
          </div>
        )}

        {/* Info Section */}
        {showGameInput && (
          <Card className="animate-slide-up">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                <strong>How it works:</strong> Join a game by entering the code shared by the host, or scan the QR code. You can join using the Spot app or directly in your browser.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
