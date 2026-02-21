/**
 * TypeScript definitions for Google Identity Services
 * https://developers.google.com/identity/gsi/web/reference/js-reference
 */

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      type TokenResponse = {
        access_token: string;
        expires_in: string;
        scope: string;
        token_type: string;
        error?: string;
        error_description?: string;
        error_uri?: string;
      };

      type TokenClientConfig = {
        client_id: string;
        scope: string;
        callback: string | ((response: TokenResponse) => void);
        error_callback?: (error: { type: string; message: string }) => void;
      };

      type OverridableTokenClientConfig = {
        prompt?: '' | 'none' | 'consent' | 'select_account';
        enable_serial_consent?: boolean;
        hint?: string;
        state?: string;
      };

      type TokenClient = {
        callback: string | ((response: TokenResponse) => void);
        requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void;
      };

      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(token: string, callback?: () => void): void;
      function hasGrantedAllScopes(tokenResponse: TokenResponse, ...scopes: string[]): boolean;
      function hasGrantedAnyScope(tokenResponse: TokenResponse, ...scopes: string[]): boolean;
    }
  }
}

/**
 * Extend the Window interface to include gapi
 */
declare const gapi: typeof import('gapi').gapi;
