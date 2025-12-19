/**
 * Application Constants
 * 
 * Centralized constants for the application to avoid magic numbers
 * and make configuration easier to maintain.
 */

// Question Selection
export const MINIMUM_QUESTIONS = 5;

// Search Configuration
export const SEARCH_DEBOUNCE_MS = 400;
export const MIN_SEARCH_LENGTH = 2;
export const SPOTIFY_SEARCH_LIMIT = 20;

// Track Filtering
export const PAST_YEAR_FILTER = 1;

// UI Timing
export const AUTO_CLOSE_DELAY_MS = 10000;

// Caching
export const QUESTIONS_CACHE_TTL_MS = 3600000; // 1 hour

// Retry Logic
export const MAX_RETRY_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY_MS = 1000;
