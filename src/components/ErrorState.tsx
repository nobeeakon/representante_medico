// import { useCallback } from 'react';
import { Box, Stack, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { GoogleAuth } from '../google-sheets/GoogleAuth';

export function ErrorState({ errors }: { errors: string[] }) {
  // const hanleOnAuthStateChange = useCallback((isAuth: boolean) => {
  //   if (isAuth) {
  //     window.location.reload();
  //   }
  // }, []);

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
        <GoogleAuth />
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
