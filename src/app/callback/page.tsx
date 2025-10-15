'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProgressSteps } from '@/components/progress-steps';
import { SupabaseService } from '@/lib/supabase';
import { exchangeCodeForToken, fetchSpotifyUser, SPOTIFY_REDIRECT_URI } from '@/lib/spotify';
import { trackPageView, trackOAuthEvent, trackGameEvent, trackError } from '@/lib/analytics';
import { SpotifyUser } from '@/types';

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

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLog(prev => [...prev, logMessage]);
  };

  const updateProgress = (step: number, statusMessage: string) => {
    setCurrentStep(step);
    setStatus(statusMessage);
  };

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

  const handleCallback = async () => {
    try {
      updateProgress(1, 'Processing authentication...');
      log('Callback page loaded');
      log('URL: ' + window.location.href);
      
      // Parse authorization code from URL parameters
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');
      const gameId = localStorage.getItem('pendingGameId') || state;

      log('Authorization Code: ' + (code ? 'Present' : 'Missing'));
      log('Game ID: ' + (gameId || 'Missing'));
      log('State: ' + (state || 'Missing'));

      if (error) {
        throw new Error('Spotify authentication failed: ' + error);
      }
      
      if (!code) {
        throw new Error('No authorization code received from Spotify');
      }
      
      if (!gameId) {
        throw new Error('No game ID found. Please try joining again.');
      }

      updateProgress(2, 'Exchanging code for access token...');
      log('Exchanging authorization code for access token...');

      // Exchange authorization code for access token
      const tokenData = await exchangeCodeForToken(code, SPOTIFY_REDIRECT_URI);
      
      if (!tokenData || !tokenData.access_token) {
        throw new Error('Failed to exchange authorization code for access token');
      }

      updateProgress(3, 'Fetching your Spotify profile...');
      log('Fetching user profile from Spotify...');

      // Fetch user profile from Spotify
      const userData: SpotifyUser = await fetchSpotifyUser(tokenData.access_token);
      log('User: ' + userData.display_name);

      updateProgress(4, 'Joining game...');
      log('Joining game ' + gameId + '...');

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

      log('Successfully joined game!');
      
      // Track successful join
      trackGameEvent('game_join_success', gameId, {
        user_id: userData.id,
        user_name: userData.display_name
      });
      
      showSuccess(`Welcome to the game, ${userData.display_name}! You can close this window and return to the Spot app.`);

      // Clear stored game ID
      localStorage.removeItem('pendingGameId');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('ERROR: ' + errorMessage);
      trackError(errorMessage, 'oauth_callback');
      showError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen gradient-background flex items-center justify-center p-4">
      <Card className="spot-container animate-slide-up w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="text-7xl mb-4 animate-float">🎵</div>
          <CardTitle className="text-2xl text-white">
            {error ? '❌ Error' : success ? '✅ Success!' : 'Joining game...'}
          </CardTitle>
          <CardDescription className="text-white/80 text-lg">{status}</CardDescription>
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
