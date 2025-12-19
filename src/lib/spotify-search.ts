/**
 * Spotify Track Search Utilities
 * 
 * Provides functions for searching Spotify tracks and filtering by release year.
 * Used for question-based track selection where players select tracks from the past year.
 */

import { SPOTIFY_SEARCH_LIMIT, PAST_YEAR_FILTER, MAX_RETRY_ATTEMPTS, INITIAL_RETRY_DELAY_MS } from '@/lib/constants'

/**
 * Spotify API response types
 */
interface SpotifyApiTrack {
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

interface SpotifyApiSearchResponse {
  tracks: {
    items: SpotifyApiTrack[]
  }
}

/**
 * Helper function to calculate exponential backoff delay
 * 
 * @param attempt - Current retry attempt (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds
 * @returns Delay in milliseconds for this attempt
 */
function calculateBackoffDelay(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * Math.pow(2, attempt)
}

/**
 * Retries a function with exponential backoff on rate limit errors
 * 
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of retry attempts
 * @param baseDelayMs - Base delay in milliseconds for exponential backoff
 * @returns Promise resolving to the function result
 * @throws Error if all retries are exhausted
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

export interface SpotifyTrack {
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
 * Searches Spotify API for tracks matching the query
 * 
 * @param query - Search query string
 * @param accessToken - Valid Spotify access token
 * @returns Promise resolving to array of Spotify tracks
 * @throws Error if API call fails, token is invalid, or rate limit is exceeded
 */
export async function searchTracks(
  query: string,
  accessToken: string
): Promise<SpotifyTrack[]> {
  if (!query || query.trim().length === 0) {
    return []
  }

  const performSearch = async (): Promise<SpotifyTrack[]> => {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${SPOTIFY_SEARCH_LIMIT}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

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

    const data: SpotifyApiSearchResponse = await response.json()

    if (!data.tracks || !data.tracks.items) {
      return []
    }

    // Map Spotify API response to our SpotifyTrack interface
    return data.tracks.items.map((track: SpotifyApiTrack) => ({
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
  }

  try {
    // Retry with exponential backoff on rate limit errors
    return await retryWithBackoff(performSearch)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to search Spotify tracks')
  }
}

/**
 * Checks if a track was released within the specified number of years
 * 
 * @param track - Spotify track to check
 * @param yearsAgo - Number of years to look back (default: 1)
 * @returns true if track is within date range, false otherwise
 */
export function isTrackFromPastYear(
  track: SpotifyTrack,
  yearsAgo: number = PAST_YEAR_FILTER
): boolean {
  if (yearsAgo <= 0) {
    return true
  }

  if (!track.album.release_date) {
    return false
  }

  try {
    const cutoffDate = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsAgo)

    // Parse release_date (format: YYYY-MM-DD, YYYY-MM, or YYYY)
    const releaseDate = new Date(track.album.release_date)
    
    // Check if date is valid
    if (isNaN(releaseDate.getTime())) {
      return false
    }

    // Check if track was released on or after the cutoff date
    return releaseDate >= cutoffDate
  } catch (error) {
    // If date parsing fails, exclude the track
    return false
  }
}

/**
 * Filters tracks to those released within the specified number of years
 * 
 * @param tracks - Array of Spotify tracks to filter
 * @param yearsAgo - Number of years to look back (default: 1)
 * @returns Filtered array of tracks from the past year(s)
 */
export function filterTracksByYear(
  tracks: SpotifyTrack[],
  yearsAgo: number = PAST_YEAR_FILTER
): SpotifyTrack[] {
  if (yearsAgo <= 0) {
    return tracks
  }

  return tracks.filter((track) => isTrackFromPastYear(track, yearsAgo))
}

/**
 * Convenience function that searches tracks and filters by year in one call
 * 
 * @param query - Search query string
 * @param accessToken - Valid Spotify access token
 * @param yearsAgo - Number of years to look back (default: 1)
 * @returns Promise resolving to filtered array of tracks from the past year(s)
 */
export async function searchTracksByYear(
  query: string,
  accessToken: string,
  yearsAgo: number = PAST_YEAR_FILTER
): Promise<SpotifyTrack[]> {
  const tracks = await searchTracks(query, accessToken)
  return filterTracksByYear(tracks, yearsAgo)
}

/**
 * Converts a PlayerAnswerWithQuestion to SpotifyTrack format for display
 * 
 * Used to convert stored answers back to the format expected by track selection components.
 * 
 * @param answer - PlayerAnswerWithQuestion object from database
 * @returns SpotifyTrack object
 */
export function convertAnswerToTrack(answer: {
  track_id: string
  track_name: string
  artist_name: string
  album_name: string
  album_image_url: string | null
  release_year: string | null
  external_url: string
  preview_url: string | null
}): SpotifyTrack {
  return {
    id: answer.track_id,
    name: answer.track_name,
    artists: [{ name: answer.artist_name }],
    album: {
      name: answer.album_name,
      images: answer.album_image_url ? [{ url: answer.album_image_url }] : [],
      release_date: answer.release_year ? `${answer.release_year}-01-01` : '',
    },
    external_urls: { spotify: answer.external_url },
    preview_url: answer.preview_url,
  }
}
