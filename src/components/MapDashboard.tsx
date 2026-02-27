import { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import { MapView } from './map/Map';
import { BrickFilter, NO_BRICK } from './BrickFilter';
import { SelectedEntitiesTable } from './SelectedEntitiesTable';
import { GoogleAuth } from '../google-sheets/GoogleAuth';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita, VisitaStatus } from '../__types__/visita';
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

type MapDashboardProps = {
  pharmacies: Farmacia[];
  doctors: Medico[];
  visitsQuery: VisitsQuery;
};

export function MapDashboard({ pharmacies, doctors, visitsQuery }: MapDashboardProps) {
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

  // Filter entities based on selected bricks and visibility toggles
  const mapFilteredEntities = useMemo(() => {
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

      farmaciasToAdd.forEach((farmacia) => {
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

      medicosToAdd.forEach((medico) => {
        entities.push({ type: 'medico', data: medico });
      });
    }

    return entities;
  }, [pharmacies, doctors, selectedBricks, showFarmacias, showMedicos]);

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

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Mapa de Farmacias y Médicos
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <GoogleAuth />
          </Box>
        </Box>

        {/* Brick Filter */}
        <BrickFilter bricks={availableBricks} value={selectedBricks} onChange={setSelectedBricks} />

        {/* Visibility Toggles */}
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

        {/* Stats */}
        <Stack spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Mostrando ({mapFilteredEntities.filter((e) => e.type === 'farmacia').length}/
            {pharmacies.length}) farmacias
            {mapFilteredEntities.filter((e) => e.type === 'medico').length}/{doctors.length}) médicos
          </Typography>
        </Stack>

        {/* Map */}
        <Box>
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
    </Container>
  );
}
