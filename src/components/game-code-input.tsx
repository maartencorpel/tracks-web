'use client';

import { useState } from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GameCodeInputProps {
  onJoin: (gameId: string) => void;
  isLoading?: boolean;
}

export function GameCodeInput({ onJoin, isLoading = false }: GameCodeInputProps) {
  const [gameId, setGameId] = useState('');

  const handleSubmit = () => {
    if (gameId.length === 4) {
      onJoin(gameId);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Join Game</CardTitle>
        <CardDescription className="text-base">
          Enter game code and login with Spotify to join the game
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center w-full h-full">
          <InputOTP
            maxLength={4}
            value={gameId}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            onChange={(value) => setGameId(value)}
            disabled={isLoading}
            containerClassName="flex items-center has-[:disabled]:opacity-50 w-full h-full"
          >
            <InputOTPGroup className="w-full">
              <InputOTPSlot index={0} className="flex-1 h-full text-lg font-mono" />
              <InputOTPSlot index={1} className="flex-1 h-full text-lg font-mono" />
              <InputOTPSlot index={2} className="flex-1 h-full text-lg font-mono" />
              <InputOTPSlot index={3} className="flex-1 h-full text-lg font-mono" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        <Button 
          onClick={handleSubmit}
          className="w-full" 
          disabled={gameId.length !== 4 || isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verifying...
            </>
          ) : (
            <>
              Login with Spotify
            </>
          )}
        </Button>
        
        {isLoading && (
          <Alert>
            <AlertDescription className="text-center flex items-center justify-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Verifying game code...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
