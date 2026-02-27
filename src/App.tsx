import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { ErrorState } from './components/ErrorState';
import { MapDashboard } from './components/MapDashboard';
import { usePharmaciesQuery, useDoctorsQuery, useVisitsQuery } from './google-sheets/useGoogleSheet';

function App() {
  const pharmacies = usePharmaciesQuery();
  const doctors = useDoctorsQuery();
  const visits = useVisitsQuery();

  // Show loading state
  if (doctors.loading || pharmacies.loading || visits.loading) {
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
          <Typography variant="h5">Cargando datos...</Typography>
          <Typography variant="body1" color="text.secondary">
            Por favor espera mientras cargamos los datos de farmacias, médicos y visitas.
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (doctors.error || pharmacies.error || visits.error) {
    const errors = [
      doctors.error && `Doctores: ${doctors.error}`,
      pharmacies.error && `Farmacias: ${pharmacies.error}`,
      visits.error && `Visitas: ${visits.error}`,
    ].filter((error): error is string => !!error);

    return <ErrorState errors={errors} />;
  }

  return (
    <MapDashboard
      pharmacies={pharmacies.data}
      doctors={doctors.data}
      visitsQuery={visits}
    />
  );
}

export default App;
