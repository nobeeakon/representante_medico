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
    visitDate: string;
    visitTime: string;
    status: VisitaStatus;
    note: string;
  };
};

const getInitialState = (visit: Visita): DialogState => {
  // Extract date and time from actual visit date (if exists)
  let visitDate = '';
  let visitTime = '';
  if (visit.fechaVisita) {
    // fechaVisita is already a Date object
    visitDate = visit.fechaVisita.toISOString().split('T')[0];
    const visitHours = visit.fechaVisita.getHours();
    const visitMinutes = visit.fechaVisita.getMinutes();
    visitTime = `${String(visitHours).padStart(2, '0')}:${String(visitMinutes).padStart(2, '0')}`;
  }

  return {
    loading: false,
    error: null,
    data: {
      visitDate,
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

  // Real-time validation
  const validationError = useMemo(() => {
    const hasVisitDateTime = state.data.visitDate && state.data.visitTime;
    // Must have visit date/time when status is "visitado" or "noEncontrado"
    if (!hasVisitDateTime && state.data.status !== 'planeado') {
      return 'Se requiere una fecha y hora de visita cuando el estatus es "Visitado" o "No Encontrado". Por favor agrega la fecha y hora de visita.';
    }
    return null;
  }, [state.data.visitDate, state.data.visitTime, state.data.status]);

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

      // Update actual visit date/time if provided
      if (state.data.visitDate && state.data.visitTime) {
        updates.fechaVisita = new Date(`${state.data.visitDate}T${state.data.visitTime}:00`);
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
    <Dialog open={true} onClose={onClose} fullScreen>
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
            <strong>Entidad:</strong> {entityType === 'medico' ? 'Médico' : 'Farmacia'} -{' '}
            {entityName}
          </Typography>
        </Alert>

        {/* Visit Date */}
        <TextField
          type="date"
          label="Fecha de Visita"
          value={state.data.visitDate}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              data: { ...prev.data, visitDate: e.target.value },
            }))
          }
          size="small"
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
          fullWidth
        />

        {/* Visit Time */}
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
            slotProps={{
              inputLabel: {
                shrink: true,
              },
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
            <MenuItem value="planeado">Programado</MenuItem>
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
        {validationError && <Alert severity="warning">{validationError}</Alert>}

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
          startIcon={
            state.loading ? (
              <CircularProgress size={16} />
            ) : mode === 'duplicate' ? (
              <ContentCopyIcon />
            ) : (
              <EditIcon />
            )
          }
        >
          {state.loading
            ? 'Guardando...'
            : mode === 'duplicate'
              ? 'Crear Visita'
              : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
