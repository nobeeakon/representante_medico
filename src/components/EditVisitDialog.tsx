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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import type { Visita, VisitaStatus } from '../__types__/visita';

type EditVisitDialogProps = {
  visit: Visita;
  entityName: string;
  entityType: 'medico' | 'farmacia';
  onClose: () => void;
  onSave: (visitId: string, updates: Partial<Omit<Visita, 'id' | 'createdAt'>>) => Promise<void>;
  mode?: 'edit' | 'duplicate';
};

type DialogState = {
  loading: boolean;
  error: string | null;
  data: {
    plannedTime: string;
    visitTime: string;
    status: VisitaStatus;
    note: string;
  };
};

const getInitialState = (visit: Visita): DialogState => {
  // Extract time from planned visit date
  const plannedDate = new Date(visit.fechaVisitaPlaneada);
  const plannedHours = plannedDate.getHours();
  const plannedMinutes = plannedDate.getMinutes();
  const plannedTime = `${String(plannedHours).padStart(2, '0')}:${String(plannedMinutes).padStart(2, '0')}`;

  // Extract time from actual visit date (if exists)
  let visitTime = '';
  if (visit.fechaVisita) {
    const visitDate = new Date(visit.fechaVisita);
    const visitHours = visitDate.getHours();
    const visitMinutes = visitDate.getMinutes();
    visitTime = `${String(visitHours).padStart(2, '0')}:${String(visitMinutes).padStart(2, '0')}`;
  }

  return {
    loading: false,
    error: null,
    data: {
      plannedTime,
      visitTime,
      status: visit.estatus,
      note: visit.nota || '',
    },
  };
};

export function EditVisitDialog({
  visit,
  entityName,
  entityType,
  onClose,
  onSave,
  mode = 'edit',
}: EditVisitDialogProps) {
  const [state, setState] = useState<DialogState>(() => getInitialState(visit));

  // Get the date part from the planned visit date (both dates should use the same date)
  const dateString = useMemo(() => {
    const date = new Date(visit.fechaVisitaPlaneada);
    return date.toISOString().split('T')[0];
  }, [visit.fechaVisitaPlaneada]);

  // Real-time validation: status cannot be "planeado" when there's a visit time
  const validationError = useMemo(() => {
    if (state.data.visitTime && state.data.status === 'planeado') {
      return 'No se puede tener estatus "Planeado" cuando hay una hora de visita. Por favor cambia el estatus a "Visitado" o "No Encontrado".';
    }
    return null;
  }, [state.data.visitTime, state.data.status]);

  // Set current time for visit time
  const handleSetCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    setState((prev) => ({
      ...prev,
      data: { ...prev.data, visitTime: currentTime },
    }));
  };

  // Handle save
  const handleSave = async () => {
    // Don't proceed if there's a validation error
    if (validationError) {
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const updates: Partial<Omit<Visita, 'id' | 'createdAt'>> = {
        estatus: state.data.status,
        nota: state.data.note || undefined,
      };

      // Update planned visit date/time
      if (state.data.plannedTime) {
        updates.fechaVisitaPlaneada = `${dateString}T${state.data.plannedTime}:00`;
      }

      // Update actual visit date/time if provided
      if (state.data.visitTime) {
        updates.fechaVisita = `${dateString}T${state.data.visitTime}:00`;
      }

      await onSave(visit.id, updates);

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

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {mode === 'duplicate' ? <ContentCopyIcon /> : <EditIcon />}
          <Typography variant="h6" component="span">
            {mode === 'duplicate' ? 'Duplicar Visita' : 'Editar Visita'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
        {/* Entity Info */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Entidad:</strong>{' '}
            {entityType === 'medico' ? 'Médico' : 'Farmacia'} - {entityName}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <strong>Fecha:</strong> {new Date(visit.fechaVisitaPlaneada).toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
        </Alert>

        {/* Planned Time */}
        <TextField
          type="time"
          label="Hora Planeada"
          value={state.data.plannedTime}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              data: { ...prev.data, plannedTime: e.target.value },
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
          fullWidth
        />

        {/* Actual Visit Time */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            type="time"
            label="Hora de Visita"
            value={state.data.visitTime}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, visitTime: e.target.value },
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
            fullWidth
          />
          <Tooltip title="Establecer hora actual">
            <IconButton
              onClick={handleSetCurrentTime}
              color="primary"
              size="small"
              sx={{ mt: 0.5 }}
            >
              <ScheduleIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status */}
        <FormControl size="small" fullWidth>
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

        {/* Note */}
        <TextField
          label="Nota"
          value={state.data.note}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              data: { ...prev.data, note: e.target.value },
            }))
          }
          size="small"
          multiline
          rows={4}
          fullWidth
          placeholder="Agregar nota sobre la visita..."
        />

        {/* Validation Error */}
        {validationError && (
          <Alert severity="warning">
            {validationError}
          </Alert>
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
          startIcon={state.loading ? <CircularProgress size={16} /> : mode === 'duplicate' ? <ContentCopyIcon /> : <EditIcon />}
        >
          {state.loading ? 'Guardando...' : mode === 'duplicate' ? 'Crear Visita' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
