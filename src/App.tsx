import { useState, useMemo } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import { MapView } from './components/Map'
import { useGoogleSheetsData } from './google-sheets/useGoogleSheetsData'
import { GoogleAuth } from './google-sheets/GoogleAuth'

// Special constant for entries without a brick
const NO_BRICK = '(Sin Brick)';

function App() {
  const { medicos, farmacias, loading, error } = useGoogleSheetsData();
  const [selectedBricks, setSelectedBricks] = useState<string[]>([]);
  const [showFarmacias, setShowFarmacias] = useState<boolean>(true);
  const [showMedicos, setShowMedicos] = useState<boolean>(true);

  // Get unique brick names from both farmacias and medicos
  const availableBricks = useMemo(() => {
    const brickSet = new Set<string>();
    let hasUndefinedBrick = false;

    farmacias.forEach(farmacia => {
      if (farmacia.nombreBrick) {
        brickSet.add(farmacia.nombreBrick);
      } else {
        hasUndefinedBrick = true;
      }
    });

    medicos.forEach(medico => {
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
  }, [farmacias, medicos]);

  // Filter farmacias and medicos based on selected bricks and visibility toggles
  const filteredFarmacias = useMemo(() => {
    if (!showFarmacias) {
      return [];
    }
    if (selectedBricks.length === 0) {
      return farmacias;
    }
    return farmacias.filter(farmacia => {
      // Check if NO_BRICK is selected and this farmacia has no brick
      if (selectedBricks.includes(NO_BRICK) && !farmacia.nombreBrick) {
        return true;
      }
      // Check if this farmacia's brick is in the selected list
      return farmacia.nombreBrick && selectedBricks.includes(farmacia.nombreBrick);
    });
  }, [farmacias, selectedBricks, showFarmacias]);

  const filteredMedicos = useMemo(() => {
    if (!showMedicos) {
      return [];
    }
    if (selectedBricks.length === 0) {
      return medicos;
    }
    return medicos.filter(medico => {
      // Check if NO_BRICK is selected and this medico has no brick
      if (selectedBricks.includes(NO_BRICK) && !medico.nombreBrick) {
        return true;
      }
      // Check if this medico's brick is in the selected list
      return medico.nombreBrick && selectedBricks.includes(medico.nombreBrick);
    });
  }, [medicos, selectedBricks, showMedicos]);

  // Handle individual brick checkbox toggle
  const handleBrickToggle = (brick: string): void => {
    setSelectedBricks(prev => {
      if (prev.includes(brick)) {
        return prev.filter(b => b !== brick);
      } else {
        return [...prev, brick];
      }
    });
  };

  // Handle select all / deselect all
  const handleSelectAll = (): void => {
    if (selectedBricks.length === availableBricks.length) {
      setSelectedBricks([]);
    } else {
      setSelectedBricks([...availableBricks]);
    }
  };

  // Show loading state
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
          <Typography variant="h5">Cargando datos...</Typography>
          <Typography variant="body1" color="text.secondary">
            Por favor espera mientras cargamos los datos de farmacias y médicos.
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (error) {
    const isAuthError = error.includes('Not authenticated') || error.includes('Failed to initialize Google API');

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
            {error}
          </Alert>
          {isAuthError && (
            <GoogleAuth onAuthStateChange={(isAuth) => {
              if (isAuth) {
                window.location.reload();
              }
            }} />
          )}
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
        {availableBricks.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Filtrar por Brick:
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSelectAll}
                  >
                    {selectedBricks.length === availableBricks.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </Button>
                  {selectedBricks.length > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => setSelectedBricks([])}
                    >
                      Limpiar Filtro
                    </Button>
                  )}
                </Stack>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  p: 1.5,
                }}
              >
                <FormGroup>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                    }}
                  >
                    {availableBricks.map(brick => {
                      const isNoBrick = brick === NO_BRICK;
                      const isSelected = selectedBricks.includes(brick);
                      return (
                        <FormControlLabel
                          key={brick}
                          sx={{ m: 0, px: .3 , height: 'fit-content', border: '1px solid lightgrey' }}
                          control={
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleBrickToggle(brick)}
                              size="small"
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              sx={{
                                fontStyle: isNoBrick ? 'italic' : 'normal',
                                color: isNoBrick ? 'text.secondary' : 'text.primary',
                              }}
                            >
                              {brick}
                            </Typography>
                          }
                        />
                      );
                    })}
                  </Box>
                </FormGroup>
              </Paper>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {selectedBricks.length > 0
                  ? `${selectedBricks.length} de ${availableBricks.length} brick${selectedBricks.length !== 1 ? 's' : ''} seleccionado${selectedBricks.length !== 1 ? 's' : ''}`
                  : `${availableBricks.length} brick${availableBricks.length !== 1 ? 's' : ''} disponible${availableBricks.length !== 1 ? 's' : ''} - selecciona para filtrar`}
              </Typography>
            </Stack>
          </Paper>
        )}

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
              <Typography sx={{ fontWeight: showFarmacias ? 'bold' : 'normal', color: 'success.main' }}>
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
              <Typography sx={{ fontWeight: showMedicos ? 'bold' : 'normal', color: 'primary.main' }}>
                ● Médicos
              </Typography>
            }
          />
        </Box>

        {/* Stats */}
        <Stack spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {farmacias.length} farmacia{farmacias.length !== 1 ? 's' : ''} • {medicos.length} médico{medicos.length !== 1 ? 's' : ''} cargado{(farmacias.length + medicos.length) !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mostrando {filteredFarmacias.length} farmacia{filteredFarmacias.length !== 1 ? 's' : ''} y{' '}
            {filteredMedicos.length} médico{filteredMedicos.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>

        {/* Map */}
        <Box>
          <MapView farmacias={filteredFarmacias} medicos={filteredMedicos} />
        </Box>
      </Stack>
    </Container>
  )
}

export default App
