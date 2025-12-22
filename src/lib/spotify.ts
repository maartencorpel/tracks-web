// Spotify OAuth configuration - these are safe to expose client-side
export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
export const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!

import { SpotifyTrack } from './spotify-search'
import { MAX_RETRY_ATTEMPTS, INITIAL_RETRY_DELAY_MS } from './constants'

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
 * @param gameId - 4-character game code to include in OAuth state
 * @returns Complete Spotify OAuth authorization URL
 */
export const getSpotifyAuthUrl = (gameId: string) => {
  // Required scopes for accessing user's Spotify data
  const scopes = [
    'user-top-read',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-modify-private',
    'user-library-read',
  ].join(' ')
  
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

/**
 * Refreshes an expired Spotify access token using a refresh token
 * 
 * This function calls our secure server-side API route that handles the token refresh.
 * The client secret is kept secure on the server and never exposed to the client.
 * 
 * @param refreshToken - Spotify refresh token
 * @returns Promise resolving to token response with new access_token and optionally new refresh_token
 */
export const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch('/api/spotify/token/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to refresh token' }))
    throw new Error(errorData.error || 'Failed to refresh access token')
  }

  return response.json()
}

/**
 * Helper function to calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * Math.pow(2, attempt)
}

/**
 * Retries a function with exponential backoff on rate limit errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  baseDelayMs: number = INITIAL_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      // Only retry on 429 (rate limit) errors
      if (!lastError.message.includes('429') && !lastError.message.includes('rate limit')) {
        throw lastError
      }

      // Don't wait after the last attempt
      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoffDelay(attempt, baseDelayMs)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('All retry attempts exhausted')
}

/**
 * Spotify API response types for saved tracks
 */
interface SpotifyApiSavedTrack {
  track: {
    id: string
    name: string
    artists: Array<{ name: string }>
    album: {
      name: string
      images: Array<{ url: string }>
      release_date: string
    }
    external_urls: { spotify: string }
    preview_url: string | null
  }
}

interface SpotifyApiSavedTracksResponse {
  items: SpotifyApiSavedTrack[]
  next: string | null
}

/**
 * Spotify API response types for top tracks
 */
interface SpotifyApiTopTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
    release_date: string
  }
  external_urls: { spotify: string }
  preview_url: string | null
}

interface SpotifyApiTopTracksResponse {
  items: SpotifyApiTopTrack[]
  next: string | null
}

/**
 * Spotify API response type for single track
 */
interface SpotifyApiTrackResponse {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
    release_date: string
  }
  external_urls: { spotify: string }
  preview_url: string | null
}

/**
 * Fetches user's saved tracks from Spotify
 * 
 * @param accessToken - Valid Spotify access token
 * @param limit - Maximum number of tracks to fetch (default: 50)
 * @returns Promise resolving to array of Spotify tracks
 * @throws Error if API call fails, token is invalid, or rate limit is exceeded
 */
export async function fetchSavedTracks(
  accessToken: string,
  limit: number = 50
): Promise<SpotifyTrack[]> {
  const performFetch = async (): Promise<SpotifyTrack[]> => {
    const tracks: SpotifyTrack[] = []
    let url: string | null = `https://api.spotify.com/v1/me/tracks?limit=50`

    while (url && tracks.length < limit) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Spotify access token expired. Please re-authenticate.')
        }
        if (response.status === 429) {
          throw new Error(
            'Spotify API rate limit exceeded. Please wait a moment and try again.'
          )
        }
        const errorText = await response.text()
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}. ${errorText}`
        )
      }

      const data: SpotifyApiSavedTracksResponse = await response.json()

      if (!data.items) {
        break
      }

      // Map Spotify API response to our SpotifyTrack format
      const mappedTracks = data.items.map((item: SpotifyApiSavedTrack) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists || [],
        album: {
          name: item.track.album?.name || '',
          images: item.track.album?.images || [],
          release_date: item.track.album?.release_date || '',
        },
        external_urls: item.track.external_urls || { spotify: '' },
        preview_url: item.track.preview_url || null,
      }))

      tracks.push(...mappedTracks)
      url = data.next
    }

    // Return only up to the requested limit
    return tracks.slice(0, limit)
  }

  try {
    return await retryWithBackoff(performFetch)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch saved tracks')
  }
}

/**
 * Fetches user's top tracks from Spotify
 * 
 * @param accessToken - Valid Spotify access token
 * @param limit - Maximum number of tracks to fetch (default: 100)
 * @returns Promise resolving to array of Spotify tracks
 * @throws Error if API call fails, token is invalid, or rate limit is exceeded
 */
export async function fetchTopTracks(
  accessToken: string,
  limit: number = 100
): Promise<SpotifyTrack[]> {
  const performFetch = async (): Promise<SpotifyTrack[]> => {
    const tracks: SpotifyTrack[] = []
    const requestsNeeded = Math.ceil(limit / 50) // Spotify max is 50 per request
    const timeRange = 'medium_term' // 6 months

    for (let offset = 0; offset < requestsNeeded * 50 && tracks.length < limit; offset += 50) {
      const requestLimit = Math.min(50, limit - tracks.length)
      const url = `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${requestLimit}&offset=${offset}`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Spotify access token expired. Please re-authenticate.')
        }
        if (response.status === 429) {
          throw new Error(
            'Spotify API rate limit exceeded. Please wait a moment and try again.'
          )
        }
        const errorText = await response.text()
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}. ${errorText}`
        )
      }

      const data: SpotifyApiTopTracksResponse = await response.json()

      if (!data.items) {
        break
      }

      // Map Spotify API response to our SpotifyTrack format
      const mappedTracks = data.items.map((track: SpotifyApiTopTrack) => ({
        id: track.id,
        name: track.name,
        artists: track.artists || [],
        album: {
          name: track.album?.name || '',
          images: track.album?.images || [],
          release_date: track.album?.release_date || '',
        },
        external_urls: track.external_urls || { spotify: '' },
        preview_url: track.preview_url || null,
      }))

      tracks.push(...mappedTracks)
    }

    return tracks.slice(0, limit)
  }

  try {
    return await retryWithBackoff(performFetch)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch top tracks')
  }
}

/**
 * Fetches a single track by ID from Spotify
 * 
 * @param accessToken - Valid Spotify access token
 * @param trackId - Spotify track ID
 * @returns Promise resolving to Spotify track
 * @throws Error if API call fails, token is invalid, track not found, or rate limit is exceeded
 */
export async function fetchTrackById(
  accessToken: string,
  trackId: string
): Promise<SpotifyTrack> {
  const performFetch = async (): Promise<SpotifyTrack> => {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Spotify access token expired. Please re-authenticate.')
      }
      if (response.status === 404) {
        throw new Error('Track not found. Please check the URL.')
      }
      if (response.status === 429) {
        throw new Error(
          'Spotify API rate limit exceeded. Please wait a moment and try again.'
        )
      }
      const errorText = await response.text()
      throw new Error(
        `Spotify API error: ${response.status} ${response.statusText}. ${errorText}`
      )
    }

    const track: SpotifyApiTrackResponse = await response.json()

    // Map Spotify API response to our SpotifyTrack format
    return {
      id: track.id,
      name: track.name,
      artists: track.artists || [],
      album: {
        name: track.album?.name || '',
        images: track.album?.images || [],
        release_date: track.album?.release_date || '',
      },
      external_urls: track.external_urls || { spotify: '' },
      preview_url: track.preview_url || null,
    }
  }

  try {
    return await retryWithBackoff(performFetch)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch track')
  }
}

/**
 * Extracts track ID from various Spotify URL formats
 * 
 * Handles formats:
 * - https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
 * - spotify:track:4iV5W9uYEdYUVa79Axb7Rh
 * - Just the track ID (22 alphanumeric characters)
 * 
 * @param url - Spotify URL or track ID
 * @returns Track ID if valid, null otherwise
 */
export function extractTrackIdFromUrl(url: string): string | null {
  // Handle open.spotify.com format: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  const openSpotifyMatch = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
  if (openSpotifyMatch) {
    return openSpotifyMatch[1]
  }

  // Handle spotify:track: format: spotify:track:4iV5W9uYEdYUVa79Axb7Rh
  const uriMatch = url.match(/spotify:track:([a-zA-Z0-9]+)/)
  if (uriMatch) {
    return uriMatch[1]
  }

  // Handle just the track ID (if user pastes just the ID)
  if (/^[a-zA-Z0-9]{22}$/.test(url.trim())) {
    return url.trim()
  }

  return null
}