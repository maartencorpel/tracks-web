'use client';

import { Question } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const handleValueChange = (value: string) => {
    if (value) {
      onSelect(value);
    }
  };

  return (
    <Select
      value={selectedQuestionId || undefined}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger aria-label="Select a question">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {questions.map((question) => {
          const isExcluded = excludedQuestionIds.includes(question.id);
          return (
            <SelectItem
              key={question.id}
              value={question.id}
              disabled={isExcluded}
            >
              {question.question_text}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
