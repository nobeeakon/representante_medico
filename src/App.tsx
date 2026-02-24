import { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Checkbox,
  FormControlLabel,
  Stack,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
} from '@mui/material';
import { MapView } from './components/Map';
import { ErrorState } from './components/ErrorState';
import { BrickFilter, NO_BRICK } from './components/BrickFilter';
import { usePharmaciesQuery, useDoctorsQuery } from './google-sheets/useGoogleSheet';
import { GoogleAuth } from './google-sheets/GoogleAuth';

type SelectedEntity = {
  type: 'farmacia' | 'medico';
  id: string;
};

function App() {
  const pharmacies = usePharmaciesQuery();
  const doctors = useDoctorsQuery();
  const [selectedBricks, setSelectedBricks] = useState<string[]>([]);
  const [showFarmacias, setShowFarmacias] = useState<boolean>(true);
  const [showMedicos, setShowMedicos] = useState<boolean>(true);
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([]);

  // Handler to toggle entity selection
  const toggleEntitySelection = (entity: SelectedEntity) => {
    setSelectedEntities((prev) => {
      const isSelected = prev.some((e) => e.type === entity.type && e.id === entity.id);
      if (isSelected) {
        // Remove from selection
        return prev.filter((e) => !(e.type === entity.type && e.id === entity.id));
      } else {
        // Add to selection
        return [...prev, entity];
      }
    });
  };

  // Get unique brick names from both farmacias and medicos
  const availableBricks = useMemo(() => {
    const brickSet = new Set<string>();
    let hasUndefinedBrick = false;

    pharmacies.data.forEach((farmacia) => {
      if (farmacia.nombreBrick) {
        brickSet.add(farmacia.nombreBrick);
      } else {
        hasUndefinedBrick = true;
      }
    });

    doctors.data.forEach((medico) => {
      if (medico.nombreBrick) {
        brickSet.add(medico.nombreBrick);
      } else {
        hasUndefinedBrick = true;
      }
    });

    const bricksArray = Array.from(brickSet).sort();

    // Add "No Brick" option at the end if there are entries without bricks
    if (hasUndefinedBrick) {
      bricksArray.push(NO_BRICK);
    }

    return bricksArray;
  }, [pharmacies.data, doctors.data]);

  // Filter farmacias and medicos based on selected bricks and visibility toggles
  const filteredFarmacias = useMemo(() => {
    if (!showFarmacias) {
      return [];
    }
    if (selectedBricks.length === 0) {
      return pharmacies.data;
    }
    return pharmacies.data.filter((farmacia) => {
      // Check if NO_BRICK is selected and this farmacia has no brick
      if (selectedBricks.includes(NO_BRICK) && !farmacia.nombreBrick) {
        return true;
      }
      // Check if this farmacia's brick is in the selected list
      return farmacia.nombreBrick && selectedBricks.includes(farmacia.nombreBrick);
    });
  }, [pharmacies.data, selectedBricks, showFarmacias]);

  const filteredMedicos = useMemo(() => {
    if (!showMedicos) {
      return [];
    }
    if (selectedBricks.length === 0) {
      return doctors.data;
    }
    return doctors.data.filter((medico) => {
      // Check if NO_BRICK is selected and this medico has no brick
      if (selectedBricks.includes(NO_BRICK) && !medico.nombreBrick) {
        return true;
      }
      // Check if this medico's brick is in the selected list
      return medico.nombreBrick && selectedBricks.includes(medico.nombreBrick);
    });
  }, [doctors.data, selectedBricks, showMedicos]);

  // Get full entity data for selected entities (in selection order)
  const selectedEntitiesWithData = useMemo(() => {
    let farmaciasCount = 0;
    let medicosCount = 0;

    const allData = selectedEntities
      .map((e) => {
        if (e.type === 'farmacia') {
          const farmacia = pharmacies.data.find((f) => f.id === e.id);
          if (farmacia) {
            farmaciasCount++;
            return { type: 'farmacia' as const, data: farmacia };
          }
        } else {
          const medico = doctors.data.find((m) => m.id === e.id);
          if (medico) {
            medicosCount++;
            return { type: 'medico' as const, data: medico };
          }
        }
        return null;
      })
      .filter(
        (
          item
        ): item is {
          type: 'farmacia' | 'medico';
          data: (typeof pharmacies.data)[0] | (typeof doctors.data)[0];
        } => item !== null
      );

    return {
      all: allData,
      farmaciasCount,
      medicosCount,
    };
  }, [selectedEntities, pharmacies.data, doctors.data]);

  // Show loading state
  if (doctors.loading || doctors.loading) {
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
            Por favor espera mientras cargamos los datos de farmacias y médicos.
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (doctors.error || pharmacies.error) {
    const errors = [
      doctors.error && `Doctores: ${doctors.error}`,
      pharmacies.error && `Farmacias: ${pharmacies.error}`,
    ].filter((error): error is string => !!error);

    return <ErrorState errors={errors} />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Mapa de Farmacias y Médicos
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <GoogleAuth />
          </Box>
        </Box>

        {/* Brick Filter */}
        <BrickFilter bricks={availableBricks} value={selectedBricks} onChange={setSelectedBricks} />

        {/* Visibility Toggles */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showFarmacias}
                onChange={(e) => setShowFarmacias(e.target.checked)}
                sx={{ color: 'success.main', '&.Mui-checked': { color: 'success.main' } }}
              />
            }
            label={
              <Typography
                sx={{ fontWeight: showFarmacias ? 'bold' : 'normal', color: 'success.main' }}
              >
                ● Farmacias
              </Typography>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={showMedicos}
                onChange={(e) => setShowMedicos(e.target.checked)}
                sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
              />
            }
            label={
              <Typography
                sx={{ fontWeight: showMedicos ? 'bold' : 'normal', color: 'primary.main' }}
              >
                ● Médicos
              </Typography>
            }
          />
        </Box>

        {/* Stats */}
        <Stack spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Mostrando ({filteredFarmacias.length}/{pharmacies.data.length}) farmacia
            {filteredFarmacias.length !== 1 ? 's' : ''} y ({filteredMedicos.length}/
            {doctors.data.length}) médico{filteredMedicos.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>

        {/* Map */}
        <Box>
          <MapView
            farmacias={filteredFarmacias}
            medicos={filteredMedicos}
            selectedEntities={selectedEntities}
            onToggleSelection={toggleEntitySelection}
          />
        </Box>

        {/* Selected Entities Table */}
        {selectedEntitiesWithData.all.length > 0 && (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              Seleccionados ({selectedEntitiesWithData.farmaciasCount} farmacia
              {selectedEntitiesWithData.farmaciasCount !== 1 ? 's' : ''},{' '}
              {selectedEntitiesWithData.medicosCount} médico
              {selectedEntitiesWithData.medicosCount !== 1 ? 's' : ''})
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Índice</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Especialidad</TableCell>
                    <TableCell>Calle</TableCell>
                    <TableCell>Colonia</TableCell>
                    <TableCell>Brick</TableCell>
                    <TableCell>Google Maps</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedEntitiesWithData.all.map((item, index) => (
                    <TableRow key={`${item.type}-${item.data.id}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.data.nombreCuenta || 'Sin nombre'}</TableCell>
                      <TableCell>
                        {item.type === 'medico' ? item.data.especialidad || '-' : ''}
                      </TableCell>
                      <TableCell>{item.data.calle || '-'}</TableCell>
                      <TableCell>{item.data.colonia || '-'}</TableCell>
                      <TableCell>{item.data.nombreBrick || '-'}</TableCell>
                      <TableCell>
                        <Link
                          href={item.data.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver en Maps
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Container>
  );
}

export default App;
