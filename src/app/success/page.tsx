'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnswerSummary } from '@/components/answer-summary';
import { ErrorDisplay } from '@/components/error-display';
import { SupabaseService } from '@/lib/supabase';
import { fetchSpotifyUser } from '@/lib/spotify';
import { sessionStorage, SPOTIFY_ACCESS_TOKEN_KEY, browserStorage, PENDING_GAME_ID_KEY, getSelectedQuestionsKey } from '@/lib/browser-storage';
import { validateGameCode } from '@/lib/validation';
import { trackPageView, trackError } from '@/lib/analytics';
import { PlayerAnswerWithQuestion } from '@/types';
import { AUTO_CLOSE_DELAY_MS } from '@/lib/constants';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [gameId, setGameId] = useState<string | null>(null);
  const [gamePlayerId, setGamePlayerId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<PlayerAnswerWithQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeData();
  }, [searchParams]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get gameId from query params (support both 'gameId' and 'game' for compatibility)
      const gameIdParam = searchParams.get('gameId') || searchParams.get('game');
      const storedGameId = browserStorage.get(PENDING_GAME_ID_KEY);
      const finalGameId = gameIdParam || storedGameId;

      if (!finalGameId) {
        throw new Error('No game code provided');
      }

      const gameIdValidation = validateGameCode(finalGameId);
      if (!gameIdValidation.valid || !gameIdValidation.value) {
        throw new Error(gameIdValidation.error || 'Invalid game code');
      }

      const validGameId = gameIdValidation.value;
      setGameId(validGameId);

      // Get access token from sessionStorage
      const token = sessionStorage.get(SPOTIFY_ACCESS_TOKEN_KEY);
      if (!token) {
        // If no token, still show success but without answer details
        setIsLoading(false);
        trackPageView('success', validGameId);
        return;
      }

      setAccessToken(token);

      // Fetch Spotify user profile to get spotifyUserId
      const userData = await fetchSpotifyUser(token);
      const spotifyUserId = userData.id;

      // Get gamePlayerId
      const playerId = await SupabaseService.getGamePlayerId(validGameId, spotifyUserId);
      if (!playerId) {
        // If no player ID, still show success but without answer details
        setIsLoading(false);
        trackPageView('success', validGameId);
        return;
      }

      setGamePlayerId(playerId);

      // Fetch existing answers
      const playerAnswers = await SupabaseService.getPlayerAnswers(playerId);
      setAnswers(playerAnswers);

      trackPageView('success', validGameId);

      // Clear selected questions from localStorage after successful load
      const storageKey = getSelectedQuestionsKey(validGameId);
      browserStorage.remove(storageKey);

      // Auto-close after delay
      const timer = setTimeout(() => {
        closeWindow();
      }, AUTO_CLOSE_DELAY_MS);

      return () => clearTimeout(timer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load answers';
      setError(errorMessage);
      trackError(errorMessage, 'success_page_init');
    } finally {
      setIsLoading(false);
    }
  };

  const closeWindow = () => {
    // Try to close the window
    window.close();
    
    // If that doesn't work, show a message
    setTimeout(() => {
      alert('You can now close this tab and return to the Tracks app.');
    }, 100);
  };

  const handleUpdateAnswers = () => {
    if (gameId) {
      router.push(`/update-answers?gameId=${gameId}`);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your answers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorDisplay message={error} onRetry={initializeData} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl">You're All Set!</CardTitle>
          <CardDescription className="text-lg">
            You're ready to play! Return to the host's device to start the game.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Answer Summary */}
          {answers.length > 0 && (
            <AnswerSummary
              answers={answers}
              totalQuestions={answers.length}
            />
          )}

          {/* Success Message */}
          <Alert variant="success">
            <AlertDescription>
              {gameId 
                ? `Welcome to game ${gameId}!`
                : 'Welcome to the game!'
              }
              <span className="block mt-2">
                Return to the host's device to start playing.
              </span>
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
            {gameId && (
              <Button 
                onClick={handleUpdateAnswers}
                className="w-full"
                size="lg"
              >
                Update Answers
              </Button>
            )}
            <Button 
              onClick={closeWindow}
              className="w-full"
              size="lg"
              variant="outline"
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
