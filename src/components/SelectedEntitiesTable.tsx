import { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ClearAll as ClearAllIcon,
  MyLocation as MyLocationIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useVisitsQuery } from '../google-sheets/useGoogleSheet';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita } from '../__types__/visita';

// TODO complete the date planner: what happens when I update a planning, filter in the map, etc

type SelectedEntity =
  | { type: 'farmacia'; data: Farmacia; isHighlighted: boolean }
  | { type: 'medico'; data: Medico; isHighlighted: boolean };

type SelectedEntitiesTableProps = {
  entities: SelectedEntity[];
  defaultRows: number;
  onUpdateEntities: (entities: SelectedEntity[]) => void;
};

export function SelectedEntitiesTable({ entities, defaultRows, onUpdateEntities }: SelectedEntitiesTableProps) {
  const emptyRowsCount = Math.max(0, defaultRows - entities.length);
  const visits = useVisitsQuery();
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected date to today
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState(todayString);

  // Calculate counts from entities
  const farmaciasCount = entities.filter((e) => e.type === 'farmacia').length;
  const medicosCount = entities.filter((e) => e.type === 'medico').length;

  // Handler to move an item up in the list
  const handleMoveUp = (index: number) => {
    if (index === 0) return; // Can't move up if already at the top
    const newEntities = [...entities];
    [newEntities[index - 1], newEntities[index]] = [newEntities[index], newEntities[index - 1]];
    onUpdateEntities(newEntities);
  };

  // Handler to move an item down in the list
  const handleMoveDown = (index: number) => {
    if (index === entities.length - 1) return; // Can't move down if already at the bottom
    const newEntities = [...entities];
    [newEntities[index], newEntities[index + 1]] = [newEntities[index + 1], newEntities[index]];
    onUpdateEntities(newEntities);
  };

  // Handler to delete an item from the list
  const handleDelete = (index: number) => {
    const newEntities = entities.filter((_, i) => i !== index);
    onUpdateEntities(newEntities);
  };

  // Handler to clear all entities
  const handleClearAll = () => {
    onUpdateEntities([]);
  };

  // Handler to toggle highlight for an item
  const handleToggleHighlight = (index: number) => {
    const newEntities = entities.map((entity, i) =>
      i === index ? { ...entity, isHighlighted: !entity.isHighlighted } : { ...entity, isHighlighted: false }
    );
    onUpdateEntities(newEntities);
  };

  // Handler to save visits
  const handleSaveVisits = async () => {
    if (entities.length === 0) return;

    setIsSaving(true);
    try {
      // Use the selected date for the planned visits
      const dateString = selectedDate;

      // Create visits with 30-minute intervals starting at 8:30am
      const newVisits: Array<Omit<Visita, 'id' | 'createdAt'>> = entities.map((entity, index) => {
        // Calculate time: 8:30am + (index * 30 minutes)
        const baseMinutes = 8 * 60 + 30; // 8:30am in minutes
        const totalMinutes = baseMinutes + (index * 30);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        return {
          fechaVisita: undefined,
          fechaVisitaPlaneada: `${dateString}T${timeString}`,
          entidadObjetivoTipo: entity.type,
          entidadObjetivoId: entity.data.id,
          estatus: 'pleaneado' as const,
          productoJson: [],
        };
      });

      // Save all visits in a single batch
      await visits.batchAdd(newVisits);

      // Reload visits to refresh the data
      await visits.reload();

      console.log(`Successfully saved ${newVisits.length} visits`);
      alert(`Se guardaron ${newVisits.length} visitas exitosamente`);
    } catch (error) {
      console.error('Error saving visits:', error);
      alert('Error al guardar las visitas. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Seleccionados ({farmaciasCount} farmacia
          {farmaciasCount !== 1 ? 's' : ''}, {medicosCount} médico
          {medicosCount !== 1 ? 's' : ''})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            type="date"
            label="Fecha de visita"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: 160 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveVisits}
            disabled={entities.length === 0 || isSaving}
            size="small"
          >
            {isSaving ? 'Guardando...' : 'Guardar Visitas'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ClearAllIcon />}
            onClick={handleClearAll}
            disabled={entities.length === 0}
            size="small"
          >
            Limpiar Todo
          </Button>
        </Box>
      </Box>
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
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entities.map((item, index) => (
              <TableRow key={`${item.type}-${item.data.id}`}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{item.data.nombreCuenta || 'Sin nombre'}</TableCell>
                <TableCell>
                  {item.type === 'medico' ? item.data.especialidad || '' : ''}
                </TableCell>
                <TableCell>{item.data.calle || ''}</TableCell>
                <TableCell>{item.data.colonia || ''}</TableCell>
                <TableCell>{item.data.nombreBrick || ''}</TableCell>
                <TableCell>
                  <Link
                    href={item.data.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver en Maps
                  </Link>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={item.isHighlighted ? 'Quitar resaltado' : 'Resaltar en mapa'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleHighlight(index)}
                        color={item.isHighlighted ? 'primary' : 'default'}
                        aria-label="resaltar en mapa"
                      >
                        <MyLocationIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Mover arriba">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          aria-label="mover arriba"
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Mover abajo">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === entities.length - 1}
                          aria-label="mover abajo"
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(index)}
                        color="error"
                        aria-label="eliminar"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {Array.from({ length: emptyRowsCount }).map((_, index) => (
              <TableRow key={`empty-${index}`}>
                <TableCell>{entities.length + index + 1}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
