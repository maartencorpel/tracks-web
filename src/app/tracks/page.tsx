'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { TrackSearch } from '@/components/track-search';
import { TrackCard } from '@/components/track-card';
import { ErrorDisplay } from '@/components/error-display';
import ErrorBoundary from '@/components/error-boundary';
import { SupabaseService } from '@/lib/supabase';
import { fetchSpotifyUser, refreshAccessToken } from '@/lib/spotify';
import { searchTracksByYear, SpotifyTrack, convertAnswerToTrack, isTrackFromPastYear } from '@/lib/spotify-search';
import { sessionStorage, SPOTIFY_ACCESS_TOKEN_KEY, browserStorage, getSelectedQuestionsKey, getQuestionsCache, setQuestionsCache, isQuestionsCacheValid } from '@/lib/browser-storage';
import { validateGameCode } from '@/lib/validation';
import { trackPageView, trackError } from '@/lib/analytics';
import { Question } from '@/types';
import { cn } from '@/lib/utils';
import { QUESTIONS_CACHE_TTL_MS } from '@/lib/constants';

function TracksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialization state
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gamePlayerId, setGamePlayerId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Track selection state (using objects instead of Maps for React)
  const [answers, setAnswers] = useState<Record<string, SpotifyTrack>>({});
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, SpotifyTrack[]>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize data on mount
  useEffect(() => {
    initializeData();
  }, [searchParams]);

  const initializeData = async () => {
    try {
      setIsInitializing(true);
      setInitError(null);

      // Get gameId from query params
      const gameIdParam = searchParams.get('gameId');
      if (!gameIdParam) {
        throw new Error('No game code provided');
      }

      const gameIdValidation = validateGameCode(gameIdParam);
      if (!gameIdValidation.valid || !gameIdValidation.value) {
        throw new Error(gameIdValidation.error || 'Invalid game code');
      }

      const validGameId = gameIdValidation.value;
      setGameId(validGameId);

      // Get questionIds from query params
      const questionsParam = searchParams.get('questions');
      if (!questionsParam) {
        throw new Error('No questions provided');
      }

      const questionIdsArray = questionsParam.split(',').filter(Boolean);
      if (questionIdsArray.length === 0) {
        throw new Error('No valid questions provided');
      }

      setQuestionIds(questionIdsArray);

      // Get access token from sessionStorage
      const token = sessionStorage.get(SPOTIFY_ACCESS_TOKEN_KEY);
      if (!token) {
        throw new Error('Access token not found. Please re-authenticate.');
      }

      setAccessToken(token);

      // Fetch Spotify user profile to get spotifyUserId
      const userData = await fetchSpotifyUser(token);
      const spotifyUserId = userData.id;

      // Get gamePlayerId
      const playerId = await SupabaseService.getGamePlayerId(validGameId, spotifyUserId);
      if (!playerId) {
        throw new Error('Failed to get game player ID. Please try joining again.');
      }

      setGamePlayerId(playerId);

      // Fetch existing answers and populate state
      const existingAnswers = await SupabaseService.getPlayerAnswers(playerId);
      if (existingAnswers.length > 0) {
        const answersMap: Record<string, SpotifyTrack> = {};
        existingAnswers.forEach((answer) => {
          answersMap[answer.question_id] = convertAnswerToTrack(answer);
        });
        setAnswers(answersMap);
      }

      // Fetch all active questions and filter by questionIds
      // Check cache first
      let allQuestions: Question[];
      if (isQuestionsCacheValid()) {
        const cachedQuestions = getQuestionsCache();
        if (cachedQuestions && cachedQuestions.length > 0) {
          allQuestions = cachedQuestions as Question[];
        } else {
          allQuestions = await SupabaseService.getActiveQuestions();
          setQuestionsCache(allQuestions, QUESTIONS_CACHE_TTL_MS);
        }
      } else {
        allQuestions = await SupabaseService.getActiveQuestions();
        setQuestionsCache(allQuestions, QUESTIONS_CACHE_TTL_MS);
      }
      
      const filteredQuestions = allQuestions.filter((q) =>
        questionIdsArray.includes(q.id)
      );

      if (filteredQuestions.length !== questionIdsArray.length) {
        console.warn('Some questions not found');
      }

      if (filteredQuestions.length === 0) {
        throw new Error('No valid questions found');
      }

      // Sort by display_order
      filteredQuestions.sort((a, b) => a.display_order - b.display_order);
      setQuestions(filteredQuestions);

      trackPageView('track_selection', validGameId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
      setInitError(errorMessage);
      trackError(errorMessage, 'track_selection_init');
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshToken = useCallback(async (): Promise<string> => {
    if (!gameId || !gamePlayerId) {
      throw new Error('Game ID or player ID not available');
    }

    // Get refresh token from database
    const refreshTokenValue = await SupabaseService.getRefreshToken(gamePlayerId, gameId);
    if (!refreshTokenValue) {
      throw new Error('Refresh token not found. Please re-authenticate.');
    }

    // Refresh the access token
    const newTokenData = await refreshAccessToken(refreshTokenValue);
    const newAccessToken = newTokenData.access_token;

    // Update state and sessionStorage
    setAccessToken(newAccessToken);
    sessionStorage.set(SPOTIFY_ACCESS_TOKEN_KEY, newAccessToken);

    return newAccessToken;
  }, [gameId, gamePlayerId]);

  const handleSearch = useCallback(
    async (questionId: string, query: string) => {
      if (!accessToken || !query || query.trim().length < 2) {
        return;
      }

      setIsLoading((prev) => ({ ...prev, [questionId]: true }));
      setSearchQueries((prev) => ({ ...prev, [questionId]: query }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });

      try {
        let currentToken = accessToken;
        let tracks: SpotifyTrack[];

        try {
          tracks = await searchTracksByYear(query, currentToken, 1);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to search tracks';
          
          // If token expired, try to refresh and retry
          if (errorMessage.includes('expired') || errorMessage.includes('401')) {
            try {
              currentToken = await refreshToken();
              tracks = await searchTracksByYear(query, currentToken, 1);
            } catch (refreshError) {
              const refreshErrorMessage = refreshError instanceof Error ? refreshError.message : 'Failed to refresh token';
              setInitError('Spotify access token expired. Please re-authenticate.');
              setErrors((prev) => ({ ...prev, [questionId]: refreshErrorMessage }));
              return;
            }
          } else {
            throw error;
          }
        }

        setSearchResults((prev) => ({ ...prev, [questionId]: tracks }));

        if (tracks.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [questionId]: 'No tracks from the past year found. Try a different search.',
          }));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to search tracks';
        setErrors((prev) => ({ ...prev, [questionId]: errorMessage }));
      } finally {
        setIsLoading((prev) => ({ ...prev, [questionId]: false }));
      }
    },
    [accessToken, refreshToken]
  );

  const handleSelectTrack = useCallback(
    async (questionId: string, track: SpotifyTrack) => {
      if (!gamePlayerId) {
        setErrors((prev) => ({
          ...prev,
          [questionId]: 'Game player ID not available',
        }));
        return;
      }

      // Validate track is from past year before saving
      if (!isTrackFromPastYear(track)) {
        setErrors((prev) => ({
          ...prev,
          [questionId]: 'This track is not from the past year. Please select a track released in the last year.',
        }));
        return;
      }

      // Optimistic UI update
      setAnswers((prev) => ({ ...prev, [questionId]: track }));
      setSavingStates((prev) => ({ ...prev, [questionId]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });

      try {
        const result = await SupabaseService.saveAnswer(gamePlayerId, questionId, track);

        if (!result.success) {
          throw new Error(result.error || 'Failed to save answer');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to save answer';
        setErrors((prev) => ({ ...prev, [questionId]: errorMessage }));

        // Revert optimistic update on error
        setAnswers((prev) => {
          const newAnswers = { ...prev };
          delete newAnswers[questionId];
          return newAnswers;
        });
      } finally {
        setSavingStates((prev) => ({ ...prev, [questionId]: false }));
      }
    },
    [gamePlayerId]
  );

  const handleComplete = () => {
    if (gameId && Object.keys(answers).length === questions.length) {
      // Clear selected questions from localStorage after successful completion
      const storageKey = getSelectedQuestionsKey(gameId);
      browserStorage.remove(storageKey);
      
      router.push(`/success?gameId=${gameId}`);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const allAnswered = answeredCount === totalQuestions && totalQuestions > 0;
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorDisplay
            message={initError}
            onRetry={initError.includes('re-authenticate') ? undefined : initializeData}
          />
          {initError.includes('re-authenticate') && (
            <div className="mt-4 text-center">
              <Button onClick={() => router.push('/')} variant="outline">
                Return to Home
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Select Tracks</h1>
          <p className="text-muted-foreground text-lg">
            Choose one track per question from the past year
          </p>
        </div>

        {/* Progress Indicator */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                Question {answeredCount} of {totalQuestions} answered
              </span>
              <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </CardContent>
        </Card>

        {/* Questions and Track Selection */}
        <div className="space-y-6">
          {questions.map((question) => {
            const selectedTrack = answers[question.id];
            const searchResult = searchResults[question.id] || [];
            const isSearching = isLoading[question.id] || false;
            const isSaving = savingStates[question.id] || false;
            const questionError = errors[question.id];

            return (
              <Card
                key={question.id}
                className={cn(selectedTrack && 'border-primary/50')}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{question.question_text}</CardTitle>
                      {selectedTrack && (
                        <CardDescription className="mt-2">
                          Selected: <span className="font-medium">{selectedTrack.name}</span> by{' '}
                          {selectedTrack.artists[0]?.name}
                        </CardDescription>
                      )}
                    </div>
                    {selectedTrack && (
                      <div className="shrink-0 text-primary">✓</div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedTrack && (
                    <>
                      <TrackSearch
                        onSearch={async (query) => {
                          await handleSearch(question.id, query);
                        }}
                        isLoading={isSearching}
                        error={questionError}
                      />

                      {searchResult.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {searchResult.length} track{searchResult.length !== 1 ? 's' : ''}{' '}
                            from the past year
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {searchResult.map((track) => (
                              <TrackCard
                                key={track.id}
                                track={track}
                                onSelect={(track) => handleSelectTrack(question.id, track)}
                                isLoading={isSaving}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {searchQueries[question.id] &&
                        searchQueries[question.id].length >= 2 &&
                        !isSearching &&
                        searchResult.length === 0 &&
                        !questionError && (
                          <Alert>
                            <AlertDescription>
                              No tracks from the past year found. Try a different search.
                            </AlertDescription>
                          </Alert>
                        )}
                    </>
                  )}

                  {selectedTrack && (
                    <div className="space-y-2">
                      <TrackCard
                        track={selectedTrack}
                        onSelect={() => {}}
                        isSelected={true}
                        isLoading={isSaving}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAnswers((prev) => {
                            const newAnswers = { ...prev };
                            delete newAnswers[question.id];
                            return newAnswers;
                          });
                        }}
                        disabled={isSaving}
                      >
                        Change Selection
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Complete Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleComplete}
              disabled={!allAnswered}
              className="w-full"
              size="lg"
            >
              {allAnswered ? 'Complete Selection' : `Answer ${totalQuestions - answeredCount} more question${totalQuestions - answeredCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TracksPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        }
      >
        <TracksPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
