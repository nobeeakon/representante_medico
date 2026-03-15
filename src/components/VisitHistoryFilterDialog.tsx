import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export type VisitHistoryFilterType =
  | 'none'
  | 'never-visited'
  | 'not-visited-since'
  | 'visited-within-days'
  | 'only-not-found'
  | 'planning-focused';

export type VisitHistoryFilterConfig = {
  type: VisitHistoryFilterType;
  daysSince?: number;
  daysAhead?: number;
  daysBack?: number;
};

type VisitHistoryFilterDialogProps = {
  open: boolean;
  currentFilter: VisitHistoryFilterConfig;
  onClose: () => void;
  onApply: (filter: VisitHistoryFilterConfig) => void;
};

export function VisitHistoryFilterDialog({
  open,
  currentFilter,
  onClose,
  onApply,
}: VisitHistoryFilterDialogProps) {
  const [filterType, setFilterType] = useState<VisitHistoryFilterType>(currentFilter.type);
  const [daysSince, setDaysSince] = useState<number>(currentFilter.daysSince ?? 30);
  const [daysAhead, setDaysAhead] = useState<number>(currentFilter.daysAhead ?? 7);
  const [daysBack, setDaysBack] = useState<number>(currentFilter.daysBack ?? 30);

  const handleApply = () => {
    onApply({
      type: filterType,
      daysSince:
        filterType === 'not-visited-since' || filterType === 'visited-within-days'
          ? daysSince
          : undefined,
      daysAhead: filterType === 'planning-focused' ? daysAhead : undefined,
      daysBack: filterType === 'planning-focused' ? daysBack : undefined,
    });
    onClose();
  };

  const handleClear = () => {
    onApply({ type: 'none' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle>Filtro por Historial de Visitas</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Selecciona un filtro para mostrar solo las entidades que cumplan con el criterio:
          </Typography>

          <RadioGroup
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as VisitHistoryFilterType)}
          >
            <FormControlLabel value="none" control={<Radio />} label="Sin filtro (mostrar todas)" />
            <FormControlLabel value="never-visited" control={<Radio />} label="Nunca visitadas" />
            <FormControlLabel
              value="not-visited-since"
              control={<Radio />}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>No visitadas desde hace</span>
                  <TextField
                    type="number"
                    size="small"
                    value={daysSince}
                    onChange={(e) => setDaysSince(parseInt(e.target.value) || 0)}
                    disabled={filterType !== 'not-visited-since'}
                    sx={{ width: '80px' }}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  <span>días</span>
                </Stack>
              }
            />
            <FormControlLabel
              value="visited-within-days"
              control={<Radio />}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>Visitadas en los últimos</span>
                  <TextField
                    type="number"
                    size="small"
                    value={daysSince}
                    onChange={(e) => setDaysSince(parseInt(e.target.value) || 0)}
                    disabled={filterType !== 'visited-within-days'}
                    sx={{ width: '80px' }}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  <span>días</span>
                </Stack>
              }
            />
            <FormControlLabel
              value="only-not-found"
              control={<Radio />}
              label="Solo marcadas como 'No encontrado'"
            />
            <FormControlLabel
              value="planning-focused"
              control={<Radio />}
              label={
                <Stack spacing={1.5}>
                  <Typography variant="body2" fontWeight={500}>
                    Enfoque en planificación
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 2 }}>
                    <span>Sin visita planificada en los próximos</span>
                    <TextField
                      type="number"
                      size="small"
                      value={daysAhead}
                      onChange={(e) => setDaysAhead(parseInt(e.target.value) || 0)}
                      disabled={filterType !== 'planning-focused'}
                      sx={{ width: '80px' }}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                    <span>días</span>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 2 }}>
                    <span>Y sin visita o plan en los últimos</span>
                    <TextField
                      type="number"
                      size="small"
                      value={daysBack}
                      onChange={(e) => setDaysBack(parseInt(e.target.value) || 0)}
                      disabled={filterType !== 'planning-focused'}
                      sx={{ width: '80px' }}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                    <span>días</span>
                  </Stack>
                </Stack>
              }
            />
          </RadioGroup>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} color="inherit">
          Limpiar Filtro
        </Button>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleApply} variant="contained">
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
