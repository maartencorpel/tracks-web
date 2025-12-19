'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnswerSummary } from '@/components/answer-summary';
import { QuestionSelector } from '@/components/question-selector';
import { TrackSearch } from '@/components/track-search';
import { TrackCard } from '@/components/track-card';
import { ErrorDisplay } from '@/components/error-display';
import ErrorBoundary from '@/components/error-boundary';
import { SupabaseService } from '@/lib/supabase';
import { fetchSpotifyUser, refreshAccessToken } from '@/lib/spotify';
import { searchTracksByYear, SpotifyTrack, convertAnswerToTrack, isTrackFromPastYear } from '@/lib/spotify-search';
import { sessionStorage, SPOTIFY_ACCESS_TOKEN_KEY, getQuestionsCache, setQuestionsCache, isQuestionsCacheValid } from '@/lib/browser-storage';
import { validateGameCode } from '@/lib/validation';
import { trackPageView, trackError } from '@/lib/analytics';
import { Question, PlayerAnswerWithQuestion } from '@/types';
import { cn } from '@/lib/utils';
import { QUESTIONS_CACHE_TTL_MS } from '@/lib/constants';

function UpdateAnswersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialization state
  const [gameId, setGameId] = useState<string | null>(null);
  const [gamePlayerId, setGamePlayerId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Data state
  const [existingAnswers, setExistingAnswers] = useState<PlayerAnswerWithQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isReady, setIsReady] = useState(false);

  // UI state
  const [answers, setAnswers] = useState<Record<string, SpotifyTrack>>({});
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [showAddQuestions, setShowAddQuestions] = useState(false);
  const [selectedNewQuestionIds, setSelectedNewQuestionIds] = useState<string[]>([]);
  const [changingQuestionId, setChangingQuestionId] = useState<string | null>(null);

  // Search and loading states
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, SpotifyTrack[]>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
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

      // Fetch existing answers
      const answers = await SupabaseService.getPlayerAnswers(playerId);
      setExistingAnswers(answers);

      // Convert answers to SpotifyTrack format
      const answersMap: Record<string, SpotifyTrack> = {};
      const answeredIds: string[] = [];
      answers.forEach((answer) => {
        answersMap[answer.question_id] = convertAnswerToTrack(answer);
        answeredIds.push(answer.question_id);
      });
      setAnswers(answersMap);
      setAnsweredQuestionIds(answeredIds);

      // Fetch all active questions (check cache first)
      let questions: Question[];
      if (isQuestionsCacheValid()) {
        const cachedQuestions = getQuestionsCache();
        if (cachedQuestions && cachedQuestions.length > 0) {
          questions = cachedQuestions as Question[];
        } else {
          questions = await SupabaseService.getActiveQuestions();
          setQuestionsCache(questions, QUESTIONS_CACHE_TTL_MS);
        }
      } else {
        questions = await SupabaseService.getActiveQuestions();
        setQuestionsCache(questions, QUESTIONS_CACHE_TTL_MS);
      }
      setAllQuestions(questions);

      // Check readiness status
      const ready = await SupabaseService.checkPlayerReadiness(playerId);
      setIsReady(ready);

      trackPageView('update_answers', validGameId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
      setInitError(errorMessage);
      trackError(errorMessage, 'update_answers_init');
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
      setChangingQuestionId(null);
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

        // Update answered question IDs if this is a new answer
        if (!answeredQuestionIds.includes(questionId)) {
          setAnsweredQuestionIds((prev) => [...prev, questionId]);
          // Remove from selectedNewQuestionIds if it was a newly added question
          setSelectedNewQuestionIds((prev) => prev.filter((id) => id !== questionId));
        }

        // Re-check readiness
        const ready = await SupabaseService.checkPlayerReadiness(gamePlayerId);
        setIsReady(ready);
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
    [gamePlayerId, answeredQuestionIds]
  );

  const handleRemoveQuestion = useCallback(
    async (questionId: string) => {
      if (!gamePlayerId) {
        return;
      }

      // Check minimum
      if (answeredQuestionIds.length <= 5) {
        setErrors((prev) => ({
          ...prev,
          [questionId]: 'You must have at least 5 answered questions',
        }));
        return;
      }

      setIsDeleting((prev) => ({ ...prev, [questionId]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });

      try {
        const result = await SupabaseService.deleteAnswer(gamePlayerId, questionId);

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete answer');
        }

        // Update state
        setAnswers((prev) => {
          const newAnswers = { ...prev };
          delete newAnswers[questionId];
          return newAnswers;
        });
        setAnsweredQuestionIds((prev) => prev.filter((id) => id !== questionId));

        // Re-check readiness
        const ready = await SupabaseService.checkPlayerReadiness(gamePlayerId);
        setIsReady(ready);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete answer';
        setErrors((prev) => ({ ...prev, [questionId]: errorMessage }));
      } finally {
        setIsDeleting((prev) => ({ ...prev, [questionId]: false }));
      }
    },
    [gamePlayerId, answeredQuestionIds.length]
  );

  const handleToggleNewQuestion = (questionId: string) => {
    setSelectedNewQuestionIds((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      }
      return [...prev, questionId];
    });
  };

  const handleAddSelectedQuestions = () => {
    // Questions are added but not yet answered (need tracks)
    // They'll be shown in the "New Questions Needing Tracks" section
    setShowAddQuestions(false);
    // Keep selectedNewQuestionIds so they show in the track selection section
  };

  const unansweredQuestions = useMemo(
    () => allQuestions.filter(
      (q) => !answeredQuestionIds.includes(q.id) && !selectedNewQuestionIds.includes(q.id)
    ),
    [allQuestions, answeredQuestionIds, selectedNewQuestionIds]
  );

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
          <h1 className="text-3xl font-bold">Update Your Answers</h1>
          <p className="text-muted-foreground text-lg">
            Change your track selections or add more questions
          </p>
        </div>

        {/* Readiness Status */}
        <AnswerSummary
          answers={existingAnswers}
          totalQuestions={answeredQuestionIds.length}
          isReady={isReady}
        />

        {/* Current Answers */}
        <Card>
          <CardHeader>
            <CardTitle>Your Current Answers</CardTitle>
            <CardDescription>
              {answeredQuestionIds.length} question{answeredQuestionIds.length !== 1 ? 's' : ''} answered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {answeredQuestionIds.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No answers yet. Add questions below to get started.
              </p>
            ) : (
              answeredQuestionIds.map((questionId) => {
                const question = allQuestions.find((q) => q.id === questionId);
                const selectedTrack = answers[questionId];
                const isChanging = changingQuestionId === questionId;
                const searchResult = searchResults[questionId] || [];
                const isSearching = isLoading[questionId] || false;
                const isSaving = savingStates[questionId] || false;
                const isDeletingQuestion = isDeleting[questionId] || false;
                const questionError = errors[questionId];
                const canRemove = answeredQuestionIds.length > 5;

                if (!question) return null;

                return (
                  <Card key={questionId} className={cn(selectedTrack && 'border-primary/50')}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{question.question_text}</CardTitle>
                          {selectedTrack && !isChanging && (
                            <CardDescription className="mt-2">
                              Selected: <span className="font-medium">{selectedTrack.name}</span> by{' '}
                              {selectedTrack.artists[0]?.name}
                            </CardDescription>
                          )}
                        </div>
                        {selectedTrack && !isChanging && (
                          <div className="shrink-0 text-primary">✓</div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!isChanging && selectedTrack ? (
                        <>
                          <TrackCard
                            track={selectedTrack}
                            onSelect={() => {}}
                            isSelected={true}
                            isLoading={isSaving}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setChangingQuestionId(questionId)}
                              disabled={isSaving || isDeletingQuestion}
                            >
                              Change Track
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveQuestion(questionId)}
                              disabled={!canRemove || isSaving || isDeletingQuestion}
                            >
                              {isDeletingQuestion ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                'Remove Question'
                              )}
                            </Button>
                            {!canRemove && (
                              <p className="text-xs text-muted-foreground self-center">
                                Minimum 5 questions required
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <TrackSearch
                            onSearch={async (query) => {
                              await handleSearch(questionId, query);
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
                                    onSelect={(track) => handleSelectTrack(questionId, track)}
                                    isLoading={isSaving}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {searchQueries[questionId] &&
                            searchQueries[questionId].length >= 2 &&
                            !isSearching &&
                            searchResult.length === 0 &&
                            !questionError && (
                              <Alert>
                                <AlertDescription>
                                  No tracks from the past year found. Try a different search.
                                </AlertDescription>
                              </Alert>
                            )}

                          {selectedTrack && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setChangingQuestionId(null)}
                            >
                              Cancel
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Add More Questions */}
        {unansweredQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Add More Questions</CardTitle>
                  <CardDescription>
                    Select additional questions to answer ({unansweredQuestions.length} available)
                  </CardDescription>
                </div>
                <Button
                  variant={showAddQuestions ? 'outline' : 'default'}
                  onClick={() => {
                    setShowAddQuestions(!showAddQuestions);
                    setSelectedNewQuestionIds([]);
                  }}
                >
                  {showAddQuestions ? 'Cancel' : 'Add Questions'}
                </Button>
              </div>
            </CardHeader>
            {showAddQuestions && (
              <CardContent className="space-y-4">
                <QuestionSelector
                  questions={unansweredQuestions}
                  selectedQuestionIds={selectedNewQuestionIds}
                  onToggleQuestion={handleToggleNewQuestion}
                />
                {selectedNewQuestionIds.length > 0 && (
                  <Button
                    onClick={handleAddSelectedQuestions}
                    className="w-full"
                    disabled={selectedNewQuestionIds.length === 0}
                  >
                    Add {selectedNewQuestionIds.length} Question{selectedNewQuestionIds.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* New Questions Needing Tracks */}
        {selectedNewQuestionIds.length > 0 &&
          selectedNewQuestionIds.map((questionId) => {
              const question = allQuestions.find((q) => q.id === questionId);
              const selectedTrack = answers[questionId];
              const searchResult = searchResults[questionId] || [];
              const isSearching = isLoading[questionId] || false;
              const isSaving = savingStates[questionId] || false;
              const questionError = errors[questionId];

              if (!question) return null;

              return (
                <Card key={questionId} className="border-primary">
                  <CardHeader>
                    <CardTitle className="text-lg">New: {question.question_text}</CardTitle>
                    <CardDescription>Select a track for this question</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!selectedTrack ? (
                      <>
                        <TrackSearch
                          onSearch={async (query) => {
                            await handleSearch(questionId, query);
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
                                  onSelect={(track) => handleSelectTrack(questionId, track)}
                                  isLoading={isSaving}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedNewQuestionIds((prev) => prev.filter((id) => id !== questionId));
                          }}
                        >
                          Remove from List
                        </Button>
                      </>
                    ) : (
                      <TrackCard
                        track={selectedTrack}
                        onSelect={() => {}}
                        isSelected={true}
                        isLoading={isSaving}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}

        {/* Done Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => router.push(`/success?gameId=${gameId}`)}
              className="w-full"
              size="lg"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpdateAnswersPage() {
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
        <UpdateAnswersPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
