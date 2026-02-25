import { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Checkbox,
  FormControlLabel,
  Stack,
  CircularProgress,
} from '@mui/material';
import { MapView } from './components/map/Map';
import { ErrorState } from './components/ErrorState';
import { BrickFilter, NO_BRICK } from './components/BrickFilter';
import { SelectedEntitiesTable } from './components/SelectedEntitiesTable';
import { usePharmaciesQuery, useDoctorsQuery, useVisitsQuery } from './google-sheets/useGoogleSheet';
import { GoogleAuth } from './google-sheets/GoogleAuth';
import type { Farmacia } from './__types__/pharmacy';
import type { Medico } from './__types__/doctor';

function App() {
  const pharmacies = usePharmaciesQuery();
  const doctors = useDoctorsQuery();
  const visits = useVisitsQuery();
  const [selectedBricks, setSelectedBricks] = useState<string[]>([]);
  const [showFarmacias, setShowFarmacias] = useState<boolean>(true);
  const [showMedicos, setShowMedicos] = useState<boolean>(true);
  const [selectedEntities, setSelectedEntities] = useState<
    Array<
      | { type: 'farmacia'; data: Farmacia; isHighlighted: boolean }
      | { type: 'medico'; data: Medico; isHighlighted: boolean }
    >
  >([]);

  // Handler to toggle entity selection (supports single or multiple entities)
  const toggleEntitySelection = (entities: Array<{ type: 'farmacia' | 'medico'; id: string }>) => {
    // Check if all entities in the array are currently selected
    const allSelected = entities.every((entity) =>
      selectedEntities.some((e) => e.type === entity.type && e.data.id === entity.id)
    );

    if (allSelected) {
      // If all are selected, deselect all
      setSelectedEntities((prev) =>
        prev.filter(
          (e) => !entities.some((entity) => entity.type === e.type && entity.id === e.data.id)
        )
      );
    } else {
      // If any are not selected, select all that aren't already selected
      const newEntities: Array<
        | { type: 'farmacia'; data: Farmacia; isHighlighted: boolean }
        | { type: 'medico'; data: Medico; isHighlighted: boolean }
      > = [];

      entities.forEach((entity) => {
        const isAlreadySelected = selectedEntities.some(
          (e) => e.type === entity.type && e.data.id === entity.id
        );

        if (!isAlreadySelected) {
          if (entity.type === 'farmacia') {
            const farmacia = pharmacies.data.find((f) => f.id === entity.id);
            if (farmacia) {
              newEntities.push({ type: 'farmacia', data: farmacia, isHighlighted: false });
            }
          } else {
            const medico = doctors.data.find((m) => m.id === entity.id);
            if (medico) {
              newEntities.push({ type: 'medico', data: medico, isHighlighted: false });
            }
          }
        }
      });

      if (newEntities.length > 0) {
        setSelectedEntities((prev) => [...prev, ...newEntities]);
      }
    }
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
            selectedEntities={selectedEntities.map((e) => ({ type: e.type, id: e.data.id }))}
            highlightedEntity={
              selectedEntities.find((e) => e.isHighlighted)
                ? {
                    type: selectedEntities.find((e) => e.isHighlighted)!.type,
                    id: selectedEntities.find((e) => e.isHighlighted)!.data.id,
                  }
                : null
            }
            onToggleSelection={toggleEntitySelection}
          />
        </Box>

        {/* Selected Entities Table */}
        <SelectedEntitiesTable
          entities={selectedEntities}
          defaultRows={15}
          onUpdateEntities={setSelectedEntities}
        />
      </Stack>
    </Container>
  );
}

export default App;
