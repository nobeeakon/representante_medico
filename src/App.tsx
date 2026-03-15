import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { ErrorState } from './components/ErrorState';
import { MapDashboard } from './components/MapDashboard';
import {
  usePharmaciesQuery,
  useDoctorsQuery,
  useVisitsQuery,
  useProductosQuery,
} from './google-sheets/useGoogleSheet';

function App() {
  const pharmacies = usePharmaciesQuery();
  const doctors = useDoctorsQuery();
  const visits = useVisitsQuery();
  const productos = useProductosQuery();

  // Show loading state
  if (doctors.loading || pharmacies.loading || visits.loading || productos.loading) {
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
            Por favor espera mientras cargamos los datos de farmacias, médicos, visitas y productos.
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (doctors.error || pharmacies.error || visits.error || productos.error) {
    const errors = [
      doctors.error && `Doctores: ${doctors.error}`,
      pharmacies.error && `Farmacias: ${pharmacies.error}`,
      visits.error && `Visitas: ${visits.error}`,
      productos.error && `Productos: ${productos.error}`,
    ].filter((error): error is string => !!error);

    return <ErrorState errors={errors} />;
  }

  return (
    <MapDashboard
      pharmaciesQuery={pharmacies}
      doctorsQuery={doctors}
      visitsQuery={visits}
      productosQuery={productos}
    />
  );
}

export default App;
