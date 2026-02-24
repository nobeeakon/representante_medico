import { getAccessToken } from '../authService';

/**
 * Extract error message from gapi error object
 */
export function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  // Try to extract from gapi error structure
  if (
    'result' in error &&
    error.result &&
    typeof error.result === 'object' &&
    'error' in error.result
  ) {
    const gapiError = error.result.error as { message?: string };
    if (gapiError.message) {
      return gapiError.message;
    }
  }

  // Try standard Error properties
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  // Try statusText for HTTP errors
  if ('statusText' in error && typeof error.statusText === 'string') {
    return error.statusText;
  }

  return String(error);
}

/**
 * Ensure access token is set on gapi client
 */
export async function ensureAuthenticated(): Promise<void> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // Set the token on gapi client
  gapi.client.setToken({
    access_token: accessToken,
  });
}

/**
 * Generate a unique ID
 * Uses timestamp + random string for uniqueness
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}
