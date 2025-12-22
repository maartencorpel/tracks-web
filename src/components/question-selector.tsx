'use client';

import { Question } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuestionSelectorProps {
  questions: Question[];
  selectedQuestionIds: string[]; // For backward compatibility (multi mode)
  selectedQuestionId?: string; // For single mode
  mode?: 'multi' | 'single';
  onToggleQuestion: (questionId: string) => void; // For multi mode
  onSelectQuestion?: (questionId: string) => void; // For single mode
  isLoading?: boolean;
}

export function QuestionSelector({
  questions,
  selectedQuestionIds,
  selectedQuestionId,
  mode = 'multi',
  onToggleQuestion,
  onSelectQuestion,
  isLoading = false,
}: QuestionSelectorProps) {
  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1 rounded" />
                <Skeleton className="h-5 flex-1" />
              </div>
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

  const isSingleMode = mode === 'single';

  if (isSingleMode) {
    return (
      <RadioGroup
        value={selectedQuestionId || undefined}
        onValueChange={(value) => {
          if (onSelectQuestion && value) {
            onSelectQuestion(value);
          }
        }}
        disabled={isLoading}
        className="w-full space-y-3"
      >
        {questions.map((question) => {
          const isSelected = selectedQuestionId === question.id;
          return (
            <Card
              key={question.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                isSelected && 'border-primary bg-accent/50'
              )}
              onClick={() => {
                if (!isLoading && onSelectQuestion) {
                  onSelectQuestion(question.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value={question.id}
                    id={`question-${question.id}`}
                    className="mt-1"
                    disabled={isLoading}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label
                    htmlFor={`question-${question.id}`}
                    className="flex-1 text-sm font-medium leading-relaxed cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {question.question_text}
                  </Label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>
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
            onClick={() => {
              if (!isLoading) {
                onToggleQuestion(question.id);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {
                    if (!isLoading) {
                      onToggleQuestion(question.id);
                    }
                  }}
                  id={`question-${question.id}`}
                  className="mt-1"
                  disabled={isLoading}
                  onClick={(e) => e.stopPropagation()}
                />
                <Label
                  htmlFor={`question-${question.id}`}
                  className="flex-1 text-sm font-medium leading-relaxed cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {question.question_text}
                </Label>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
