'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgressSteps } from '@/components/progress-steps';
import { SupabaseService } from '@/lib/supabase';
import { exchangeCodeForToken, fetchSpotifyUser, SPOTIFY_REDIRECT_URI } from '@/lib/spotify';
import { browserStorage, PENDING_GAME_ID_KEY } from '@/lib/browser-storage';
import { validateGameCode, validateSpotifyCode } from '@/lib/validation';
import { trackPageView, trackOAuthEvent, trackGameEvent, trackError } from '@/lib/analytics';
import { SpotifyUser } from '@/types';

/**
 * Spotify OAuth Callback Page Component
 * 
 * This page handles the OAuth callback from Spotify after user authorization.
 * It processes the authorization code, exchanges it for tokens, fetches user data,
 * and adds the player to the game in Supabase.
 * 
 * OAuth Flow:
 * 1. User clicks "Join with Spotify" on main page
 * 2. Redirected to Spotify for authorization
 * 3. Spotify redirects back to this page with authorization code
 * 4. This page exchanges code for access/refresh tokens
 * 5. Fetches Spotify user profile
 * 6. Adds player to game in Supabase
 * 7. Redirects to success page
 */
function CallbackPageContent() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState('Processing authentication...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  useEffect(() => {
    trackPageView('oauth_callback');
    handleCallback();
  }, []);

  /**
   * Logging utility for debugging OAuth flow
   * 
   * @param message - Log message to display
   * @param isError - Whether this is an error message
   */
  const log = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Always log to console for debugging
    console.log(logMessage);
    
    // Only show in UI if in development mode or if it's an error
    if (process.env.NODE_ENV === 'development' || isError) {
      setDebugLog(prev => [...prev, logMessage]);
    }
  };

  /**
   * Updates the progress indicator and status message
   * 
   * @param step - Current step number (1-4)
   * @param statusMessage - Status message to display
   */
  const updateProgress = (step: number, statusMessage: string) => {
    setCurrentStep(step);
    setStatus(statusMessage);
  };

  /**
   * Shows an error message and stops the loading state
   * 
   * @param message - Error message to display
   */
  const showError = (message: string) => {
    setIsLoading(false);
    setError(message);
    setCurrentStep(0);
  };

  const showSuccess = (message: string) => {
    setIsLoading(false);
    setSuccess(message);
    setCurrentStep(4);
  };

  /**
   * Main OAuth callback handler
   * 
   * Processes the Spotify OAuth callback by:
   * 1. Validating URL parameters and game ID
   * 2. Exchanging authorization code for access/refresh tokens
   * 3. Fetching Spotify user profile
   * 4. Adding player to game in Supabase
   * 5. Redirecting to success page
   */
  const handleCallback = async () => {
    try {
      updateProgress(1, 'Processing authentication...');
      log('Processing OAuth callback');
      
      // Parse authorization code and error from URL parameters
      const codeParam = searchParams.get('code');
      const oauthError = searchParams.get('error');
      const stateParam = searchParams.get('state');

      // Prefer stored game ID, otherwise fallback to state parameter
      const storedGameId = browserStorage.get(PENDING_GAME_ID_KEY);
      const gameIdResult = validateGameCode(storedGameId || stateParam);
      const codeResult = validateSpotifyCode(codeParam);

      if (oauthError) {
        throw new Error('Spotify authentication failed: ' + oauthError);
      }

      if (!codeResult.valid || !codeResult.value) {
        throw new Error(codeResult.error || 'No authorization code received from Spotify');
      }

      if (!gameIdResult.valid || !gameIdResult.value) {
        throw new Error(gameIdResult.error || 'No game ID found. Please try joining again.');
      }

      const gameId = gameIdResult.value;
      const code = codeResult.value;

      log(`Game ID: ${gameId}`);

      updateProgress(2, 'Exchanging code for access token...');
      log('Exchanging code for token');

      // Exchange authorization code for access and refresh tokens
      // This calls our secure server-side API route
      const tokenData = await exchangeCodeForToken(code, SPOTIFY_REDIRECT_URI);
      
      if (!tokenData || !tokenData.access_token) {
        throw new Error('Failed to exchange authorization code for access token');
      }

      updateProgress(3, 'Fetching your Spotify profile...');
      log('Fetching user profile');

      // Fetch user profile from Spotify using the access token
      const userData: SpotifyUser = await fetchSpotifyUser(tokenData.access_token);
      log(`User: ${userData.display_name}`);

      updateProgress(4, 'Joining game...');
      log(`Joining game ${gameId}`);

      // Join the game
      const result = await SupabaseService.joinGame(
        gameId,
        userData,
        tokenData.access_token,
        tokenData.refresh_token
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to join game');
      }

      log('Successfully joined game');
      
      // Track successful join
      trackGameEvent('game_join_success', gameId, {
        user_id: userData.id,
        user_name: userData.display_name
      });
      
      showSuccess(`Welcome to the game, ${userData.display_name}! You can close this window and return to the Tracks app.`);

      // Clear stored game ID
      browserStorage.remove(PENDING_GAME_ID_KEY);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('ERROR: ' + errorMessage, true); // Mark as error so it shows in production
      trackError(errorMessage, 'oauth_callback');
      showError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl">
            {error ? 'Error' : success ? 'Success!' : 'Joining game...'}
          </CardTitle>
          <CardDescription className="text-lg">{status}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <ProgressSteps 
            currentStep={currentStep} 
            totalSteps={4}
            stepLabels={[
              'Verifying game...',
              'Exchanging code for token...',
              'Fetching your Spotify profile...',
              'Joining game...'
            ]}
          />
          
          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Success Display */}
          {success && (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          {/* Debug Log */}
          {debugLog.length > 0 && (
            <div className="bg-muted p-4 rounded-md max-h-48 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {debugLog.join('\n')}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <CallbackPageContent />
    </Suspense>
  );
}
