import { Box, Stack, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { GoogleAuth } from '../google-sheets/GoogleAuth';

const getIsAuthError = (error: string) =>
  error.includes('Not authenticated') || error.includes('Failed to initialize Google API');

export function ErrorState({ errors }: { errors: string[] }) {
  const isAuthError = errors.some((error) => getIsAuthError(error));

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
        <Typography variant="h5" color="error">
          Error al Cargar Datos
        </Typography>
        <Alert severity="error" sx={{ width: '100%' }}>
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </Alert>
          <GoogleAuth
            onAuthStateChange={(isAuth) => {
              if (isAuth) {
                window.location.reload();
              }
            }}
          />
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          startIcon={<RefreshIcon />}
        >
          Reintentar
        </Button>
      </Stack>
    </Box>
  );
}
