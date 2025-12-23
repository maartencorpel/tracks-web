'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GameCodeInput } from '@/components/game-code-input';
import { ErrorDisplay } from '@/components/error-display';
import ErrorBoundary from '@/components/error-boundary';
import { SupabaseService } from '@/lib/supabase';
import { generateSpotifyAuthUrl } from '@/lib/spotify';
import { browserStorage, PENDING_GAME_ID_KEY } from '@/lib/browser-storage';
import { validateGameCode } from '@/lib/validation';
import { trackPageView, trackGameEvent, trackOAuthEvent, trackError } from '@/lib/analytics';
import { JoinState } from '@/types';

function HomePageContent() {
  const searchParams = useSearchParams();
  const [gameId, setGameId] = useState<string>('');
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showGameInput, setShowGameInput] = useState(false);

  // Get game ID from URL parameters
  useEffect(() => {
    const rawGameId = searchParams.get('game');
    if (rawGameId) {
      const validation = validateGameCode(rawGameId);
      if (validation.valid && validation.value) {
        const normalizedGameId = validation.value;
        setGameId(normalizedGameId);
        setJoinState('verifying');
        checkGame(normalizedGameId);
      } else {
        setShowGameInput(true);
        setJoinState('error');
        setErrorMessage(validation.error || 'Invalid game code provided.');
      }
    } else {
      setShowGameInput(true);
      setJoinState('idle');
    }

    // Track page view
    trackPageView('join_game', rawGameId || undefined);
  }, [searchParams]);

  const checkGame = async (gameIdToCheck: string) => {
    try {
      setJoinState('verifying');
      setErrorMessage('');
      
      const exists = await SupabaseService.checkGameExists(gameIdToCheck);
      
      if (exists) {
        setJoinState('idle');
        trackGameEvent('game_verified', gameIdToCheck);
        
        // Automatically redirect to Spotify authentication
        setTimeout(() => {
          handleAuthenticateSpotify(gameIdToCheck);
        }, 1000);
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


  const handleJoinWithGameId = async (inputGameId: string) => {
    const validation = validateGameCode(inputGameId);

    if (!validation.valid || !validation.value) {
      setJoinState('error');
      setShowGameInput(true);
      setErrorMessage(validation.error || 'Invalid game code.');
      trackError('invalid_game_code', 'handleJoinWithGameId');
      return;
    }

    const normalizedGameId = validation.value;
    setGameId(normalizedGameId);
    setShowGameInput(false);
    await checkGame(normalizedGameId);
  };

  const handleAuthenticateSpotify = (gameIdToAuth?: string) => {
    const targetGameId = gameIdToAuth || gameId;
    if (targetGameId) {
      trackOAuthEvent('spotify_auth_attempted', targetGameId);
      
      // Store game ID for after redirect
      browserStorage.set(PENDING_GAME_ID_KEY, targetGameId);
      
      // Redirect to Spotify
      window.location.href = generateSpotifyAuthUrl(targetGameId);
    }
  };

  const getStatusMessage = () => {
    switch (joinState) {
      case 'verifying':
        return 'Verifying game...';
      case 'idle':
        return gameId ? 'Game found! Ready to join' : 'Enter the game code below to join';
      case 'error':
        return errorMessage || 'Something went wrong';
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Game ID Display */}
        {gameId && (
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg font-medium">Game Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold mb-4 font-mono tracking-wider bg-muted rounded-lg py-4 px-6 border">
                  {gameId}
                </div>
                <Alert variant={getStatusVariant()}>
                  <AlertDescription className="text-center">{getStatusMessage()}</AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Code Input */}
        {showGameInput && (
          <GameCodeInput 
            onJoin={handleJoinWithGameId}
            isLoading={joinState === 'verifying'}
          />
        )}

        {/* Error Display */}
        {joinState === 'error' && errorMessage && (
          <ErrorDisplay 
            message={errorMessage}
            onRetry={showGameInput ? () => setShowGameInput(true) : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }>
        <HomePageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
