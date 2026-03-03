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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { MapView } from './map/Map';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita, VisitaStatus } from '../__types__/visita';

type CreateVisitDialogProps = {
  onClose: () => void;
  doctors: Medico[];
  pharmacies: Farmacia[];
  onSave: (visit: Omit<Visita, 'id' | 'createdAt'>) => Promise<void>;
};

type EntityType = 'all' | 'medico' | 'farmacia';

type DialogState = {
  loading: boolean;
  error: string | null;
  data: {
    searchTerm: string;
    entityFilter: EntityType;
    selectedEntity: { type: 'medico' | 'farmacia'; id: string; data: Medico | Farmacia } | null;
    selectedDate: string;
    selectedTime: string;
    status: VisitaStatus;
  };
};

const getInitialState = (): DialogState => ({
  loading: false,
  error: null,
  data: {
    searchTerm: '',
    entityFilter: 'all',
    selectedEntity: null,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedTime: '',
    status: 'planeado',
  },
});

export function CreateVisitDialog({
  onClose,
  doctors,
  pharmacies,
  onSave,
}: CreateVisitDialogProps) {
  const [state, setState] = useState<DialogState>(getInitialState);

  // Filter entities based on search term and entity type filter
  const filteredEntities = useMemo(() => {
    const searchLower = state.data.searchTerm.toLowerCase();

    let doctorsToInclude = state.data.entityFilter === 'all' || state.data.entityFilter === 'medico' ? doctors : [];
    let pharmaciesToInclude = state.data.entityFilter === 'all' || state.data.entityFilter === 'farmacia' ? pharmacies : [];

    if (state.data.searchTerm) {
      doctorsToInclude = doctorsToInclude.filter((doctor) =>
        doctor.nombreCuenta?.toLowerCase().includes(searchLower) ||
        doctor.especialidad?.toLowerCase().includes(searchLower) ||
        doctor.calle?.toLowerCase().includes(searchLower) ||
        doctor.colonia?.toLowerCase().includes(searchLower)
      );

      pharmaciesToInclude = pharmaciesToInclude.filter((pharmacy) =>
        pharmacy.nombreCuenta?.toLowerCase().includes(searchLower) ||
        pharmacy.calle?.toLowerCase().includes(searchLower) ||
        pharmacy.colonia?.toLowerCase().includes(searchLower)
      );
    }

    return [
      ...pharmaciesToInclude.map((data) => ({ type: 'farmacia' as const, data })),
      ...doctorsToInclude.map((data) => ({ type: 'medico' as const, data })),
    ];
  }, [doctors, pharmacies, state.data.searchTerm, state.data.entityFilter]);

  // Selected entities for the map (array format expected by MapView)
  const selectedEntitiesForMap = useMemo(() => {
    if (!state.data.selectedEntity) return [];
    return [{ type: state.data.selectedEntity.type, id: state.data.selectedEntity.id }];
  }, [state.data.selectedEntity]);

  // Handle entity selection from map
  const handleMapSelection = (entities: { type: 'medico' | 'farmacia'; id: string }[]) => {
    if (entities.length === 0) {
      setState((prev) => ({
        ...prev,
        data: { ...prev.data, selectedEntity: null },
      }));
      return;
    }

    const entity = entities[0];

    // Find the full entity data
    if (entity.type === 'medico') {
      const doctor = doctors.find((d) => d.id === entity.id);
      if (doctor) {
        setState((prev) => ({
          ...prev,
          data: { ...prev.data, selectedEntity: { type: 'medico', id: entity.id, data: doctor } },
        }));
      }
    } else {
      const pharmacy = pharmacies.find((p) => p.id === entity.id);
      if (pharmacy) {
        setState((prev) => ({
          ...prev,
          data: { ...prev.data, selectedEntity: { type: 'farmacia', id: entity.id, data: pharmacy } },
        }));
      }
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!state.data.selectedEntity) {
      setState((prev) => ({
        ...prev,
        error: 'Por favor selecciona una entidad del mapa',
      }));
      return;
    }

    if (!state.data.selectedDate) {
      setState((prev) => ({
        ...prev,
        error: 'Por favor selecciona una fecha',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      // Use provided time or fallback to 5am if not specified
      const time = state.data.selectedTime || '05:00';
      const dateTime = `${state.data.selectedDate}T${time}:00`;

      const newVisit: Omit<Visita, 'id' | 'createdAt'> = {
        fechaVisita: dateTime,
        fechaVisitaPlaneada: dateTime,
        entidadObjetivoTipo: state.data.selectedEntity.type,
        entidadObjetivoId: state.data.selectedEntity.id,
        estatus: state.data.status,
        productoJson: [],
      };

      await onSave(newVisit);

      // Close dialog (unmounting will reset state)
      onClose();
    } catch (err) {
      console.error('Error saving visit:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Error al guardar la visita. Por favor intenta de nuevo.',
      }));
    }
  };


  // Calculate map center based on filtered entities or selected entity
  const mapCenter = useMemo((): [number, number] => {
    if (state.data.selectedEntity && state.data.selectedEntity.data.lat && state.data.selectedEntity.data.lng) {
      return [state.data.selectedEntity.data.lat, state.data.selectedEntity.data.lng];
    }

    // Default: Queretaro, Mexico
    return [20.579117, -100.399349];
  }, [state.data.selectedEntity]);

  const hasValidEntities = filteredEntities.some((e) => e.data.lat && e.data.lng);

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
            Crear Nueva Visita
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
        {/* Search and Filter Controls */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label="Buscar por nombre, especialidad, dirección..."
            value={state.data.searchTerm}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, searchTerm: e.target.value },
              }))
            }
            fullWidth
            size="small"
            autoFocus
          />
          <ToggleButtonGroup
            value={state.data.entityFilter}
            exclusive
            onChange={(_, value) =>
              value &&
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, entityFilter: value },
              }))
            }
            size="small"
          >
            <ToggleButton value="all">Todos</ToggleButton>
            <ToggleButton value="medico">Médicos</ToggleButton>
            <ToggleButton value="farmacia">Farmacias</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Results count */}
        <Typography variant="body2" color="text.secondary">
          {filteredEntities.length} resultado{filteredEntities.length !== 1 ? 's' : ''} encontrado{filteredEntities.length !== 1 ? 's' : ''}
        </Typography>

        {/* Map */}
        <Box sx={{ flex: 1, minHeight: 400, border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
          {!hasValidEntities ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                {state.data.searchTerm ? 'No se encontraron entidades con coordenadas válidas' : 'Ingresa un término de búsqueda'}
              </Typography>
            </Box>
          ) : (
            <MapView
              entities={filteredEntities}
              center={mapCenter}
              zoom={state.data.selectedEntity ? 15 : 11}
              selectedEntities={selectedEntitiesForMap}
              onToggleSelection={handleMapSelection}
            />
          )}
        </Box>

        {/* Selected Entity Info */}
        {state.data.selectedEntity && (
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Entidad seleccionada:</strong>{' '}
              {state.data.selectedEntity.type === 'medico' ? 'Médico' : 'Farmacia'} -{' '}
              {state.data.selectedEntity.data.nombreCuenta || 'Sin nombre'}
            </Typography>
          </Alert>
        )}

        {/* Date, Time and Status Controls */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            type="date"
            label="Fecha de visita"
            value={state.data.selectedDate}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, selectedDate: e.target.value },
              }))
            }
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            type="time"
            label="Hora de visita"
            value={state.data.selectedTime}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, selectedTime: e.target.value },
              }))
            }
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            slotProps={{
              htmlInput: {
                step: 60, // 1 minute
              },
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Estatus</InputLabel>
            <Select
              value={state.data.status}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  data: { ...prev.data, status: e.target.value as VisitaStatus },
                }))
              }
              label="Estatus"
            >
              <MenuItem value="planeado">Planeado</MenuItem>
              <MenuItem value="visitado">Visitado</MenuItem>
              <MenuItem value="noEncontrado">No Encontrado</MenuItem>
            </Select>
          </FormControl>
        </Box>

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
          disabled={!state.data.selectedEntity || state.loading}
          startIcon={state.loading ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {state.loading ? 'Guardando...' : 'Guardar Visita'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
