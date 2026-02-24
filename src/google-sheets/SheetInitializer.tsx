import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { useSheetInitialization } from './useGoogleSheet';
import { ErrorState } from '../components/ErrorState';

type SheetInitializerProps = {
  children: React.ReactNode;
};

/**
 * Wrapper component that initializes the Google Sheet before rendering children
 * Handles loading and error states, including authentication prompts
 */
export function SheetInitializer({ children }: SheetInitializerProps) {
  const { loading, error, initialized } = useSheetInitialization();

  // Show loading state while initializing
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center', maxWidth: 600, px: 2 }}>
          <CircularProgress size={60} />
          <Typography variant="h5">Inicializando...</Typography>
          <Typography variant="body1" color="text.secondary">
            Configurando la conexión con Google Sheets.
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Show error state with authentication prompt if needed
  if (error) {
    return <ErrorState errors={[error]} />;
  }

  // Render children once initialized
  if (initialized) {
    return <>{children}</>;
  }

  // Fallback (should not reach here)
  return null;
}
