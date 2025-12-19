'use client';

import { Question } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuestionSelectorProps {
  questions: Question[];
  selectedQuestionIds: string[];
  onToggleQuestion: (questionId: string) => void;
  isLoading?: boolean;
}

export function QuestionSelector({
  questions,
  selectedQuestionIds,
  onToggleQuestion,
  isLoading = false,
}: QuestionSelectorProps) {
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-6 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No questions available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-3">
      {questions.map((question) => {
        const isSelected = selectedQuestionIds.includes(question.id);

        return (
          <Card
            key={question.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              isSelected && 'border-primary bg-accent/50'
            )}
            onClick={() => !isLoading && onToggleQuestion(question.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleQuestion(question.id)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoading}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Select question: ${question.question_text}`}
                />
                <label
                  className="flex-1 text-sm font-medium leading-relaxed cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {question.question_text}
                </label>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
