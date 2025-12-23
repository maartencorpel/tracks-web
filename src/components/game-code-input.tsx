'use client';

import { useState, useEffect } from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GameCodeInputProps {
  onJoin: (gameId: string) => void;
  isLoading?: boolean;
  initialGameId?: string;
}

export function GameCodeInput({ onJoin, isLoading = false, initialGameId }: GameCodeInputProps) {
  const [gameId, setGameId] = useState(initialGameId || '');
  
  // Sync with prop changes
  useEffect(() => {
    if (initialGameId) {
      setGameId(initialGameId);
    }
  }, [initialGameId]);

  const handleSubmit = () => {
    if (gameId.length === 4) {
      onJoin(gameId);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-[28px] leading-[100%]">Join Game</CardTitle>
        <CardDescription className="text-sm text-white font-light">
          Enter game code and login with Spotify to join the game
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center w-full h-[120px]">
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
              <InputOTPSlot index={0} className="flex-1 h-full text-[32px] font-semibold font-mono" />
              <InputOTPSlot index={1} className="flex-1 h-full text-[32px] font-semibold font-mono" />
              <InputOTPSlot index={2} className="flex-1 h-full text-[32px] font-semibold font-mono" />
              <InputOTPSlot index={3} className="flex-1 h-full text-[32px] font-semibold font-mono" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        <Button 
          onClick={handleSubmit}
          className="w-full rounded-[200px] text-white" 
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
      </CardContent>
    </Card>
  );
}
