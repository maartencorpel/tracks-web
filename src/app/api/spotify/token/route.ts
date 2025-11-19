import { NextRequest, NextResponse } from 'next/server';
import { TokenData } from '@/types';
import { rateLimit } from '@/lib/rate-limit';
import { validateSpotifyCode, validateRedirectUri } from '@/lib/validation';


const RAW_ALLOWED_REDIRECTS = (process.env.SPOTIFY_REDIRECT_URI_ALLOWLIST || process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || '').split(',');
const ALLOWED_REDIRECT_URIS = RAW_ALLOWED_REDIRECTS.map((uri) => uri.trim()).filter(Boolean);
/**
 * Spotify OAuth Token Exchange API Route
 * 
 * This secure server-side API route exchanges Spotify authorization codes for access tokens.
 * It keeps the Spotify client secret secure and never exposes it to the client.
 * 
 * OAuth 2.0 Authorization Code Flow:
 * 1. Client receives authorization code from Spotify
 * 2. Client sends code to this endpoint with redirect URI
 * 3. This endpoint exchanges code for access/refresh tokens using client secret
 * 4. Returns tokens to client for further Spotify API calls
 * 
 * Security:
 * - Client secret is stored in server environment variables
 * - Never exposed to client-side code
 * - Validates redirect URI matches expected value
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
    const codeResult = validateSpotifyCode(body?.code ?? null);
    const redirectResult = validateRedirectUri(body?.redirect_uri ?? null);

    if (!codeResult.valid || !codeResult.value) {
      return NextResponse.json(
        { error: codeResult.error || 'Invalid authorization code.' },
        { status: 400 }
      );
    }

    if (!redirectResult.valid || !redirectResult.value) {
      return NextResponse.json(
        { error: redirectResult.error || 'Invalid redirect URI.' },
        { status: 400 }
      );
    }

    const code = codeResult.value;
    const redirect_uri = redirectResult.value;

    if (ALLOWED_REDIRECT_URIS.length > 0 && !ALLOWED_REDIRECT_URIS.includes(redirect_uri)) {
      return NextResponse.json(
        { error: 'Redirect URI is not allowed.' },
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

    // Exchange authorization code for access and refresh tokens
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
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Spotify token exchange failed:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to exchange authorization code for access token',
          details: errorData
        },
        { status: 400 }
      );
    }

    const tokenData: TokenData = await tokenResponse.json();

    // Return tokens to client (access_token, refresh_token, expires_in, etc.)
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
