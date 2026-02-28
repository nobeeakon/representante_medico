import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Stack,
  Button,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { MapView } from './map/Map';
import { SelectedEntitiesTable } from './SelectedEntitiesTable';
import { GoogleAuth } from '../google-sheets/GoogleAuth';
import { CreateEntityDialog } from './CreateEntityDialog';
import { ManageProductsDialog } from './ManageProductsDialog';
import { MapFilters } from './MapFilters';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita, VisitaStatus } from '../__types__/visita';
import type { Producto } from '../__types__/producto';
import { nonNullable } from '../utils';

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
  const [mapFilteredEntities, setMapFilteredEntities] = useState<
    Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>
  >([]);
  const [selectedEntities, setSelectedEntities] = useState<
    Array<
      | { type: 'farmacia'; data: Farmacia }
      | { type: 'medico'; data: Medico }
    >
  >([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayString;
  });
  const [highlightedEntity, setHighlightedEntity] = useState<{ type: 'medico' | 'farmacia'; id: string } | null>(null);
  const [showCreateEntityDialog, setShowCreateEntityDialog] = useState(false);
  const [showManageProductsDialog, setShowManageProductsDialog] = useState(false);


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


  const handleFilteredEntitiesChange = useCallback((entities: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>) => {
    setMapFilteredEntities(entities);
  }, []);

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
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
        </Box>

        {/* Map Filters */}
        <MapFilters
          pharmacies={pharmacies}
          doctors={doctors}
          visits={visits}
          onFilteredEntitiesChange={handleFilteredEntitiesChange}
        />

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
    </Container>
  );
}
