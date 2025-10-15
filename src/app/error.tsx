'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="text-7xl mb-4">❌</div>
          <CardTitle className="text-2xl">Something went wrong!</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              We encountered an unexpected error. This might be a temporary issue.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <Button 
              onClick={reset}
              className="w-full"
              size="lg"
            >
              Try Again
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Go Home
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-sm text-muted-foreground cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto">
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
