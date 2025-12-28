'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuestionDropdown } from '@/components/question-dropdown';
import { TrackSelectionSidebar } from '@/components/track-selection-sidebar';
import { TrackAnswer } from '@/components/track-answer';
import { ErrorDisplay } from '@/components/error-display';
import ErrorBoundary from '@/components/error-boundary';
import { SupabaseService } from '@/lib/supabase';
import { fetchSpotifyUser, refreshAccessToken } from '@/lib/spotify';
import { SpotifyTrack, convertAnswerToTrack, isTrackFromPastYear } from '@/lib/spotify-search';
import { sessionStorage, SPOTIFY_ACCESS_TOKEN_KEY, getQuestionsCache, setQuestionsCache, isQuestionsCacheValid } from '@/lib/browser-storage';
import { validateGameCode } from '@/lib/validation';
import { trackPageView, trackError } from '@/lib/analytics';
import { Question, PlayerAnswerWithQuestion } from '@/types';
import { cn } from '@/lib/utils';
import { QUESTIONS_CACHE_TTL_MS } from '@/lib/constants';
import { Minus } from 'lucide-react';

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
  const [extractedTracks, setExtractedTracks] = useState<SpotifyTrack[]>([]);
  const [isExtractingTracks, setIsExtractingTracks] = useState(false);

  // UI state
  const [answers, setAnswers] = useState<Record<string, SpotifyTrack>>({});
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [selectedNewQuestionIds, setSelectedNewQuestionIds] = useState<Array<string | null>>([]);
  
  // Sidebar state
  const [sidebarQuestionId, setSidebarQuestionId] = useState<string | null>(null);

  // Loading states
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Memoized question lookup map for O(1) access
  const questionsMap = useMemo(() => {
    const map = new Map<string, Question>();
    allQuestions.forEach(q => map.set(q.id, q));
    return map;
  }, [allQuestions]);

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

  const handleSelectTrack = useCallback(
    async (questionId: string, track: SpotifyTrack, isCustomTrack: boolean = false) => {
      if (!gamePlayerId) {
        setErrors((prev) => ({
          ...prev,
          [questionId]: 'Game player ID not available',
        }));
        return;
      }

      // Validate track is from past year before saving (only for extracted tracks, not custom tracks)
      if (!isCustomTrack && !isTrackFromPastYear(track)) {
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

        // Update answered question IDs if this is a new answer
        if (!answeredQuestionIds.includes(questionId)) {
          setAnsweredQuestionIds((prev) => [...prev, questionId]);
          // Remove from selectedNewQuestionIds if it was a newly added question
          setSelectedNewQuestionIds((prev) => prev.filter((id) => id !== questionId));
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
        // Close sidebar after successful save
        if (sidebarQuestionId === questionId) {
          setSidebarQuestionId(null);
        }
      }
    },
    [gamePlayerId, answeredQuestionIds, sidebarQuestionId]
  );

  const handleOpenSidebar = useCallback((questionId: string) => {
    setSidebarQuestionId(questionId);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarQuestionId(null);
  }, []);

  const handleSidebarTrackSelect = useCallback(
    async (track: SpotifyTrack) => {
      if (!sidebarQuestionId) return;
      await handleSelectTrack(sidebarQuestionId, track, false);
      handleCloseSidebar();
    },
    [sidebarQuestionId, handleSelectTrack, handleCloseSidebar]
  );

  const handleSidebarCustomTrack = useCallback(
    async (track: SpotifyTrack) => {
      if (!sidebarQuestionId) return;
      await handleSelectTrack(sidebarQuestionId, track, true); // true = isCustomTrack
      handleCloseSidebar();
    },
    [sidebarQuestionId, handleSelectTrack, handleCloseSidebar]
  );

  const handleQuestionChange = useCallback(
    async (questionId: string, newQuestionId: string) => {
      const track = answers[questionId];
      if (!track || !gamePlayerId) {
        // Close sidebar if open for this question
        if (sidebarQuestionId === questionId) {
          setSidebarQuestionId(null);
        }
        return;
      }

      // Prevent selecting a question that's already answered
      if (answeredQuestionIds.includes(newQuestionId)) {
        setErrors((prev) => ({
          ...prev,
          [questionId]: 'This question is already answered. Please select a different question.',
        }));
        return;
      }

      setSavingStates((prev) => ({ ...prev, [questionId]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });

      try {
        // Delete old answer
        const deleteResult = await SupabaseService.deleteAnswer(gamePlayerId, questionId);
        if (!deleteResult.success) {
          throw new Error(deleteResult.error || 'Failed to delete old answer');
        }

        // Save to new question
        const saveResult = await SupabaseService.saveAnswer(gamePlayerId, newQuestionId, track);
        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save answer to new question');
        }

        // Update state
        setAnswers((prev) => {
          const newAnswers = { ...prev };
          delete newAnswers[questionId];
          newAnswers[newQuestionId] = track;
          return newAnswers;
        });
        setAnsweredQuestionIds((prev) => {
          const newIds = prev.filter((id) => id !== questionId);
          return [...newIds, newQuestionId];
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update question';
        setErrors((prev) => ({ ...prev, [questionId]: errorMessage }));
      } finally {
        setSavingStates((prev) => ({ ...prev, [questionId]: false }));
      }
    },
    [answers, gamePlayerId, answeredQuestionIds]
  );

  const handleRemoveQuestion = useCallback(
    async (questionId: string) => {
      // #region agent log
      console.log('[DEBUG] handleRemoveQuestion called', { questionId, gamePlayerId });
      fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:346',message:'handleRemoveQuestion called',data:{questionId,gamePlayerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      if (!gamePlayerId) {
        // #region agent log
        console.log('[DEBUG] Early return: gamePlayerId is null', { questionId });
        fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:349',message:'Early return: gamePlayerId is null',data:{questionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return;
      }

      setIsDeleting((prev) => ({ ...prev, [questionId]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });

      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:360',message:'Before deleteAnswer API call',data:{questionId,gamePlayerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const result = await SupabaseService.deleteAnswer(gamePlayerId, questionId);
        // #region agent log
        console.log('[DEBUG] After deleteAnswer API call', { questionId, resultSuccess: result.success, resultError: result.error });
        fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:361',message:'After deleteAnswer API call',data:{questionId,resultSuccess:result.success,resultError:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        if (!result.success) {
          // #region agent log
          console.error('[DEBUG] deleteAnswer failed', { questionId, error: result.error });
          fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:363',message:'deleteAnswer failed',data:{questionId,error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          throw new Error(result.error || 'Failed to delete answer');
        }

        // #region agent log
        console.log('[DEBUG] Before state updates', { questionId });
        fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:367',message:'Before state updates',data:{questionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Update state
        setAnswers((prev) => {
          const newAnswers = { ...prev };
          delete newAnswers[questionId];
          // #region agent log
          console.log('[DEBUG] setAnswers callback executed', { questionId, answersBefore: Object.keys(prev), answersAfter: Object.keys(newAnswers) });
          fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:370',message:'setAnswers callback executed',data:{questionId,answersBefore:Object.keys(prev),answersAfter:Object.keys(newAnswers)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return newAnswers;
        });
        setAnsweredQuestionIds((prev) => {
          const filtered = prev.filter((id) => id !== questionId);
          // #region agent log
          console.log('[DEBUG] setAnsweredQuestionIds callback executed', { questionId, answeredQuestionIdsBefore: prev, answeredQuestionIdsAfter: filtered });
          fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:372',message:'setAnsweredQuestionIds callback executed',data:{questionId,answeredQuestionIdsBefore:prev,answeredQuestionIdsAfter:filtered},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return filtered;
        });
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:377',message:'Error caught in handleRemoveQuestion',data:{questionId,errorMessage:error instanceof Error ? error.message : 'Unknown error'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete answer';
        setErrors((prev) => ({ ...prev, [questionId]: errorMessage }));
      } finally {
        setIsDeleting((prev) => ({ ...prev, [questionId]: false }));
      }
    },
    [gamePlayerId]
  );

  const handleAddQuestion = () => {
    // Add an empty slot (null) to selectedNewQuestionIds
    setSelectedNewQuestionIds((prev) => [...prev, null]);
  };

  const handleNewQuestionSelect = (index: number, questionId: string) => {
    // Replace null with actual question ID
    setSelectedNewQuestionIds((prev) => {
      const newIds = [...prev];
      newIds[index] = questionId;
      return newIds;
    });
  };

  const handleRemoveNewQuestion = (index: number) => {
    setSelectedNewQuestionIds((prev) => prev.filter((_, i) => i !== index));
  };

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
    <div className="min-h-screen bg-background p-4 pb-4">
      <div className="max-w-md mx-auto space-y-3 flex flex-col">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Select Tracks</h1>
          <p className="text-muted-foreground text-lg">
            Add questions and answer them with your music.
          </p>
        </div>

        {/* Answered Questions */}
        {answeredQuestionIds.length > 0 && (
          answeredQuestionIds.map((questionId) => {
            const question = questionsMap.get(questionId);
            const selectedTrack = answers[questionId];
            const isSaving = savingStates[questionId] || false;
            const isDeletingQuestion = isDeleting[questionId] || false;
            const questionError = errors[questionId];

            if (!question) return null;

            return (
              <Card key={questionId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <QuestionDropdown
                        questions={allQuestions}
                        selectedQuestionId={questionId}
                        excludedQuestionIds={answeredQuestionIds.filter((id) => id !== questionId)}
                        onSelect={(newQuestionId) => handleQuestionChange(questionId, newQuestionId)}
                        placeholder="Select a question..."
                        disabled={isSaving || isDeletingQuestion}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/c8f47d84-03f9-42b8-b409-8b436f7ea2e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-answers/page.tsx:472',message:'Remove button clicked',data:{questionId,answeredQuestionIdsCurrent:answeredQuestionIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                        // #endregion
                        handleRemoveQuestion(questionId);
                      }}
                      disabled={isSaving || isDeletingQuestion}
                      className="shrink-0"
                      aria-label="Remove question"
                    >
                      {isDeletingQuestion ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-5 space-y-4">
                  {selectedTrack ? (
                    <TrackAnswer
                      track={selectedTrack}
                      onChange={() => handleOpenSidebar(questionId)}
                      isLoading={isSaving}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleOpenSidebar(questionId)}
                      className="w-full"
                      disabled={isSaving || isDeletingQuestion}
                    >
                      Select Track
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* New Questions Needing Tracks */}
        {selectedNewQuestionIds.length > 0 &&
          selectedNewQuestionIds.map((questionId, index) => {
              const question = questionId ? questionsMap.get(questionId) : null;
              const selectedTrack = questionId ? answers[questionId] : undefined;
              const isSaving = questionId ? (savingStates[questionId] || false) : false;
              const questionError = questionId ? errors[questionId] : undefined;
              
              // Get excluded question IDs (all answered + all other selected new questions)
              const excludedQuestionIds = [
                ...answeredQuestionIds,
                ...selectedNewQuestionIds.filter((id, idx) => idx !== index && id !== null) as string[]
              ];

              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <QuestionDropdown
                          questions={allQuestions}
                          selectedQuestionId={questionId}
                          excludedQuestionIds={excludedQuestionIds}
                          onSelect={(newQuestionId) => handleNewQuestionSelect(index, newQuestionId)}
                          placeholder="Select a question..."
                          disabled={isSaving}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveNewQuestion(index)}
                        className="shrink-0"
                        aria-label="Remove question"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-5 space-y-4">
                    {question && questionId ? (
                      selectedTrack ? (
                        <TrackAnswer
                          track={selectedTrack}
                          onChange={() => handleOpenSidebar(questionId)}
                          isLoading={isSaving}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => handleOpenSidebar(questionId)}
                          className="w-full"
                          disabled={isSaving}
                        >
                          Select Track
                        </Button>
                      )
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}

        {/* Add Another Question Button */}
        <Button
          onClick={handleAddQuestion}
          variant="default"
          className="w-full h-11 rounded-full"
        >
          Add Question
        </Button>

        {/* Track Selection Sidebar */}
        {sidebarQuestionId && (
          <TrackSelectionSidebar
            isOpen={sidebarQuestionId !== null}
            onClose={handleCloseSidebar}
            questionText={
              sidebarQuestionId
                ? questionsMap.get(sidebarQuestionId)?.question_text || null
                : null
            }
            tracks={extractedTracks}
            selectedTrackId={sidebarQuestionId ? answers[sidebarQuestionId]?.id || null : null}
            onSelectTrack={handleSidebarTrackSelect}
            onCustomTrackAdd={handleSidebarCustomTrack}
            accessToken={accessToken}
            isLoading={isExtractingTracks}
            error={sidebarQuestionId ? errors[sidebarQuestionId] : null}
          />
        )}
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
