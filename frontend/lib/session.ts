/**
 * Session management utilities for GloryPicks frontend.
 * 
 * Handles user session identification for features like watchlists and alerts.
 */

const SESSION_STORAGE_KEY = 'glorypicks-session-id';

/**
 * Get or create a session ID for the current user.
 * This session ID persists across browser sessions and is used
 * to identify the user for features like watchlists and alerts.
 * 
 * @returns A unique session identifier
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  
  if (!sessionId) {
    // Create new session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Reset the current session ID.
 * This will create a new session on the next call to getSessionId().
 * Useful for testing or when users want to start fresh.
 * 
 * @returns void
 */
export function resetSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Get API headers including session authentication.
 * 
 * @returns Headers object with X-Session-ID
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    'X-Session-ID': getSessionId(),
    'Content-Type': 'application/json',
  };
}

/**
 * Check if a session exists.
 * 
 * @returns true if session exists, false otherwise
 */
export function hasSession(): boolean {
  return !!localStorage.getItem(SESSION_STORAGE_KEY);
}
