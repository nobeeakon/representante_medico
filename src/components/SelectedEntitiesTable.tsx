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
  Edit as EditIcon,
  Add as AddIcon,
  EventRepeat as EventRepeatIcon,
} from '@mui/icons-material';
import { CreateVisitDialog } from './CreateVisitDialog';
import { EditVisitDialog } from './EditVisitDialog';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita } from '../__types__/visita';

// TODO complete the date planner: what happens when I update a planning, filter in the map, etc



const STATUS_DISPLAY: Record<string, {text: string; color: string; bgColor: string}> = {
      planeado: { text: 'Planeado', color: '#1976d2', bgColor: '#e3f2fd' },
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

const TimeDisplay = ({dateString}:{dateString?: string}) => {
  if (!dateString) return null;

  const date = new Date(dateString);
  const hours = date.getHours();
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
        ? date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : '--:--'}
    </Typography>
  );
}


type SelectedEntity =
  | { type: 'farmacia'; data: Farmacia; date?: string; estatus?: string }
  | { type: 'medico'; data: Medico; date?: string; estatus?: string};

type SavedEntity =
  | { type: 'farmacia'; data: Farmacia; visitId: string; plannedVisitDate: string; visitDate?: string; status: string }
  | { type: 'medico'; data: Medico; visitId: string; plannedVisitDate: string; visitDate?: string; status: string };

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

  // Sort saved entities by date (earliest first)
  const sortedSavedEntities = [...savedEntities].sort((a, b) => {
    return new Date(a.plannedVisitDate).getTime() - new Date(b.plannedVisitDate).getTime();
  });

  // Combine selected and saved entities for display
  const allEntities = [...entities, ...sortedSavedEntities];
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

        return {
          fechaVisita: undefined,
          fechaVisitaPlaneada: `${dateString}T${timeString}`,
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
      const newVisit: Omit<Visita, 'id' | 'createdAt'> = {
        fechaVisita: updates.fechaVisita ?? draftVisit.fechaVisita,
        fechaVisitaPlaneada: updates.fechaVisitaPlaneada ?? draftVisit.fechaVisitaPlaneada,
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
    const draft: Visita = {
      id: 'draft-' + Date.now(), // Temporary ID
      createdAt: new Date().toISOString(),
      fechaVisita: undefined,
      fechaVisitaPlaneada: `${selectedDate}T09:00:00`, // Default to 9:00 AM
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Seleccionados ({farmaciasCount} farmacia
          {farmaciasCount !== 1 ? 's' : ''}, {medicosCount} médico
          {medicosCount !== 1 ? 's' : ''})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateDialogOpen(true)}
            size="small"
          >
            Nueva Visita
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
              <TableCell>Hora Planeada</TableCell>
              <TableCell>Hora</TableCell>
              <TableCell>Estatus</TableCell>
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
            {allEntities.map((item, index) => {
              const isSaved = 'visitId' in item;
              const isSavedEntity = index >= entities.length; // Saved entities come after selected entities

              return (
                <TableRow
                  key={isSaved ? `saved-${item.visitId}` : `${item.type}-${item.data.id}`}
                  sx={isSaved ? { backgroundColor: '#f0f9ff' } : {}}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {isSaved ? <TimeDisplay dateString={item.plannedVisitDate} /> : ''}
                  </TableCell>
                  <TableCell>
                    {isSaved ? <TimeDisplay dateString={item.visitDate} /> : ''}
                  </TableCell>
                  <TableCell>
                    <Status
                      isSaved={isSaved}
                      status={isSaved?item.status:null}
                    />
                  </TableCell>
                  <TableCell>
                    {item.data.nombreCuenta || 'Sin nombre'}
                    {isSaved && (
                      <Typography component="span" sx={{ ml: 1, fontSize: '11px', color: '#2563eb', fontWeight: 'bold' }}>
                        ✓ Guardada
                      </Typography>
                    )}
                  </TableCell>
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
                    {isSaved ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                <TableCell>{allEntities.length + index + 1}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
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
