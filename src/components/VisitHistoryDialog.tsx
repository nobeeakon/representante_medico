import { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Chip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Visita } from '../__types__/visita';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';

const STATUS_DISPLAY: Record<
  string,
  { text: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }
> = {
  planeado: { text: 'Planeado', color: 'primary' },
  visitado: { text: 'Visitado', color: 'success' },
  noEncontrado: { text: 'No Encontrado', color: 'error' },
};

type VisitHistoryDialogProps = {
  open: boolean;
  entity: { type: 'medico' | 'farmacia'; data: Medico | Farmacia } | null;
  visits: Visita[];
  onClose: () => void;
};

export function VisitHistoryDialog({ open, entity, visits, onClose }: VisitHistoryDialogProps) {
  // Filter visits for this specific entity
  const entityVisits = useMemo(() => {
    if (!entity) return [];

    return visits
      .filter(
        (visit) =>
          visit.entidadObjetivoTipo === entity.type && visit.entidadObjetivoId === entity.data.id
      )
      .sort((a, b) => {
        // Sort by visit date, most recent first
        return b.fechaVisita.getTime() - a.fechaVisita.getTime();
      });
  }, [entity, visits]);

  if (!entity) return null;

  const entityName = entity.data.nombreCuenta || 'Sin nombre';
  const entityType = entity.type === 'medico' ? 'Médico' : 'Farmacia';

  const formatDate = (date?: Date) => {
    if (!date) return '--';
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--';
    const hours = date.getHours();
    const hasValidTime = hours >= 6;

    return hasValidTime
      ? date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" component="div">
              Historial de Visitas
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {entityType}: {entityName}
            </Typography>
          </Box>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="cerrar">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {/* Summary Section */}
        {entityVisits.length > 0 && (
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total de visitas
                </Typography>
                <Typography variant="h5">{entityVisits.length}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Visitado
                </Typography>
                <Typography variant="h5" color="success.main">
                  {entityVisits.filter((v) => v.estatus === 'visitado').length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Planeado
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {entityVisits.filter((v) => v.estatus === 'planeado').length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  No Encontrado
                </Typography>
                <Typography variant="h5" color="error.main">
                  {entityVisits.filter((v) => v.estatus === 'noEncontrado').length}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
        {entityVisits.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No hay visitas registradas para esta entidad
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha Visita</TableCell>
                  <TableCell>Hora Visita</TableCell>
                  <TableCell>Estatus</TableCell>
                  <TableCell>Notas</TableCell>
                  <TableCell>Productos</TableCell>
                  <TableCell>Creado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entityVisits.map((visit) => {
                  const statusInfo = STATUS_DISPLAY[visit.estatus] || {
                    text: visit.estatus,
                    color: 'default' as const,
                  };

                  return (
                    <TableRow key={visit.id}>
                      <TableCell>{formatDate(visit.fechaVisita)}</TableCell>
                      <TableCell>{formatTime(visit.fechaVisita)}</TableCell>
                      <TableCell>
                        <Chip label={statusInfo.text} color={statusInfo.color} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={visit.nota || ''}
                        >
                          {visit.nota || '--'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {visit.productoJson && visit.productoJson.length > 0 ? (
                          <Typography variant="body2">
                            {visit.productoJson.length} producto
                            {visit.productoJson.length !== 1 ? 's' : ''}
                          </Typography>
                        ) : (
                          '--'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(new Date(visit.createdAt))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
