import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
} from '@mui/material';
import { Add as AddIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';


type EntityType = 'medico' | 'farmacia';

export type FormData = {
  entityType: EntityType;
  // Common fields - all required as strings for form handling
  nombreCuenta: string;
  email: string;
  phone: string;
  estado: string;
  municipio: string;
  colonia: string;
  calle: string;
  codigoPostal: string;
  especialidad: string;
  estatus: string;
  lat?: number;
  lng?: number;
  googleMapsUrl: string;
  // Farmacia-specific fields
  territorio: string;
  pais: string;
  ruta: string;
  plantillaClientes: string;
  folioTienda: string;
  cedulaProfesional: string;
  grupoCadena: string;
  categoriaMedico: string;
  propietarioCuenta: string;
  // Medico-specific fields
  ciudad: string;
};

type DialogState = {
  loading: boolean;
  error: string | null;
  loadingLocation: boolean;
  data: FormData;
};



const getInitialState = (): DialogState => ({
  loading: false,
  error: null,
  loadingLocation: false,
  data: {
    entityType: 'medico',
    nombreCuenta: '',
    email: '',
    phone: '',
    estado: '',
    municipio: '',
    colonia: '',
    calle: '',
    codigoPostal: '',
    especialidad: '',
    estatus: 'Activa',
    lat: undefined,
    lng: undefined,
    googleMapsUrl: '',
    territorio: '',
    pais: 'México',
    ruta: '',
    plantillaClientes: '',
    folioTienda: '',
    cedulaProfesional: '',
    grupoCadena: '',
    categoriaMedico: '',
    propietarioCuenta: '',
    ciudad: '',
  },
});

type CreateEntityDialogProps = {
  onClose: () => void;
  onSave: (newItemInfo: {type: 'medico', data: Omit<Medico, 'id' | 'createdAt'> }|{type: 'farmacia', data: Omit<Farmacia, 'id' | 'createdAt'> } ) => Promise<void>;
  entity?: FormData;
};


export function CreateEntityDialog({
  onClose,
  onSave,
  entity
}: CreateEntityDialogProps) {
  const [state, setState] = useState<DialogState>(() => !entity?getInitialState():{...getInitialState(), data: {...entity}});

  // Helper to update coordinates and Google Maps URL together
  const updateCoordinates = (lat?: number, lng?: number) => {
    setState((prev) => {
      const newLat = lat ?? prev.data.lat;
      const newLng = lng ?? prev.data.lng;
      const googleMapsUrl = newLat !== undefined && newLng !== undefined
        ? `https://www.google.com/maps/search/?api=1&query=${newLat},${newLng}`
        : '';

      return {
        ...prev,
        data: {
          ...prev.data,
          lat: newLat,
          lng: newLng,
          googleMapsUrl,
        },
      };
    });
  };

  // Validation
  const validationError = useMemo(() => {
    if (!state.data.nombreCuenta.trim()) {
      return 'El nombre de la cuenta es requerido';
    }
    return null;
  }, [state.data.nombreCuenta]);

  // Handle getting current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'La geolocalización no está disponible en este navegador',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loadingLocation: true,
      error: null,
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setState((prev) => ({
          ...prev,
          loadingLocation: false,
        }));

        updateCoordinates(lat, lng);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setState((prev) => ({
          ...prev,
          loadingLocation: false,
          error: `Error al obtener ubicación: ${error.message}`,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle save
  const handleSave = async () => {
    if (validationError) {
      setState((prev) => ({
        ...prev,
        error: validationError,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      if (state.data.entityType === 'medico') {
        const newDoctor: Omit<Medico, 'id' | 'createdAt'> = {
          nombreCuenta: state.data.nombreCuenta.trim() || undefined,
          email: state.data.email.trim() || undefined,
          phone: state.data.phone.trim() || undefined,
          estado: state.data.estado.trim() || undefined,
          ciudad: state.data.ciudad.trim() || undefined,
          colonia: state.data.colonia.trim() || undefined,
          calle: state.data.calle.trim() || undefined,
          codigoPostal: state.data.codigoPostal.trim() || undefined,
          especialidad: state.data.especialidad.trim() || undefined,
          estatus: state.data.estatus.trim() || undefined,
          lat: state.data.lat,
          lng: state.data.lng,
          googleMapsUrl: state.data.googleMapsUrl.trim() || undefined,
        };
        await onSave({type: 'medico', data: newDoctor});
      } else {
        const newPharmacy: Omit<Farmacia, 'id' | 'createdAt'> = {
          nombreCuenta: state.data.nombreCuenta.trim() || undefined,
          email: state.data.email.trim() || undefined,
          phone: state.data.phone.trim() || undefined,
          territorio: state.data.territorio.trim() || undefined,
          pais: state.data.pais.trim() || undefined,
          estado: state.data.estado.trim() || undefined,
          municipio: state.data.municipio.trim() || undefined,
          colonia: state.data.colonia.trim() || undefined,
          calle: state.data.calle.trim() || undefined,
          codigoPostal: state.data.codigoPostal.trim() || undefined,
          ruta: state.data.ruta.trim() || undefined,
          plantillaClientes: state.data.plantillaClientes.trim() || undefined,
          folioTienda: state.data.folioTienda.trim() || undefined,
          cedulaProfesional: state.data.cedulaProfesional.trim() || undefined,
          grupoCadena: state.data.grupoCadena.trim() || undefined,
          especialidad: state.data.especialidad.trim() || undefined,
          categoriaMedico: state.data.categoriaMedico.trim() || undefined,
          propietarioCuenta: state.data.propietarioCuenta.trim() || undefined,
          estatus: state.data.estatus.trim() || undefined,
          lat: state.data.lat,
          lng: state.data.lng,
          googleMapsUrl: state.data.googleMapsUrl.trim() || undefined,
        };
        await onSave({type: 'farmacia', data: newPharmacy});

      }

      // Close dialog on success
      onClose();
    } catch (err) {
      console.error('Error saving entity:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Error al guardar. Por favor intenta de nuevo.',
      }));
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      fullScreen
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon />
          <Typography variant="h6" component="span">
            Guardar Entidad
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
        {/* Entity Type Selector */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Tipo de Entidad
          </Typography>
          <ToggleButtonGroup
            value={state.data.entityType}
            exclusive
            onChange={(_, value) =>
              value &&
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, entityType: value },
              }))
            }
            fullWidth
          >
            <ToggleButton value="medico">Médico</ToggleButton>
            <ToggleButton value="farmacia">Farmacia</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Common Fields */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Información General
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Nombre de la Cuenta *"
              value={state.data.nombreCuenta}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  data: { ...prev.data, nombreCuenta: e.target.value },
                }))
              }
              fullWidth
              size="small"
              required
              autoFocus
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={state.data.email}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    data: { ...prev.data, email: e.target.value },
                  }))
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Teléfono"
                value={state.data.phone}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    data: { ...prev.data, phone: e.target.value },
                  }))
                }
                fullWidth
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Especialidad"
                value={state.data.especialidad}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    data: { ...prev.data, especialidad: e.target.value },
                  }))
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Estatus"
                value={state.data.estatus}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    data: { ...prev.data, estatus: e.target.value },
                  }))
                }
                fullWidth
                size="small"
              />
            </Box>
          </Stack>
        </Box>

        {/* Location Fields */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Ubicación
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Latitud"
                type="number"
                value={state.data.lat ?? ''}
                onChange={(e) => {
                  const newLat = e.target.value ? parseFloat(e.target.value) : undefined;
                  updateCoordinates(newLat, state.data.lng);
                }}
                fullWidth
                size="small"
                slotProps={{
                  htmlInput: {
                    step: 'any',
                  },
                }}
              />
              <TextField
                label="Longitud"
                type="number"
                value={state.data.lng ?? ''}
                onChange={(e) => {
                  const newLng = e.target.value ? parseFloat(e.target.value) : undefined;
                  updateCoordinates(state.data.lat, newLng);
                }}
                fullWidth
                size="small"
                slotProps={{
                  htmlInput: {
                    step: 'any',
                  },
                }}
              />
              <Button
                variant="outlined"
                startIcon={state.loadingLocation ? <CircularProgress size={16} /> : <MyLocationIcon />}
                onClick={handleGetCurrentLocation}
                disabled={state.loadingLocation}
                sx={{ minWidth: 'max-content', whiteSpace: 'nowrap' }}
              >
                {state.loadingLocation ? 'Obteniendo...' : 'Usar Ubicación'}
              </Button>
            </Box>
            <TextField
              label="Google Maps URL"
              value={state.data.googleMapsUrl}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  data: { ...prev.data, googleMapsUrl: e.target.value },
                }))
              }
              fullWidth
              size="small"
              placeholder="https://www.google.com/maps/..."
            />
          </Stack>
        </Box>

        {/* Address Fields */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Dirección
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Estado"
                value={state.data.estado}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    data: { ...prev.data, estado: e.target.value },
                  }))
                }
                fullWidth
                size="small"
              />
              {state.data.entityType === 'farmacia' && (
                <TextField
                  label="Municipio"
                  value={state.data.municipio}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, municipio: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
              )}
              {state.data.entityType === 'medico' && (
                <TextField
                  label="Ciudad"
                  value={state.data.ciudad}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, ciudad: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Colonia"
                value={state.data.colonia}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    data: { ...prev.data, colonia: e.target.value },
                  }))
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Calle"
                value={state.data.calle}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    data: { ...prev.data, calle: e.target.value },
                  }))
                }
                fullWidth
                size="small"
              />
            </Box>
            <TextField
              label="Código Postal"
              value={state.data.codigoPostal}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  data: { ...prev.data, codigoPostal: e.target.value },
                }))
              }
              fullWidth
              size="small"
            />
          </Stack>
        </Box>

        {/* Farmacia-specific Fields */}
        {state.data.entityType === 'farmacia' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Información Adicional (Farmacia)
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Territorio"
                  value={state.data.territorio}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, territorio: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
                <TextField
                  label="País"
                  value={state.data.pais}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, pais: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Ruta"
                  value={state.data.ruta}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, ruta: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Folio de Tienda"
                  value={state.data.folioTienda}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, folioTienda: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Cédula Profesional"
                  value={state.data.cedulaProfesional}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, cedulaProfesional: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Grupo/Cadena"
                  value={state.data.grupoCadena}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      data: { ...prev.data, grupoCadena: e.target.value },
                    }))
                  }
                  fullWidth
                  size="small"
                />
              </Box>
            </Stack>
          </Box>
        )}

        {/* Error Message */}
        {state.error && (
          <Alert
            severity="error"
            onClose={() =>
              setState((prev) => ({
                ...prev,
                error: null,
              }))
            }
          >
            {state.error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={state.loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={state.loading || !!validationError}
          startIcon={state.loading ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {state.loading ? 'Guardando...' : `Guardar ${state.data.entityType === 'medico' ? 'Médico' : 'Farmacia'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
