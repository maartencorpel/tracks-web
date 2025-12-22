'use client';

import { PlayerAnswerWithQuestion } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

interface AnswerSummaryProps {
  answers: PlayerAnswerWithQuestion[];
  totalQuestions?: number;
  isReady?: boolean;
}

export function AnswerSummary({
  answers,
  totalQuestions,
  isReady = false,
}: AnswerSummaryProps) {
  const answerCount = answers.length;
  const displayTotal = totalQuestions || answerCount;

  return (
    <Card className={cn(isReady && 'border-primary/50')}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isReady ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <XCircle className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {answerCount} of {displayTotal} question{displayTotal !== 1 ? 's' : ''} answered
              </p>
              <p className="text-sm text-muted-foreground">
                {isReady ? 'Ready to play!' : 'Answer at least 5 questions to be ready'}
              </p>
            </div>
          </div>
          <div>
            {isReady ? (
              <Alert variant="success" className="py-2 px-3">
                <AlertDescription className="text-sm font-medium">
                  Ready
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default" className="py-2 px-3">
                <AlertDescription className="text-sm text-muted-foreground">
                  Not Ready
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
