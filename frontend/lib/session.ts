/**
 * Session management utilities for GloryPicks frontend.
 *
 * Handles user session identification for features like watchlists and alerts.
 */

const SESSION_STORAGE_KEY = 'glorypicks-session-id';
const SESSION_TOKEN_KEY = 'glorypicks-session-token';

/**
 * Get or create a session ID for the current user.
 * The raw id is only a bootstrap value. After the first response the
 * signed token from X-Session-Token is what later requests send.
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

export function rememberSessionToken(response: Response): void {
  const token = response.headers.get('X-Session-Token');
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

export function resetSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  return {
    ...(token ? { 'X-Session-Token': token } : { 'X-Session-ID': getSessionId() }),
    'Content-Type': 'application/json',
  };
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init.headers ?? {}) },
  });
  rememberSessionToken(response);
  return response;
}

/**
 * Check if a session exists.
 *
 * @returns true if session exists, false otherwise
 */
export function hasSession(): boolean {
  return !!localStorage.getItem(SESSION_STORAGE_KEY);
}
