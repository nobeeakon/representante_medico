import { useState, useEffect } from 'react';
import { initializeGoogleApi, signIn, signOut, isAuthenticated } from './authService';
import { getSheetUrl } from './googleSheetsService';
import './GoogleAuth.css';

type AuthState = {
  status: 'initializing' | 'unauthenticated' | 'authenticated' | 'loading' | 'error';
  sheetUrl: string | null;
  error: string | null;
};

export function GoogleAuth({ onAuthStateChange }: { onAuthStateChange?: (isAuthenticated: boolean) => void }) {
  const [state, setState] = useState<AuthState>({
    status: 'initializing',
    sheetUrl: null,
    error: null,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeGoogleApi();
        const authStatus = isAuthenticated();

        setState({
          status: authStatus ? 'authenticated' : 'unauthenticated',
          sheetUrl: authStatus ? getSheetUrl() : null,
          error: null,
        });

        onAuthStateChange?.(authStatus);
      } catch (err) {
        console.error('Failed to initialize Google API:', err);
        setState({
          status: 'error',
          sheetUrl: null,
          error: 'Failed to initialize Google API. Please refresh the page.',
        });
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async () => {
    setState({ ...state, status: 'loading', error: null });

    try {
      await signIn();
      const sheetUrl = getSheetUrl();

      setState({
        status: 'authenticated',
        sheetUrl,
        error: null,
      });

      onAuthStateChange?.(true);
    } catch (err) {
      console.error('Sign in failed:', err);
      setState({
        status: 'error',
        sheetUrl: null,
        error: 'Failed to sign in. Please try again.',
      });
    }
  };

  const handleSignOut = async () => {
    setState({ ...state, status: 'loading', error: null });

    try {
      await signOut();
      onAuthStateChange?.(false);
      window.location.reload();
    } catch (err) {
      console.error('Sign out failed:', err);
      setState({
        ...state,
        status: 'error',
        error: 'Failed to sign out. Please try again.',
      });
    }
  };

  if (state.status === 'initializing') {
    return (
      <div className="google-auth">
        <div className="google-auth-loading">
          <span>Initializing...</span>
        </div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="google-auth">
        <div className="google-auth-loading">
          <span>...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="google-auth">
      {state.error && (
        <div className="google-auth-error">
          <span>⚠️ {state.error}</span>
        </div>
      )}

      {state.status === 'authenticated' ? (
        <div className="google-auth-connected">
          <span className="google-auth-status">✓ Connected</span>
          {state.sheetUrl && (
            <a
              href={state.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="google-auth-link"
            >
              View Sheet
            </a>
          )}
          <button
            className="google-auth-button google-auth-signout"
            onClick={handleSignOut}
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          className="google-auth-button google-auth-signin"
          onClick={handleSignIn}
        >
          📊 Connect to Google Sheets
        </button>
      )}
    </div>
  );
}
