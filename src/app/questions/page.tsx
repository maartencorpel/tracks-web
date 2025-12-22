'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QuestionSelector } from '@/components/question-selector';
import { ErrorDisplay } from '@/components/error-display';
import ErrorBoundary from '@/components/error-boundary';
import { SupabaseService } from '@/lib/supabase';
import { getQuestionsCache, setQuestionsCache, isQuestionsCacheValid } from '@/lib/browser-storage';
import { validateGameCode } from '@/lib/validation';
import { trackPageView, trackError } from '@/lib/analytics';
import { Question } from '@/types';
import { QUESTIONS_CACHE_TTL_MS } from '@/lib/constants';

function QuestionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    const gameIdParam = searchParams.get('gameId');
    if (gameIdParam) {
      const validation = validateGameCode(gameIdParam);
      if (validation.valid && validation.value) {
        setGameId(validation.value);
        trackPageView('question_selection', validation.value);
      } else {
        setError(validation.error || 'Invalid game code');
        setIsLoading(false);
        return;
      }
    } else {
      setError('No game code provided');
      setIsLoading(false);
      return;
    }

    loadQuestions();
  }, [searchParams]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      if (isQuestionsCacheValid()) {
        const cachedQuestions = getQuestionsCache();
        if (cachedQuestions && cachedQuestions.length > 0) {
          setQuestions(cachedQuestions);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from Supabase if cache is invalid or missing
      const activeQuestions = await SupabaseService.getActiveQuestions();

      if (activeQuestions.length === 0) {
        setError('No questions available. Please contact support.');
        setIsLoading(false);
        return;
      }

      // Update cache
      setQuestionsCache(activeQuestions, QUESTIONS_CACHE_TTL_MS);
      setQuestions(activeQuestions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load questions';
      setError(errorMessage);
      trackError(errorMessage, 'question_selection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestionId(questionId);
  };

  const handleContinue = () => {
    if (!selectedQuestionId || !gameId) return;

    setIsNavigating(true);

    // Navigate to tracks page with single question ID
    router.push(`/tracks?gameId=${gameId}&question=${selectedQuestionId}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Select a Question</h1>
          <p className="text-muted-foreground text-lg">
            Select a question to get started
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            message={error}
            onRetry={error.includes('Failed to load') ? loadQuestions : undefined}
          />
        )}

        {/* Questions List */}
        {!error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Questions</CardTitle>
              <CardDescription>
                Browse the questions and select one to continue. You'll be able to add more questions on the next screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionSelector
                questions={questions}
                selectedQuestionId={selectedQuestionId || undefined}
                mode="single"
                onSelectQuestion={handleSelectQuestion}
                onToggleQuestion={() => {}} // Required prop but not used in single mode
                selectedQuestionIds={[]} // Required prop but not used in single mode
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        {!error && !isLoading && (
          <Button
            onClick={handleContinue}
            disabled={!selectedQuestionId || isNavigating}
            className="w-full"
            size="lg"
          >
            {isNavigating ? (
              <>
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Loading...
              </>
            ) : (
              'Continue to Track Selection'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function QuestionsPage() {
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
        <QuestionsPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
