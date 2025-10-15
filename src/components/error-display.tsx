'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive" className="w-full max-w-md">
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}
