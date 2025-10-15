'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GameCodeInputProps {
  onJoin: (gameId: string) => void;
  isLoading?: boolean;
}

export function GameCodeInput({ onJoin, isLoading = false }: GameCodeInputProps) {
  const [gameId, setGameId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId.trim()) {
      onJoin(gameId.trim().toUpperCase());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameId(e.target.value.toUpperCase());
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Enter Game Code</CardTitle>
        <CardDescription>
          Ask the host for the game code and enter it below:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="e.g. ABC123"
            value={gameId}
            onChange={handleInputChange}
            maxLength={6}
            className="text-center font-mono text-lg tracking-wider"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!gameId.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Checking...
              </>
            ) : (
              <>
                🎮 Join Game
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
