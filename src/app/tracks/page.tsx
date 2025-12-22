'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { TrackList } from '@/components/track-list';
import { CustomTrackInput } from '@/components/custom-track-input';
import { TrackCard } from '@/components/track-card';
import { QuestionDropdown } from '@/components/question-dropdown';
import { ErrorDisplay } from '@/components/error-display';
import ErrorBoundary from '@/components/error-boundary';
import { SupabaseService } from '@/lib/supabase';
import { fetchSpotifyUser, refreshAccessToken } from '@/lib/spotify';
import { SpotifyTrack, convertAnswerToTrack, isTrackFromPastYear } from '@/lib/spotify-search';
import { sessionStorage, SPOTIFY_ACCESS_TOKEN_KEY, getQuestionsCache, setQuestionsCache, isQuestionsCacheValid } from '@/lib/browser-storage';
import { validateGameCode } from '@/lib/validation';
import { trackPageView, trackError } from '@/lib/analytics';
import { Question } from '@/types';
import { cn } from '@/lib/utils';
import { QUESTIONS_CACHE_TTL_MS, MINIMUM_QUESTIONS } from '@/lib/constants';

interface Slot {
  questionId: string | null;
  track: SpotifyTrack | null;
}

function TracksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialization state
  const [gameId, setGameId] = useState<string | null>(null);
  const [gamePlayerId, setGamePlayerId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Slot-based state
  const [slots, setSlots] = useState<Slot[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  // Extracted tracks
  const [extractedTracks, setExtractedTracks] = useState<SpotifyTrack[]>([]);
  const [isExtractingTracks, setIsExtractingTracks] = useState(false);

  // Track selection state (keyed by slot index)
  const [showCustomInput, setShowCustomInput] = useState<Record<number, boolean>>({});
  const [savingStates, setSavingStates] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

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

      // Get single question ID from query params
      const questionParam = searchParams.get('question');
      if (!questionParam) {
        throw new Error('No question provided');
      }

      const initialQuestionId = questionParam;

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

      // Fetch all active questions
      let questionsData: Question[];
      if (isQuestionsCacheValid()) {
        const cachedQuestions = getQuestionsCache();
        if (cachedQuestions && cachedQuestions.length > 0) {
          questionsData = cachedQuestions as Question[];
        } else {
          questionsData = await SupabaseService.getActiveQuestions();
          setQuestionsCache(questionsData, QUESTIONS_CACHE_TTL_MS);
        }
      } else {
        questionsData = await SupabaseService.getActiveQuestions();
        setQuestionsCache(questionsData, QUESTIONS_CACHE_TTL_MS);
      }

      // Sort by display_order
      questionsData.sort((a, b) => a.display_order - b.display_order);
      setAllQuestions(questionsData);

      // Verify initial question exists
      const initialQuestion = questionsData.find((q) => q.id === initialQuestionId);
      if (!initialQuestion) {
        throw new Error('Selected question not found');
      }

      // Load extracted tracks
      let tracks = await SupabaseService.getExtractedTracks(playerId);
      
      // If no tracks found, extract them on-the-fly
      if (tracks.length === 0 && token) {
        setIsExtractingTracks(true);
        try {
          const extractionResult = await SupabaseService.extractPlayerTracks(
            playerId,
            token
          );
          if (extractionResult.success) {
            tracks = await SupabaseService.getExtractedTracks(playerId);
          }
        } catch (extractionError) {
          console.error('Failed to extract tracks:', extractionError);
          // Continue anyway - user can still use custom track input
        } finally {
          setIsExtractingTracks(false);
        }
      }
      
      setExtractedTracks(tracks);

      // Fetch existing answers
      const existingAnswers = await SupabaseService.getPlayerAnswers(playerId);
      const existingAnswersMap = new Map<string, SpotifyTrack>();
      existingAnswers.forEach((answer) => {
        existingAnswersMap.set(answer.question_id, convertAnswerToTrack(answer));
      });

      // Initialize slots: Slot 1 pre-filled, slots 2-5 empty
      const initialSlots: Slot[] = [
        {
          questionId: initialQuestionId,
          track: existingAnswersMap.get(initialQuestionId) || null,
        },
        { questionId: null, track: null },
        { questionId: null, track: null },
        { questionId: null, track: null },
        { questionId: null, track: null },
      ];

      // Populate additional slots from existing answers (excluding the initial question)
      existingAnswers.forEach((answer) => {
        if (answer.question_id !== initialQuestionId) {
          const emptySlotIndex = initialSlots.findIndex((s) => s.questionId === null);
          if (emptySlotIndex !== -1) {
            initialSlots[emptySlotIndex] = {
              questionId: answer.question_id,
              track: convertAnswerToTrack(answer),
            };
          } else {
            // Add new slot if all 5 are filled
            initialSlots.push({
              questionId: answer.question_id,
              track: convertAnswerToTrack(answer),
            });
          }
        }
      });

      setSlots(initialSlots);

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

  const handleSlotQuestionChange = useCallback(async (slotIndex: number, questionId: string) => {
    const slot = slots[slotIndex];
    const hasTrack = slot.track !== null;
    const oldQuestionId = slot.questionId;
    
    // Update question ID optimistically
    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[slotIndex] = { ...newSlots[slotIndex], questionId };
      return newSlots;
    });
    
    // Hide custom input when question changes
    setShowCustomInput((prev) => {
      const newState = { ...prev };
      delete newState[slotIndex];
      return newState;
    });
    
    // If track exists, save it to the new question
    if (hasTrack && slot.track && gamePlayerId) {
      setSavingStates((prev) => ({ ...prev, [slotIndex]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[slotIndex];
        return newErrors;
      });
      
      try {
        const result = await SupabaseService.saveAnswer(
          gamePlayerId,
          questionId,
          slot.track
        );
        
        if (!result.success) {
          // Revert question change on error
          setSlots((prev) => {
            const newSlots = [...prev];
            newSlots[slotIndex] = { ...newSlots[slotIndex], questionId: oldQuestionId };
            return newSlots;
          });
          setErrors((prev) => ({
            ...prev,
            [slotIndex]: result.error || 'Failed to update question',
          }));
        }
      } catch (error) {
        // Revert question change on error
        setSlots((prev) => {
          const newSlots = [...prev];
          newSlots[slotIndex] = { ...newSlots[slotIndex], questionId: oldQuestionId };
          return newSlots;
        });
        const errorMessage = error instanceof Error ? error.message : 'Failed to update question';
        setErrors((prev) => ({
          ...prev,
          [slotIndex]: errorMessage,
        }));
      } finally {
        setSavingStates((prev) => ({ ...prev, [slotIndex]: false }));
      }
    } else {
      // If no track, clear the track (existing behavior)
      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = { ...newSlots[slotIndex], track: null };
        return newSlots;
      });
    }
  }, [slots, gamePlayerId]);

  const handleSlotTrackSelect = useCallback(
    async (slotIndex: number, track: SpotifyTrack, isCustomTrack: boolean = false) => {
      if (!gamePlayerId) {
        setErrors((prev) => ({
          ...prev,
          [slotIndex]: 'Game player ID not available',
        }));
        return;
      }

      const slot = slots[slotIndex];
      if (!slot.questionId) {
        return;
      }

      // Validate track is from past year before saving (only for extracted tracks, not custom tracks)
      if (!isCustomTrack && !isTrackFromPastYear(track)) {
        setErrors((prev) => ({
          ...prev,
          [slotIndex]: 'This track is not from the past year. Please select a track released in the last year.',
        }));
        return;
      }

      // Optimistic UI update
      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = { ...newSlots[slotIndex], track };
        return newSlots;
      });
      setSavingStates((prev) => ({ ...prev, [slotIndex]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[slotIndex];
        return newErrors;
      });

      try {
        const result = await SupabaseService.saveAnswer(gamePlayerId, slot.questionId, track);

        if (!result.success) {
          throw new Error(result.error || 'Failed to save answer');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to save answer';
        setErrors((prev) => ({ ...prev, [slotIndex]: errorMessage }));

        // Revert optimistic update on error
        setSlots((prev) => {
          const newSlots = [...prev];
          newSlots[slotIndex] = { ...newSlots[slotIndex], track: null };
          return newSlots;
        });
      } finally {
        setSavingStates((prev) => ({ ...prev, [slotIndex]: false }));
      }
    },
    [gamePlayerId, slots]
  );

  const handleCustomTrackAdd = useCallback(
    async (slotIndex: number, track: SpotifyTrack) => {
      // Hide custom input
      setShowCustomInput((prev) => {
        const newState = { ...prev };
        delete newState[slotIndex];
        return newState;
      });
      
      // Select the track (this will save it)
      await handleSlotTrackSelect(slotIndex, track, true); // true = isCustomTrack (no year validation)
    },
    [handleSlotTrackSelect]
  );

  // Get filtered tracks for a slot (all extracted tracks, filtering/sorting handled by TrackList)
  const getFilteredTracks = useCallback((slotIndex: number): SpotifyTrack[] => {
    return extractedTracks;
  }, [extractedTracks]);

  const handleAddSlot = useCallback(() => {
    setSlots((prev) => [...prev, { questionId: null, track: null }]);
  }, []);

  const handleRemoveSlot = useCallback((slotIndex: number) => {
    if (slotIndex <= 4) {
      return; // Can't remove slots 1-5
    }
    setSlots((prev) => prev.filter((_, index) => index !== slotIndex));
  }, []);

  const handleComplete = () => {
    const completedSlots = slots.filter((s) => s.questionId && s.track);
    if (completedSlots.length >= MINIMUM_QUESTIONS && gameId) {
      router.push(`/success?gameId=${gameId}`);
    }
  };

  const completedSlots = slots.filter((s) => s.questionId && s.track);
  const completedCount = completedSlots.length;
  const canComplete = completedCount >= MINIMUM_QUESTIONS;
  const progressPercentage = MINIMUM_QUESTIONS > 0 ? (completedCount / MINIMUM_QUESTIONS) * 100 : 0;

  // Get all selected question IDs (excluding nulls) for dropdown exclusion
  const selectedQuestionIds = slots
    .map((s) => s.questionId)
    .filter((id): id is string => id !== null);

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
                {completedCount} of {MINIMUM_QUESTIONS} minimum questions answered
                {slots.length > MINIMUM_QUESTIONS && ` (${slots.length} total slots)`}
              </span>
              <span className="text-muted-foreground">{Math.min(Math.round(progressPercentage), 100)}%</span>
            </div>
            <Progress value={Math.min(progressPercentage, 100)} className="w-full" />
          </CardContent>
        </Card>

        {/* Slots */}
        <div className="space-y-6">
          {slots.map((slot, slotIndex) => {
            const isSlot1 = slotIndex === 0;
            const question = slot.questionId
              ? allQuestions.find((q) => q.id === slot.questionId)
              : null;
            const selectedTrack = slot.track;
            const isSaving = savingStates[slotIndex] || false;
            const slotError = errors[slotIndex];
            const showCustom = showCustomInput[slotIndex] || false;

            // For dropdown: exclude this slot's question and all other selected questions
            const excludedQuestionIds = slots
              .map((s, idx) => (idx !== slotIndex ? s.questionId : null))
              .filter((id): id is string => id !== null);

            return (
              <Card
                key={slotIndex}
                className={cn(selectedTrack && question && 'border-primary/50')}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {isSlot1 ? 'Question 1' : `Question ${slotIndex + 1}`}
                      </CardTitle>
                      {question && (
                        <CardDescription className="mt-2">
                          {question.question_text}
                        </CardDescription>
                      )}
                      {selectedTrack && (
                        <CardDescription className="mt-2">
                          Selected: <span className="font-medium">{selectedTrack.name}</span> by{' '}
                          {selectedTrack.artists[0]?.name}
                        </CardDescription>
                      )}
                    </div>
                    {selectedTrack && question && (
                      <div className="shrink-0 text-primary">✓</div>
                    )}
                    {slotIndex > 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSlot(slotIndex)}
                        className="shrink-0"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isSlot1 && (
                    <QuestionDropdown
                      questions={allQuestions}
                      selectedQuestionId={slot.questionId}
                      excludedQuestionIds={excludedQuestionIds}
                      onSelect={(questionId) => handleSlotQuestionChange(slotIndex, questionId)}
                      placeholder="Select a question..."
                    />
                  )}

                  {question && (
                    <>
                      {!selectedTrack ? (
                        <>
                          {showCustom ? (
                            accessToken && (
                              <CustomTrackInput
                                onTrackFound={(track) => handleCustomTrackAdd(slotIndex, track)}
                                onCancel={() => {
                                  setShowCustomInput((prev) => {
                                    const newState = { ...prev };
                                    delete newState[slotIndex];
                                    return newState;
                                  });
                                }}
                                accessToken={accessToken}
                                error={slotError}
                              />
                            )
                          ) : (
                            <>
                              <TrackList
                                tracks={getFilteredTracks(slotIndex)}
                                selectedTrackId={null}
                                onSelectTrack={(track) => handleSlotTrackSelect(slotIndex, track)}
                                isLoading={isExtractingTracks}
                                error={slotError}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowCustomInput((prev) => ({ ...prev, [slotIndex]: true }));
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors[slotIndex];
                                    return newErrors;
                                  });
                                }}
                                className="w-full mt-2"
                              >
                                Can't find your track? Add custom track
                              </Button>
                            </>
                          )}
                        </>
                      ) : (
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
                              setSlots((prev) => {
                                const newSlots = [...prev];
                                newSlots[slotIndex] = { ...newSlots[slotIndex], track: null };
                                return newSlots;
                              });
                            }}
                            disabled={isSaving}
                          >
                            Change Selection
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add Another Question Button */}
        <Button
          onClick={handleAddSlot}
          variant="outline"
          className="w-full"
        >
          Add Another Question
        </Button>

        {/* Complete Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleComplete}
              disabled={!canComplete}
              className="w-full"
              size="lg"
            >
              {canComplete
                ? 'Complete Selection'
                : `Answer ${MINIMUM_QUESTIONS - completedCount} more question${MINIMUM_QUESTIONS - completedCount !== 1 ? 's' : ''}`}
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
