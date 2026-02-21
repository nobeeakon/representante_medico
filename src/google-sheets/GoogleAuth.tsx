import { useState, useEffect } from 'react';
import { Box, Button, Alert, CircularProgress, Link, Stack } from '@mui/material';
import { Logout as LogoutIcon, TableChart as TableChartIcon } from '@mui/icons-material';
import { initializeGoogleApi, signIn, signOut, isAuthenticated } from './authService';
import { getSheetUrl } from './googleSheetsService';

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          Initializing...
        </Box>
      </Box>
    );
  }

  if (state.status === 'loading') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Box>
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {state.status === 'authenticated' ? (
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ color: 'success.main', fontSize: '0.875rem', fontWeight: 500 }}>
            ✓ Connected
          </Box>
          {state.sheetUrl && (
            <Link
              href={state.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ fontSize: '0.875rem' }}
            >
              View Sheet
            </Link>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
          >
            Logout
          </Button>
        </Stack>
      ) : (
        <Button
          variant="contained"
          startIcon={<TableChartIcon />}
          onClick={handleSignIn}
        >
          Connect to Google Sheets
        </Button>
      )}
    </Box>
  );
}
