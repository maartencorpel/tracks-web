'use client';

import { useState } from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
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
    if (gameId.length === 6) {
      onJoin(gameId.toUpperCase());
    }
  };

  return (
    <Card className="spot-container w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Enter Game Code</CardTitle>
        <CardDescription className="text-base">
          Ask the host for the game code and enter it below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={gameId}
            onChange={(value) => setGameId(value)}
            disabled={isLoading}
            className="gap-2"
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot index={0} className="w-12 h-12 text-lg font-mono" />
              <InputOTPSlot index={1} className="w-12 h-12 text-lg font-mono" />
              <InputOTPSlot index={2} className="w-12 h-12 text-lg font-mono" />
              <InputOTPSlot index={3} className="w-12 h-12 text-lg font-mono" />
              <InputOTPSlot index={4} className="w-12 h-12 text-lg font-mono" />
              <InputOTPSlot index={5} className="w-12 h-12 text-lg font-mono" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        <Button 
          onClick={handleSubmit}
          className="w-full spot-button bg-primary hover:bg-primary/90 text-white font-semibold h-12" 
          disabled={gameId.length !== 6 || isLoading}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verifying...
            </>
          ) : (
            <>
              🎮 Join Game
            </>
          )}
        </Button>
        
        {isLoading && (
          <Alert className="border-primary/50 bg-primary/10">
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
