'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive" className="w-full max-w-md border-2 border-destructive/50">
      <AlertDescription className="flex items-center justify-between text-center">
        <span className="flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 text-sm font-medium underline hover:no-underline transition-all"
          >
            Retry
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}
