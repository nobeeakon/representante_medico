import { useState, useMemo } from 'react';
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
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ClearAll as ClearAllIcon,
  MyLocation as MyLocationIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Add as AddIcon,
  EventRepeat as EventRepeatIcon,
  History as HistoryIcon,
  Place as PlaceIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { CreateVisitDialog } from './CreateVisitDialog';
import { EditVisitDialog } from './EditVisitDialog';
import { VisitHistoryDialog } from './VisitHistoryDialog';
import { useStatusFilterUrlSync } from './useTableUrlSync';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita } from '../__types__/visita';

// TODO complete the date planner: what happens when I update a planning, filter in the map, etc



const STATUS_DISPLAY: Record<string, {text: string; color: string; bgColor: string}> = {
      planeado: { text: 'Programado', color: '#1976d2', bgColor: '#e3f2fd' },
    visitado:{ text: 'Visitado', color: '#2e7d32', bgColor: '#e8f5e9' },
    noEncontrado: { text: 'No Encontrado', color: '#d32f2f', bgColor: '#ffebee' },
}

const Status = ({status, isSaved}:{status: string|null; isSaved?:boolean}) => {
  const statusInfo = STATUS_DISPLAY[status??''];
        if (!statusInfo) return;

                      return (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '12px',
                            fontWeight: isSaved ? 'bold' : 'normal',
                            color: statusInfo.color,
                            backgroundColor: statusInfo.bgColor,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontStyle: isSaved ? 'normal' : 'italic',
                          }}
                        >
                          {statusInfo.text}
                        </Typography>
                      );

}

const TimeDisplay = ({dateString}:{dateString?: Date}) => {
  if (!dateString) return null;

  const hours = dateString.getHours();
  const hasValidTime = hours >= 6;

  return (
    <Typography
      variant="body2"
      sx={{
        color: hasValidTime ? 'text.primary' : 'text.disabled',
        fontStyle: hasValidTime ? 'normal' : 'italic',
      }}
    >
      {hasValidTime
        ? dateString.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : '--:--'}
    </Typography>
  );
}


type SelectedEntity =
  | { type: 'farmacia'; data: Farmacia; date?: string; estatus?: string }
  | { type: 'medico'; data: Medico; date?: string; estatus?: string};

type SavedEntity =
  | { type: 'farmacia'; data: Farmacia; visitId: string; visitDate: Date; status: string }
  | { type: 'medico'; data: Medico; visitId: string; visitDate: Date; status: string };

type VisitsQuery = {
  data: Visita[];
  loading: boolean;
  error: string | null;
  add: (newItem: Omit<Visita, 'id' | 'createdAt'>) => Promise<Visita>;
  batchAdd: (newItems: Array<Omit<Visita, 'id' | 'createdAt'>>) => Promise<Visita[]>;
  updateItem: (id: string, data: Partial<Omit<Visita, 'id' | 'createdAt'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

type SelectedEntitiesTableProps = {
  entities: SelectedEntity[];
  savedEntities: SavedEntity[];
  visitsQuery: VisitsQuery;
  defaultRows: number;
  selectedDate: string;
  highlightedEntity: { type: 'medico' | 'farmacia'; id: string } | null;
  doctors: Medico[];
  pharmacies: Farmacia[];
  onUpdateEntities: (entities: SelectedEntity[]) => void;
  onToggleHighlight: (entity: { type: 'medico' | 'farmacia'; id: string }) => void;
  onDateChange: (date: string) => void;
};

export function SelectedEntitiesTable({ entities, savedEntities, visitsQuery, defaultRows, selectedDate, highlightedEntity, doctors, pharmacies, onUpdateEntities, onToggleHighlight, onDateChange }: SelectedEntitiesTableProps) {
  const visits = visitsQuery;
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [draftVisit, setDraftVisit] = useState<Visita | null>(null);
  const [historyEntity, setHistoryEntity] = useState<{ type: 'medico' | 'farmacia'; data: Medico | Farmacia } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Sync status filter with URL query parameter
  useStatusFilterUrlSync(selectedStatuses, setSelectedStatuses);

  // Sort saved entities by date (earliest first)
  const sortedSavedEntities = [...savedEntities].sort((a, b) => {
    return a.visitDate.getTime() - b.visitDate.getTime();
  });

  // Combine selected and saved entities for display
  const unfilteredEntities = useMemo(() => {
    const unfiltered = [...entities, ...sortedSavedEntities];


    return unfiltered;
  }, [entities, sortedSavedEntities])

  // Filter entities based on search query and status
  const allEntities = useMemo(() => {
    let filtered = [...unfilteredEntities];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const searchableText = [
          item.data.nombreCuenta || '',
          item.type === 'medico' ? item.data.especialidad || '' : '',
          item.data.calle || '',
          item.data.colonia || '',
          item.data.nombreBrick || '',
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Apply status filter (only for saved entities)
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((item) => {
        // Keep all unsaved entities
        if (!('visitId' in item)) return true;
        // Filter saved entities by status
        return selectedStatuses.includes(item.status);
      });
    }

    return filtered;
  }, [unfilteredEntities, searchQuery, selectedStatuses]);

  const emptyRowsCount = Math.max(0, defaultRows - allEntities.length);

  // Calculate counts from all entities
  const farmaciasCount = allEntities.filter((e) => e.type === 'farmacia').length;
  const medicosCount = allEntities.filter((e) => e.type === 'medico').length;

  // Helper to warn about unsaved entities
  const warnUnsavedEntities = (): boolean => {
    if (entities.length === 0) return true;

    const count = entities.length;
    const plural = count !== 1;
    return confirm(
      `Tienes ${count} ${plural ? 'entidades seleccionadas' : 'entidad seleccionada'} sin guardar. ¿Continuar?`
    );
  };

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
    const entity = entities[index];
    if (entity) {
      onToggleHighlight({ type: entity.type, id: entity.data.id });
    }
  };

  // Handler to save visits
  const handleSaveVisits = async () => {
    if (entities.length === 0) return;

    setIsSaving(true);
    try {
      // Use the selected date for the planned visits
      const dateString = selectedDate;

      // Create visits with minute intervals starting at 0:00am
      const newVisits: Array<Omit<Visita, 'id' | 'createdAt'>> = entities.map((entity, index) => {
        // Calculate time: 0:00am + (index ) , this is to make it evident that the expected date was not set (non sensical)
        const minutes = 0 + (index);
        const hours = 0;
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        const dateTime = `${dateString}T${timeString}`;

        return {
          fechaVisita: new Date(dateTime),
          fechaVisitaPlaneada: dateTime,
          entidadObjetivoTipo: entity.type,
          entidadObjetivoId: entity.data.id,
          estatus: 'planeado' as const,
          productoJson: [],
        };
      });

      // Save all visits in a single batch
      await visits.batchAdd(newVisits);

      // Reload visits to refresh the data
      await visits.reload();

      // Clear selected entities - they are now saved entities
      onUpdateEntities([]);

      console.log(`Successfully saved ${newVisits.length} visits`);
      alert(`Se guardaron ${newVisits.length} visitas exitosamente`);
    } catch (error) {
      console.error('Error saving visits:', error);
      alert('Error al guardar las visitas. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler to delete a saved visit
  const handleDeleteVisit = async (visitId: string) => {
    if (!warnUnsavedEntities()) return;

    if (!confirm('¿Estás seguro de que deseas eliminar esta visita guardada?')) {
      return;
    }

    try {
      await visits.deleteItem(visitId);
      await visits.reload();
      console.log(`Successfully deleted visit ${visitId}`);
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert('Error al eliminar la visita. Por favor intenta de nuevo.');
    }
  };


  // Handler to create a new visit from the dialog
  const handleCreateVisit = async (visit: Omit<Visita, 'id' | 'createdAt'>) => {
    await visits.add(visit);
    await visits.reload();
    alert('Visita creada exitosamente');
  };

  // Handler to update a visit from the edit dialog
  const handleUpdateVisit = async (visitId: string, updates: Partial<Omit<Visita, 'id' | 'createdAt'>>) => {
    try {
      await visits.updateItem(visitId, updates);
      await visits.reload();
      console.log(`Successfully updated visit ${visitId}`);
    } catch (error) {
      console.error('Error updating visit:', error);
      throw error; // Re-throw so the dialog can handle it
    }
  };

  // Handler to save a draft visit (creating it for the first time)
  const handleSaveDraftVisit = async (_visitId: string, updates: Partial<Omit<Visita, 'id' | 'createdAt'>>) => {
    if (!draftVisit) return;

    try {
      // Merge draft with updates to create the final visit
      const visitDate = updates.fechaVisita ?? draftVisit.fechaVisita;
      const newVisit: Omit<Visita, 'id' | 'createdAt'> = {
        fechaVisita: visitDate,
        fechaVisitaPlaneada: visitDate.toISOString(), // Keep in sync for backward compatibility
        entidadObjetivoTipo: draftVisit.entidadObjetivoTipo,
        entidadObjetivoId: draftVisit.entidadObjetivoId,
        estatus: updates.estatus ?? draftVisit.estatus,
        productoJson: updates.productoJson ?? draftVisit.productoJson,
        etiquetasIds: updates.etiquetasIds ?? draftVisit.etiquetasIds,
        nota: updates.nota ?? draftVisit.nota,
      };

      await visits.add(newVisit);
      await visits.reload();
      setDraftVisit(null);
      console.log('Successfully created visit');
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error; // Re-throw so the dialog can handle it
    }
  };

  // Handler to open edit dialog with a draft visit for an entity
  const handleCreateVisitForEntity = (entity: SavedEntity) => {
    // Create a draft visit object that will be saved when user clicks save in the dialog
    const plannedDateTime = `${selectedDate}T09:00:00`; // Default to 9:00 AM
    const draft: Visita = {
      id: 'draft-' + Date.now(), // Temporary ID
      createdAt: new Date().toISOString(),
      fechaVisita: new Date(plannedDateTime),
      fechaVisitaPlaneada: plannedDateTime,
      entidadObjetivoTipo: entity.type,
      entidadObjetivoId: entity.data.id,
      estatus: 'planeado' as const,
      productoJson: [],
    };

    setDraftVisit(draft);
  };

  // Find the visit being edited
  const editingVisit = useMemo(() => {
    if (!editingVisitId) return null;
    return visits.data.find(v => v.id === editingVisitId);
  }, [editingVisitId, visits.data]);

  // Find the entity for the editing visit
  const editingEntity = useMemo(() => {
    if (!editingVisit) return null;

    if (editingVisit.entidadObjetivoTipo === 'medico') {
      const doctor = doctors.find(d => d.id === editingVisit.entidadObjetivoId);
      return doctor ? { type: 'medico' as const, name: doctor.nombreCuenta || 'Sin nombre' } : null;
    } else {
      const pharmacy = pharmacies.find(p => p.id === editingVisit.entidadObjetivoId);
      return pharmacy ? { type: 'farmacia' as const, name: pharmacy.nombreCuenta || 'Sin nombre' } : null;
    }
  }, [editingVisit, doctors, pharmacies]);

  // Find the entity for the draft visit
  const draftEntity = useMemo(() => {
    if (!draftVisit) return null;

    if (draftVisit.entidadObjetivoTipo === 'medico') {
      const doctor = doctors.find(d => d.id === draftVisit.entidadObjetivoId);
      return doctor ? { type: 'medico' as const, name: doctor.nombreCuenta || 'Sin nombre' } : null;
    } else {
      const pharmacy = pharmacies.find(p => p.id === draftVisit.entidadObjetivoId);
      return pharmacy ? { type: 'farmacia' as const, name: pharmacy.nombreCuenta || 'Sin nombre' } : null;
    }
  }, [draftVisit, doctors, pharmacies]);

  return (
    <Box>
      {isCreateDialogOpen && (
        <CreateVisitDialog
          onClose={() => setIsCreateDialogOpen(false)}
          doctors={doctors}
          pharmacies={pharmacies}
          onSave={handleCreateVisit}
        />
      )}
      {editingVisit && editingEntity && (
        <EditVisitDialog
          visit={editingVisit}
          entityName={editingEntity.name}
          entityType={editingEntity.type}
          onClose={() => setEditingVisitId(null)}
          onSave={handleUpdateVisit}
        />
      )}
      {draftVisit && draftEntity && (
        <EditVisitDialog
          visit={draftVisit}
          entityName={draftEntity.name}
          entityType={draftEntity.type}
          onClose={() => setDraftVisit(null)}
          onSave={handleSaveDraftVisit}
          mode="duplicate"
        />
      )}
      {historyEntity && (
        <VisitHistoryDialog
          open={true}
          entity={historyEntity}
          visits={visits.data}
          onClose={() => setHistoryEntity(null)}
        />
      )}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 2
      }}>

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          {/* Primary actions - always visible */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flexWrap: { xs: 'nowrap', sm: 'wrap' }
          }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
              size="small"
            >
              Visita
            </Button>
            <TextField
              type="date"
              label="Fecha de visita"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              size="small"
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ minWidth: { xs: '140px', sm: 160 } }}
            />
            {/* Toggle button - only on mobile */}
            <IconButton
              size="small"
              onClick={() => setShowMobileActions(!showMobileActions)}
              sx={{
                display: { xs: 'flex', sm: 'none' },
                bgcolor: showMobileActions ? 'action.selected' : 'transparent',
              }}
              aria-label="mostrar más acciones"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          {/* Secondary actions - collapsible on mobile, always visible on desktop */}
          <Box sx={{
            display: {
              xs: showMobileActions ? 'flex' : 'none',
              sm: 'flex'
            },
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' }
          }}>
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
      </Box>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: 2
      }}>
        <TextField
          label="Buscar"
          placeholder="Nombre, especialidad, calle, colonia..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
          <InputLabel id="status-filter-label">Filtrar por estatus</InputLabel>
          <Select
            labelId="status-filter-label"
            multiple
            value={selectedStatuses}
            onChange={(e) => setSelectedStatuses(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
            input={<OutlinedInput label="Filtrar por estatus" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip
                    key={value}
                    label={STATUS_DISPLAY[value]?.text || value}
                    size="small"
                    sx={{
                      backgroundColor: STATUS_DISPLAY[value]?.bgColor,
                      color: STATUS_DISPLAY[value]?.color,
                    }}
                  />
                ))}
              </Box>
            )}
          >
            {Object.entries(STATUS_DISPLAY).map(([key, info]) => (
              <MenuItem key={key} value={key}>
                <Chip
                  label={info.text}
                  size="small"
                  sx={{
                    backgroundColor: info.bgColor,
                    color: info.color,
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box px={2}>
              <Typography variant="body2" color="text.secondary">
           {farmaciasCount}/{unfilteredEntities.filter(item => item.type === 'farmacia').length} farmacias
          , {medicosCount}/{unfilteredEntities.filter(item => item.type === 'medico').length} médicos
          
        </Typography>
      </Box>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}></TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Hora</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Estatus</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Especialidad</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Calle</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Colonia</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Brick</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allEntities.map((item, index) => {
              const isSaved = 'visitId' in item;
              const isSavedEntity = index >= entities.length; // Saved entities come after selected entities

              return (
                <TableRow
                  key={isSaved ? `saved-${item.visitId}` : `${item.type}-${item.data.id}`}
                  sx={isSaved && item.status ? { backgroundColor: STATUS_DISPLAY[item.status]?.bgColor || '#f0f9ff' } : {}}
                >
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{index + 1}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {isSaved ? <TimeDisplay dateString={item.visitDate} /> : ''}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Status
                      isSaved={isSaved}
                      status={isSaved?item.status:null}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {item.data.nombreCuenta || 'Sin nombre'}
                      </Typography>
                      <Tooltip title="Ver historial de visitas">
                        <IconButton
                          size="small"
                          onClick={() => setHistoryEntity({ type: item.type, data: item.data })}
                          aria-label="ver historial"
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {item.type === 'medico' ? item.data.especialidad || '' : ''}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{item.data.calle || ''}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{item.data.colonia || ''}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{item.data.nombreBrick || ''}</TableCell>
                  <TableCell>
                    {isSaved ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Tooltip title="Ver en Google Maps">
                          <IconButton
                            size="small"
                            component="a"
                            href={item.data.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="ver en google maps"
                          >
                            <PlaceIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={
                          highlightedEntity && highlightedEntity.type === item.type && highlightedEntity.id === item.data.id
                            ? 'Quitar resaltado'
                            : 'Resaltar en mapa'
                        }>
                          <IconButton
                            size="small"
                            onClick={() => onToggleHighlight({ type: item.type, id: item.data.id })}
                            color={
                              highlightedEntity && highlightedEntity.type === item.type && highlightedEntity.id === item.data.id
                                ? 'primary'
                                : 'default'
                            }
                            aria-label="resaltar en mapa"
                            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                          >
                            <MyLocationIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar visita">
                          <IconButton
                            size="small"
                            onClick={() => setEditingVisitId(item.visitId)}
                            color="primary"
                            aria-label="editar visita"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Crear nueva visita en fecha seleccionada">
                          <IconButton
                            size="small"
                            onClick={() => handleCreateVisitForEntity(item)}
                            color="success"
                            aria-label="crear visita"
                          >
                            <EventRepeatIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar visita guardada">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteVisit(item.visitId)}
                            color="error"
                            aria-label="eliminar visita"
                            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Tooltip title="Ver en Google Maps">
                          <IconButton
                            size="small"
                            component="a"
                            href={item.data.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="ver en google maps"
                          >
                            <PlaceIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={
                          highlightedEntity && highlightedEntity.type === item.type && highlightedEntity.id === item.data.id
                            ? 'Quitar resaltado'
                            : 'Resaltar en mapa'
                        }>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleHighlight(index)}
                            color={
                              highlightedEntity && highlightedEntity.type === item.type && highlightedEntity.id === item.data.id
                                ? 'primary'
                                : 'default'
                            }
                            aria-label="resaltar en mapa"
                            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
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
                              disabled={index === entities.length - 1 || isSavedEntity}
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
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {Array.from({ length: emptyRowsCount }).map((_, index) => (
              <TableRow key={`empty-${index}`}>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{allEntities.length + index + 1}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}></TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}></TableCell>
                <TableCell></TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}></TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}></TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}></TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}></TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
