import { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Checkbox,
  FormControlLabel,
  Stack,
  Button,
  Collapse,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { MapView } from './map/Map';
import { BrickFilter, NO_BRICK } from './BrickFilter';
import { SelectedEntitiesTable } from './SelectedEntitiesTable';
import { GoogleAuth } from '../google-sheets/GoogleAuth';
import { CreateEntityDialog } from './CreateEntityDialog';
import { ManageProductsDialog } from './ManageProductsDialog';
import { VisitHistoryFilterDialog, type VisitHistoryFilterConfig } from './VisitHistoryFilterDialog';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita, VisitaStatus } from '../__types__/visita';
import type { Producto } from '../__types__/producto';
import {nonNullable} from '../utils';


// Extracts unique brick names from entities, sorted alphabetically
// Adds "No Brick" option if any entities lack a brick assignment
function getAvailableBricks(entities: Array<{ nombreBrick?: string }>): string[] {
  const brickSet = new Set<string>();
  let hasUndefinedBrick = false;

  entities.forEach((entity) => {
    if (entity.nombreBrick) {
      brickSet.add(entity.nombreBrick);
    } else {
      hasUndefinedBrick = true;
    }
  });

  const bricksArray = Array.from(brickSet).sort();

  if (hasUndefinedBrick) {
    bricksArray.push(NO_BRICK);
  }

  return bricksArray;
}

type QueryInterface<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
  add: (newItem: Omit<T, 'id' | 'createdAt'>) => Promise<T>;
  updateItem: (id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

type VisitsQuery = QueryInterface<Visita> & {
  batchAdd: (newItems: Array<Omit<Visita, 'id' | 'createdAt'>>) => Promise<Visita[]>;
};

type MapDashboardProps = {
  pharmaciesQuery: QueryInterface<Farmacia>;
  doctorsQuery: QueryInterface<Medico>;
  visitsQuery: VisitsQuery;
  productosQuery: QueryInterface<Producto>;
};

export function MapDashboard({ pharmaciesQuery, doctorsQuery, visitsQuery, productosQuery }: MapDashboardProps) {
  const pharmacies = pharmaciesQuery.data;
  const doctors = doctorsQuery.data;
  const visits = visitsQuery.data;
  const [selectedBricks, setSelectedBricks] = useState<string[]>([]);
  const [showFarmacias, setShowFarmacias] = useState<boolean>(true);
  const [showMedicos, setShowMedicos] = useState<boolean>(true);
  const [selectedEntities, setSelectedEntities] = useState<
    Array<
      | { type: 'farmacia'; data: Farmacia }
      | { type: 'medico'; data: Medico }
    >
  >([]);
  const [selectedDate, setSelectedDate] = useState(() =>   {const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return todayString;
    });
  const [highlightedEntity, setHighlightedEntity] = useState<{ type: 'medico' | 'farmacia'; id: string } | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<{
    brickFilter: boolean;
    entityTypeFilter: boolean;
  }>({ brickFilter: false, entityTypeFilter: false });
  const [showCreateEntityDialog, setShowCreateEntityDialog] = useState(false);
  const [showManageProductsDialog, setShowManageProductsDialog] = useState(false);
  const [showVisitHistoryFilterDialog, setShowVisitHistoryFilterDialog] = useState(false);
  const [visitHistoryFilter, setVisitHistoryFilter] = useState<VisitHistoryFilterConfig>({ type: 'none' });


  // Handler to toggle entity selection (supports single or multiple entities)
  const toggleEntitySelection = (entities: Array<{ type: 'farmacia' | 'medico'; id: string }>) => {
    // Check if all entities in the array are currently selected
    const allSelected = entities.every((entity) =>
      selectedEntities.some((e) => e.type === entity.type && e.data.id === entity.id)
    );

    if (allSelected) {
      // If all are selected, deselect all
      setSelectedEntities((prev) =>
        prev.filter(
          (e) => !entities.some((entity) => entity.type === e.type && entity.id === e.data.id)
        )
      );
    } else {
      // If any are not selected, select all that aren't already selected
      const newEntities: Array<
        | { type: 'farmacia'; data: Farmacia }
        | { type: 'medico'; data: Medico }
      > = [];

      entities.forEach((entity) => {
        const isAlreadySelected = selectedEntities.some(
          (e) => e.type === entity.type && e.data.id === entity.id
        );

        if (!isAlreadySelected) {
          if (entity.type === 'farmacia') {
            const farmacia = pharmacies.find((f) => f.id === entity.id);
            if (farmacia) {
              newEntities.push({ type: 'farmacia', data: farmacia });
            }
          } else {
            const medico = doctors.find((m) => m.id === entity.id);
            if (medico) {
              newEntities.push({ type: 'medico', data: medico });
            }
          }
        }
      });

      if (newEntities.length > 0) {
        setSelectedEntities((prev) => [...prev, ...newEntities]);
      }
    }
  };


  const savedEntities = useMemo(() => {
      const visitsTargetDate = visits.filter(visitItem => visitItem.fechaVisitaPlaneada.includes(selectedDate));

      const visitsMap: {
        medico: Map<string, Array<{visitId: string; plannedVisitDate: string; visitDate?: string; status: VisitaStatus}>>;
        farmacia: Map<string, Array<{visitId: string; plannedVisitDate: string; visitDate?: string; status: VisitaStatus}>>;
      } = {medico: new Map(), farmacia: new Map()};

      visitsTargetDate.forEach(visitItem => {
        const visitData = {visitId: visitItem.id, plannedVisitDate: visitItem.fechaVisitaPlaneada, visitDate: visitItem.fechaVisita, status: visitItem.estatus};

        if (visitItem.entidadObjetivoTipo === 'farmacia') {
          const currentVisits = visitsMap.farmacia.get(visitItem.entidadObjetivoId) ?? [];
          visitsMap.farmacia.set(visitItem.entidadObjetivoId, [...currentVisits, visitData]);
        } else if(visitItem.entidadObjetivoTipo === 'medico') {
          const currentVisits = visitsMap.medico.get(visitItem.entidadObjetivoId) ?? [];
          visitsMap.medico.set(visitItem.entidadObjetivoId, [...currentVisits, visitData]);
        }
      });

      const doctorsVisits = doctors
        .map(doctorItem =>  {
          const visitData = visitsMap.medico.get(doctorItem.id);
          if (!visitData) {
            return null;
          }

          return visitData.map(visitItem => ({type: 'medico' as const, data: doctorItem, ...visitItem}));
        })
        .filter(nonNullable)
        .flat();

      const pharmaciesVisits = pharmacies
        .map(pharmacyItem =>  {
          const visitData = visitsMap.farmacia.get(pharmacyItem.id);
          if (!visitData || visitData.length === 0) {
            return null;
          }

          return visitData.map(visitItem => ({type: 'farmacia' as const, data: pharmacyItem, ...visitItem}));
        })
        .filter(nonNullable)
        .flat();

      return [...doctorsVisits, ...pharmaciesVisits];

  }, [selectedDate, visits, pharmacies, doctors])


  const availableBricks = useMemo(
    () => getAvailableBricks([...pharmacies, ...doctors]),
    [pharmacies, doctors]
  );

  // Filter entities based on selected bricks, visibility toggles, and visit history
  const mapFilteredEntities = useMemo(() => {
    // Helper function to check if an entity passes the visit history filter
    const passesVisitHistoryFilter = (entityType: 'farmacia' | 'medico', entityId: string): boolean => {
      if (visitHistoryFilter.type === 'none') {
        return true;
      }

      // Get all visits for this entity
      const entityVisits = visits.filter(
        (v) => v.entidadObjetivoTipo === entityType && v.entidadObjetivoId === entityId
      );

      if (visitHistoryFilter.type === 'never-visited') {
        return entityVisits.length === 0;
      }

      if (visitHistoryFilter.type === 'only-not-found') {
        // Entity must have at least one visit and all visits must be "noEncontrado"
        if (entityVisits.length === 0) {
          return false;
        }
        return entityVisits.every((v) => v.estatus === 'noEncontrado');
      }

      if (visitHistoryFilter.type === 'not-visited-since') {
        const daysThreshold = visitHistoryFilter.daysSince ?? 30;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        const thresholdString = thresholdDate.toISOString().split('T')[0];

        // No visits at all means it passes
        if (entityVisits.length === 0) {
          return true;
        }

        // Get the most recent visit date
        const mostRecentVisit = entityVisits
          .filter((v) => v.fechaVisita) // Only consider visits with actual visit date
          .sort((a, b) => (b.fechaVisita ?? '').localeCompare(a.fechaVisita ?? ''))
          .at(0);

        // If no visits with actual dates, consider it as never visited
        if (!mostRecentVisit || !mostRecentVisit.fechaVisita) {
          return true;
        }

        // Check if most recent visit is older than threshold
        return mostRecentVisit.fechaVisita < thresholdString;
      }

      if (visitHistoryFilter.type === 'visited-within-days') {
        const daysThreshold = visitHistoryFilter.daysSince ?? 30;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        const thresholdString = thresholdDate.toISOString().split('T')[0];

        // No visits at all means it doesn't pass
        if (entityVisits.length === 0) {
          return false;
        }

        // Get the most recent visit date
        const mostRecentVisit = entityVisits
          .filter((v) => v.fechaVisita) // Only consider visits with actual visit date
          .sort((a, b) => (b.fechaVisita ?? '').localeCompare(a.fechaVisita ?? ''))
          .at(0);

        // If no visits with actual dates, doesn't pass
        if (!mostRecentVisit || !mostRecentVisit.fechaVisita) {
          return false;
        }

        // Check if most recent visit is within the threshold (newer than or equal to threshold)
        return mostRecentVisit.fechaVisita >= thresholdString;
      }

      return true;
    };

    const entities: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }> = [];

    // Add filtered pharmacies
    if (showFarmacias) {
      const farmaciasToAdd =
        selectedBricks.length === 0
          ? pharmacies
          : pharmacies.filter((farmacia) => {
              if (selectedBricks.includes(NO_BRICK) && !farmacia.nombreBrick) {
                return true;
              }
              return farmacia.nombreBrick && selectedBricks.includes(farmacia.nombreBrick);
            });

      // Apply visit history filter
      const farmaciasWithVisitFilter = farmaciasToAdd.filter((farmacia) =>
        passesVisitHistoryFilter('farmacia', farmacia.id)
      );

      farmaciasWithVisitFilter.forEach((farmacia) => {
        entities.push({ type: 'farmacia', data: farmacia });
      });
    }

    // Add filtered doctors
    if (showMedicos) {
      const medicosToAdd =
        selectedBricks.length === 0
          ? doctors
          : doctors.filter((medico) => {
              if (selectedBricks.includes(NO_BRICK) && !medico.nombreBrick) {
                return true;
              }
              return medico.nombreBrick && selectedBricks.includes(medico.nombreBrick);
            });

      // Apply visit history filter
      const medicosWithVisitFilter = medicosToAdd.filter((medico) =>
        passesVisitHistoryFilter('medico', medico.id)
      );

      medicosWithVisitFilter.forEach((medico) => {
        entities.push({ type: 'medico', data: medico });
      });
    }

    return entities;
  }, [pharmacies, doctors, selectedBricks, showFarmacias, showMedicos, visitHistoryFilter, visits]);

  const toggleHighlight = (entity: { type: 'medico' | 'farmacia'; id: string }) => {
    setHighlightedEntity(prev => {
      // If the same entity is already highlighted, unhighlight it
      if (prev && prev.type === entity.type && prev.id === entity.id) {
        return null;
      }
      // Otherwise, highlight the new entity
      return entity;
    });
  };

  // Handle saving new doctor
  const handleSaveDoctor = async (doctor: Omit<Medico, 'id' | 'createdAt'>) => {
    await doctorsQuery.add(doctor);
  };

  // Handle saving new pharmacy
  const handleSavePharmacy = async (pharmacy: Omit<Farmacia, 'id' | 'createdAt'>) => {
    await pharmaciesQuery.add(pharmacy);
  };


  return (
    <Container maxWidth='xl' sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Mapa de Farmacias y Médicos
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <GoogleAuth />
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateEntityDialog(true)}
          >
            Entidad
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setShowManageProductsDialog(true)}
          >
            Productos
          </Button>
          <Button
            variant={filterVisibility.brickFilter ? 'contained' : 'outlined'}
            onClick={() => setFilterVisibility(prev => ({ ...prev, brickFilter: !prev.brickFilter }))}
          >
             Bricks
          </Button>
          <Button
            variant={filterVisibility.entityTypeFilter ? 'contained' : 'outlined'}
            onClick={() => setFilterVisibility(prev => ({ ...prev, entityTypeFilter: !prev.entityTypeFilter }))}
          >
             Entidades
          </Button>
          <Button
            variant={visitHistoryFilter.type !== 'none' ? 'contained' : 'outlined'}
            color={visitHistoryFilter.type !== 'none' ? 'secondary' : 'primary'}
            onClick={() => setShowVisitHistoryFilterDialog(true)}
          >
            Historial
            {visitHistoryFilter.type !== 'none' && (
              <Chip
                label="●"
                size="small"
                color="secondary"
                sx={{ ml: 1, height: '20px', minWidth: '20px', '& .MuiChip-label': { px: 0.5 } }}
              />
            )}
          </Button>
        </Box>

        {/* Brick Filter */}
        <Collapse in={filterVisibility.brickFilter}>
          <BrickFilter bricks={availableBricks} value={selectedBricks} onChange={setSelectedBricks} />
        </Collapse>

        {/* Visibility Toggles */}
        <Collapse in={filterVisibility.entityTypeFilter}>
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
                <Typography
                  sx={{ fontWeight: showFarmacias ? 'bold' : 'normal', color: 'success.main' }}
                >
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
                <Typography
                  sx={{ fontWeight: showMedicos ? 'bold' : 'normal', color: 'primary.main' }}
                >
                  ● Médicos
                </Typography>
              }
            />
          </Box>
        </Collapse>

        {/* Stats */}
        <Stack spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Mostrando ({mapFilteredEntities.filter((e) => e.type === 'farmacia').length}/
            {pharmacies.length}) farmacias ({mapFilteredEntities.filter((e) => e.type === 'medico').length}/{doctors.length}) médicos
          </Typography>
          {visitHistoryFilter.type !== 'none' && (
            <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 'bold' }}>
              {visitHistoryFilter.type === 'never-visited' && '🔍 Filtro: Nunca visitadas'}
              {visitHistoryFilter.type === 'not-visited-since' &&
                `🔍 Filtro: No visitadas desde hace ${visitHistoryFilter.daysSince} días`}
              {visitHistoryFilter.type === 'visited-within-days' &&
                `🔍 Filtro: Visitadas en los últimos ${visitHistoryFilter.daysSince} días`}
              {visitHistoryFilter.type === 'only-not-found' && '🔍 Filtro: Solo marcadas como "No encontrado"'}
            </Typography>
          )}
        </Stack>

        {/* Map */}
        <Box paddingX={6}>
          <MapView
            entities={mapFilteredEntities}
            savedEntities={savedEntities}
            selectedEntities={selectedEntities.map((e) => ({ type: e.type, id: e.data.id }))}
            highlightedEntity={highlightedEntity}
            onToggleSelection={toggleEntitySelection}
          />
        </Box>

        {/* Selected Entities Table */}
        <SelectedEntitiesTable
          entities={selectedEntities}
          savedEntities={savedEntities}
          visitsQuery={visitsQuery}
          defaultRows={15}
          selectedDate={selectedDate}
          doctors={doctors}
          pharmacies={pharmacies}
          onUpdateEntities={setSelectedEntities}
          highlightedEntity={highlightedEntity}
          onToggleHighlight={toggleHighlight}
          onDateChange={setSelectedDate}
        />
      </Stack>

      {/* Create Entity Dialog */}
      {showCreateEntityDialog && (
        <CreateEntityDialog
          onClose={() => setShowCreateEntityDialog(false)}
          onSaveDoctor={handleSaveDoctor}
          onSavePharmacy={handleSavePharmacy}
        />
      )}

      {/* Manage Products Dialog */}
      <ManageProductsDialog
        open={showManageProductsDialog}
        onClose={() => setShowManageProductsDialog(false)}
        productos={productosQuery.data}
        onAdd={productosQuery.add}
        onUpdate={productosQuery.updateItem}
        onDelete={productosQuery.deleteItem}
      />

      {/* Visit History Filter Dialog */}
      <VisitHistoryFilterDialog
        open={showVisitHistoryFilterDialog}
        currentFilter={visitHistoryFilter}
        onClose={() => setShowVisitHistoryFilterDialog(false)}
        onApply={setVisitHistoryFilter}
      />
    </Container>
  );
}
