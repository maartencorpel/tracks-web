'use client';

import { Question } from '@/types';
import { cn } from '@/lib/utils';

interface QuestionDropdownProps {
  questions: Question[];
  selectedQuestionId: string | null;
  excludedQuestionIds: string[];
  onSelect: (questionId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function QuestionDropdown({
  questions,
  selectedQuestionId,
  excludedQuestionIds,
  onSelect,
  placeholder = 'Select a question...',
  disabled = false,
}: QuestionDropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const questionId = e.target.value;
    if (questionId) {
      onSelect(questionId);
    }
  };

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  return (
    <select
      value={selectedQuestionId || ''}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'cursor-pointer'
      )}
      aria-label="Select a question"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {questions.map((question) => {
        const isExcluded = excludedQuestionIds.includes(question.id);
        return (
          <option
            key={question.id}
            value={question.id}
            disabled={isExcluded}
            className={isExcluded ? 'text-muted-foreground' : ''}
          >
            {question.question_text}
          </option>
        );
      })}
    </select>
  );
}
