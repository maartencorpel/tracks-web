import { AnalyticsEvent } from '@/types';

/**
 * Simple analytics tracking function
 * In production, you would integrate with Google Analytics, Mixpanel, etc.
 */
export function trackEvent(eventName: string, properties: Record<string, any> = {}): void {
  try {
    // Log to console for development
    console.log('Analytics:', eventName, properties);
    
    // In production, you would send to your analytics service:
    // gtag('event', eventName, properties);
    // mixpanel.track(eventName, properties);
    // amplitude.track(eventName, properties);
    
    // Or send to your own analytics endpoint:
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ event: eventName, properties, timestamp: Date.now() })
    // });
  } catch (error) {
    console.warn('Analytics error:', error);
  }
}

/**
 * Track page views
 */
export function trackPageView(page: string, gameId?: string): void {
  trackEvent('page_view', {
    page,
    game_id: gameId || null,
    timestamp: Date.now()
  });
}

/**
 * Track game-related events
 */
export function trackGameEvent(event: string, gameId: string, properties: Record<string, any> = {}): void {
  trackEvent(event, {
    game_id: gameId,
    ...properties,
    timestamp: Date.now()
  });
}

/**
 * Track OAuth events
 */
export function trackOAuthEvent(event: string, gameId: string, properties: Record<string, any> = {}): void {
  trackEvent(event, {
    game_id: gameId,
    ...properties,
    timestamp: Date.now()
  });
}

/**
 * Track errors
 */
export function trackError(error: string, context: string, gameId?: string): void {
  trackEvent('error', {
    error,
    context,
    game_id: gameId || null,
    timestamp: Date.now()
  });
}
