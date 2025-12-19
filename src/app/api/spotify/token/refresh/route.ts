import { NextRequest, NextResponse } from 'next/server';
import { TokenData } from '@/types';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Spotify Token Refresh API Route
 * 
 * This secure server-side API route exchanges refresh tokens for new access tokens.
 * It keeps the Spotify client secret secure and never exposes it to the client.
 * 
 * OAuth 2.0 Refresh Token Flow:
 * 1. Client sends refresh token to this endpoint
 * 2. This endpoint exchanges refresh token for new access/refresh tokens using client secret
 * 3. Returns new tokens to client for further Spotify API calls
 * 
 * Security:
 * - Client secret is stored in server environment variables
 * - Never exposed to client-side code
 * - Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP from headers (Next.js 15 doesn't have request.ip)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const identifier =
      forwardedFor?.split(',')[0]?.trim() ||
      realIp ||
      'unknown';

    if (!rateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const refreshToken = body?.refresh_token;

    // Validate refresh token
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid refresh token.' },
        { status: 400 }
      );
    }

    // Get Spotify OAuth credentials from environment variables
    const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    
    // Validate environment variables are configured
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      console.error('Spotify environment variables not set:', {
        CLIENT_ID: !!SPOTIFY_CLIENT_ID,
        CLIENT_SECRET: !!SPOTIFY_CLIENT_SECRET
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Exchange refresh token for new access and refresh tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Basic auth with client ID and secret (base64 encoded)
        'Authorization': `Basic ${Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Spotify token refresh failed:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to refresh access token',
          details: errorData
        },
        { status: 400 }
      );
    }

    const tokenData: TokenData = await tokenResponse.json();

    // Return tokens to client (access_token, refresh_token if provided, expires_in, etc.)
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token, // Spotify may or may not return a new refresh token
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
