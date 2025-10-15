// Spotify OAuth configuration - these are safe to expose client-side
export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
export const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!

/**
 * Generates Spotify OAuth authorization URL with game ID in state parameter
 * 
 * OAuth 2.0 Authorization Code Flow:
 * 1. User clicks "Join with Spotify" button
 * 2. Redirect to this URL with game ID in state parameter (CSRF protection)
 * 3. User authorizes app on Spotify
 * 4. Spotify redirects back to callback URL with authorization code
 * 5. Server exchanges code for access/refresh tokens
 * 
 * @param gameId - 6-character game code to include in OAuth state
 * @returns Complete Spotify OAuth authorization URL
 */
export const getSpotifyAuthUrl = (gameId: string) => {
  // Required scopes for accessing user's Spotify data
  const scopes = 'user-top-read user-read-email user-read-private'
  
  return `https://accounts.spotify.com/authorize?` +
    `client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${gameId}` // Game ID passed in state for CSRF protection
}

export const generateSpotifyAuthUrl = getSpotifyAuthUrl


/**
 * Exchanges Spotify authorization code for access and refresh tokens
 * 
 * This function calls our secure server-side API route that handles the token exchange.
 * The client secret is kept secure on the server and never exposed to the client.
 * 
 * @param code - Authorization code from Spotify OAuth callback
 * @param redirectUri - Redirect URI used in OAuth flow (must match)
 * @returns Promise resolving to token response with access_token and refresh_token
 */
export const exchangeCodeForToken = async (code: string, redirectUri: string) => {
  const response = await fetch('/api/spotify/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

/**
 * Fetches current Spotify user profile using access token
 * 
 * @param accessToken - Valid Spotify access token
 * @returns Promise resolving to Spotify user profile object
 */
export const fetchSpotifyUser = async (accessToken: string) => {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Spotify user')
  }

  return response.json()
}