/**
 * Google OAuth Authentication Utility
 *
 * Uses Google Identity Services (GIS) for OAuth 2.0 authentication.
 * auth/drive.file scope - app only accesses files it creates.
 */

// Environment configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = import.meta.env.VITE_GOOGLE_SCOPES;

// LocalStorage keys for token persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_access_token',
  EXPIRES_AT: 'google_token_expires_at',
  SHEET_ID: 'google_sheet_id',
} as const;

// Global references
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let initPromise: Promise<void> | null = null;

type TokenResponse = google.accounts.oauth2.TokenResponse;

/**
 * Wait for a global object to be available
 */
function waitForGlobal(name: string, check: () => boolean, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      if (check()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error(`Timeout waiting for ${name} to load`));
      }
    }, 100);
  });
}

/**
 * Initialize Google API client and OAuth
 * Must be called before any other auth operations
 * Safe to call multiple times - returns existing initialization promise if already in progress
 */
export async function initializeGoogleApi(): Promise<void> {
  // Return existing initialization promise if already initializing
  if (initPromise) {
    return initPromise;
  }

  // Return immediately if already initialized
  if (gapiInited && gisInited) {
    return Promise.resolve();
  }

  // Start new initialization
  initPromise = new Promise(async (resolve, reject) => {
    // Wait for both gapi and GIS to load
    const checkReady = () => {
      if (gapiInited && gisInited) {
        resolve();
      }
    };

    try {
      // Wait for gapi to be available
      await waitForGlobal('gapi', () => typeof gapi !== 'undefined');

      // Initialize gapi client
      gapi.load('client', async () => {
        try {
          // Initialize gapi client without discovery docs
          await gapi.client.init({});

          // Load the Sheets API and Drive API
          await gapi.client.load('sheets', 'v4');
          await gapi.client.load('drive', 'v3');

          gapiInited = true;
          console.log('Google API client initialized with Sheets API v4 and Drive API v3');
          checkReady();
        } catch (error) {
          console.error('Error initializing Google API client:', error);
          reject(error);
        }
      });

      // Wait for Google Identity Services to be available
      await waitForGlobal(
        'Google Identity Services',
        () => typeof google !== 'undefined' && google.accounts?.oauth2 !== undefined
      );

      // Initialize GIS token client
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Will be set dynamically
      });
      gisInited = true;
      console.log('Google Identity Services initialized');
      checkReady();
    } catch (error) {
      console.error('Error during initialization:', error);
      initPromise = null; // Reset on error so it can be retried
      reject(error);
    }
  });

  return initPromise;
}

/**
 * Sign in with Google OAuth
 * Opens OAuth popup and stores tokens in localStorage
 */
export async function signIn(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Auth not initialized'));
      return;
    }

    // Set the callback for this specific request
    tokenClient.callback = async (response: TokenResponse) => {
      if (response.error) {
        console.error('Error during sign in:', response);
        reject(new Error(response.error));
        return;
      }

      // Store token
      const expiresAt = Date.now() + (parseInt(response.expires_in) * 1000);
      storeTokens(response.access_token, expiresAt);

      // Set token for gapi client
      gapi.client.setToken({
        access_token: response.access_token,
      });

      console.log('User signed in successfully');
      resolve();
    };

    // Check if we have an existing valid token
    const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

    if (storedToken && expiresAt && Date.now() < parseInt(expiresAt)) {
      // Use existing token
      gapi.client.setToken({ access_token: storedToken });
      resolve();
      return;
    }

    // Request new token
    // prompt: '' means don't prompt if user already granted consent
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Sign out and clear stored tokens
 */
export async function signOut(): Promise<void> {
  try {
    const token = gapi.client.getToken();
    if (token) {
      google.accounts.oauth2.revoke(token.access_token, () => {
        console.log('Token revoked');
      });
      gapi.client.setToken(null);
    }

    clearStoredTokens();
    console.log('User signed out successfully');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
  const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!storedToken || !expiresAt) {
    return false;
  }

  // Check if token is still valid
  const now = Date.now();
  const expires = parseInt(expiresAt, 10);

  return now < expires;
}

/**
 * Get current access token, refreshing if necessary
 */
export async function getAccessToken(): Promise<string | null> {
  const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!storedToken || !expiresAt) {
    return null;
  }

  const now = Date.now();
  const expires = parseInt(expiresAt, 10);

  // Token still valid
  if (now < expires) {
    return storedToken;
  }

  // Token expired - need to request new one
  console.log('Token expired, requesting new token...');
  try {
    await signIn(); // This will prompt for new token
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Store Sheet ID in localStorage
 */
export function storeSheetId(sheetId: string): void {
  localStorage.setItem(STORAGE_KEYS.SHEET_ID, sheetId);
}

/**
 * Get stored Sheet ID
 */
export function getStoredSheetId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.SHEET_ID);
}

/**
 * Clear stored Sheet ID
 */
export function clearSheetId(): void {
  localStorage.removeItem(STORAGE_KEYS.SHEET_ID);
}

// Private helper functions

/**
 * Store OAuth tokens in localStorage
 */
function storeTokens(accessToken: string, expiresAt: number): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
}

/**
 * Clear all stored tokens and data
 */
function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  localStorage.removeItem(STORAGE_KEYS.SHEET_ID);
}
