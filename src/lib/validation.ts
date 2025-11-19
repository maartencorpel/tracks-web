/**
 * Input validation utilities for game codes, Spotify OAuth codes, and redirect URIs.
 * Uses custom validation logic (no external dependencies).
 */

export type ValidationResult<T = string> = {
  valid: boolean
  value: T | null
  error?: string
}

/**
 * Validates a game code (6 characters, alphanumeric, uppercase)
 */
export function validateGameCode(code: string | null | undefined): ValidationResult {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      value: null,
      error: 'Game code is required',
    }
  }

  const trimmed = code.trim().toUpperCase()

  if (trimmed.length !== 6) {
    return {
      valid: false,
      value: null,
      error: 'Game code must be exactly 6 characters',
    }
  }

  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return {
      valid: false,
      value: null,
      error: 'Game code must contain only uppercase letters and numbers',
    }
  }

  return {
    valid: true,
    value: trimmed,
  }
}

/**
 * Validates a Spotify authorization code
 */
export function validateSpotifyCode(code: string | null | undefined): ValidationResult {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      value: null,
      error: 'Authorization code is required',
    }
  }

  const trimmed = code.trim()

  if (trimmed.length === 0) {
    return {
      valid: false,
      value: null,
      error: 'Authorization code cannot be empty',
    }
  }

  if (trimmed.length > 1000) {
    return {
      valid: false,
      value: null,
      error: 'Invalid authorization code format',
    }
  }

  return {
    valid: true,
    value: trimmed,
  }
}

/**
 * Validates a redirect URI
 */
export function validateRedirectUri(uri: string | null | undefined): ValidationResult {
  if (!uri || typeof uri !== 'string') {
    return {
      valid: false,
      value: null,
      error: 'Redirect URI is required',
    }
  }

  const trimmed = uri.trim()

  if (trimmed.length === 0) {
    return {
      valid: false,
      value: null,
      error: 'Redirect URI cannot be empty',
    }
  }

  try {
    const url = new URL(trimmed)
    
    // Spotify requires HTTPS only (HTTP redirect URIs deprecated as of Nov 2025)
    if (url.protocol !== 'https:') {
      return {
        valid: false,
        value: null,
        error: 'Redirect URI must use HTTPS protocol (HTTP is no longer supported)',
      }
    }

    return {
      valid: true,
      value: trimmed,
    }
  } catch {
    return {
      valid: false,
      value: null,
      error: 'Invalid redirect URI format',
    }
  }
}

