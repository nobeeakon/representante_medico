import { useState, useMemo, useCallback } from 'react';
import { Box, Container, Stack, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { MapView } from './map/Map';
import { SelectedEntitiesTable } from './SelectedEntitiesTable';
import { GoogleAuth } from '../google-sheets/GoogleAuth';
import { CreateEntityDialog, type FormData } from './CreateEntityDialog';
import { ManageProductsDialog } from './ManageProductsDialog';
import { MapFilters } from './MapFilters';
import { useDateUrlSync } from './useTableUrlSync';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita, VisitaStatus } from '../__types__/visita';
import type { Producto } from '../__types__/producto';
import { nonNullable } from '../utils';
import type { Doctor } from '../__types__';

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

const getFormData = (
  itemInfo: { data: Farmacia; type: 'farmacia' } | { data: Medico; type: 'medico' }
): FormData => {
  switch (itemInfo.type) {
    case 'farmacia':
      return {
        entityType: 'farmacia' as const,
        nombreCuenta: itemInfo.data.nombreCuenta ?? '',
        email: itemInfo.data.email ?? '',
        phone: itemInfo.data.phone ?? '',
        estado: itemInfo.data.estado ?? '',
        municipio: itemInfo.data.municipio ?? '',
        colonia: itemInfo.data.colonia ?? '',
        calle: itemInfo.data.calle ?? '',
        codigoPostal: itemInfo.data.codigoPostal ?? '',
        especialidad: itemInfo.data.especialidad ?? '',
        estatus: itemInfo.data.estatus ?? '',
        lat: itemInfo.data.lat,
        lng: itemInfo.data.lng,
        googleMapsUrl: itemInfo.data.googleMapsUrl ?? '',
        territorio: itemInfo.data.territorio ?? '',
        pais: itemInfo.data.pais ?? '',
        ruta: itemInfo.data.ruta ?? '',
        plantillaClientes: itemInfo.data.plantillaClientes ?? '',
        folioTienda: itemInfo.data.folioTienda ?? '',
        cedulaProfesional: itemInfo.data.cedulaProfesional ?? '',
        grupoCadena: itemInfo.data.grupoCadena ?? '',
        categoriaMedico: itemInfo.data.categoriaMedico ?? '',
        propietarioCuenta: itemInfo.data.propietarioCuenta ?? '',
        ciudad: '',
      };
    case 'medico':
      return {
        entityType: 'medico' as const,
        nombreCuenta: itemInfo.data.nombreCuenta ?? '',
        email: itemInfo.data.email ?? '',
        phone: itemInfo.data.phone ?? '',
        estado: itemInfo.data.estado ?? '',
        municipio: '',
        colonia: itemInfo.data.colonia ?? '',
        calle: itemInfo.data.calle ?? '',
        codigoPostal: itemInfo.data.codigoPostal ?? '',
        especialidad: itemInfo.data.especialidad ?? '',
        estatus: itemInfo.data.estatus ?? '',
        lat: itemInfo.data.lat,
        lng: itemInfo.data.lng,
        googleMapsUrl: itemInfo.data.googleMapsUrl ?? '',
        territorio: '',
        pais: '',
        ruta: '',
        plantillaClientes: '',
        folioTienda: '',
        cedulaProfesional: '',
        grupoCadena: '',
        categoriaMedico: '',
        propietarioCuenta: '',
        ciudad: itemInfo.data.ciudad ?? '',
      };
    default: {
      throw new Error('unhandled item type', itemInfo);
    }
  }
};

const getSavedEntities = ({
  selectedDate,
  visits,
  doctors,
  pharmacies,
}: {
  selectedDate: string;
  visits: Visita[];
  doctors: Doctor[];
  pharmacies: Farmacia[];
}) => {
  // Filter visits for the selected date (comparing dates at day level in local timezone)
  // Parse date string as local time, not UTC
  const [year, month, day] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
  const nextDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  const visitsTargetDate = visits.filter((visitItem) => {
    return visitItem.fechaVisita >= selectedDateObj && visitItem.fechaVisita < nextDay;
  });

  const visitsMap: {
    medico: Map<string, Array<{ visitId: string; visitDate: Date; status: VisitaStatus }>>;
    farmacia: Map<string, Array<{ visitId: string; visitDate: Date; status: VisitaStatus }>>;
  } = { medico: new Map(), farmacia: new Map() };

  visitsTargetDate.forEach((visitItem) => {
    const visitData = {
      visitId: visitItem.id,
      visitDate: visitItem.fechaVisita,
      status: visitItem.estatus,
    };

    if (visitItem.entidadObjetivoTipo === 'farmacia') {
      const currentVisits = visitsMap.farmacia.get(visitItem.entidadObjetivoId) ?? [];
      visitsMap.farmacia.set(visitItem.entidadObjetivoId, [...currentVisits, visitData]);
    } else if (visitItem.entidadObjetivoTipo === 'medico') {
      const currentVisits = visitsMap.medico.get(visitItem.entidadObjetivoId) ?? [];
      visitsMap.medico.set(visitItem.entidadObjetivoId, [...currentVisits, visitData]);
    }
  });

  const doctorsVisits = doctors
    .map((doctorItem) => {
      const visitData = visitsMap.medico.get(doctorItem.id);
      if (!visitData) {
        return null;
      }

      return visitData.map((visitItem) => ({
        type: 'medico' as const,
        data: doctorItem,
        ...visitItem,
      }));
    })
    .filter(nonNullable)
    .flat();

  const pharmaciesVisits = pharmacies
    .map((pharmacyItem) => {
      const visitData = visitsMap.farmacia.get(pharmacyItem.id);
      if (!visitData || visitData.length === 0) {
        return null;
      }

      return visitData.map((visitItem) => ({
        type: 'farmacia' as const,
        data: pharmacyItem,
        ...visitItem,
      }));
    })
    .filter(nonNullable)
    .flat();

  return [...doctorsVisits, ...pharmaciesVisits];
};

export function MapDashboard({
  pharmaciesQuery,
  doctorsQuery,
  visitsQuery,
  productosQuery,
}: MapDashboardProps) {
  const pharmacies = pharmaciesQuery.data;
  const doctors = doctorsQuery.data;
  const visits = visitsQuery.data;
  const [mapFilteredEntities, setMapFilteredEntities] = useState<
    Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>
  >([]);
  const [selectedEntities, setSelectedEntities] = useState<
    Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>
  >([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayString;
  });

  // Sync selected date with URL query parameter
  useDateUrlSync(selectedDate, setSelectedDate);

  const [highlightedEntity, setHighlightedEntity] = useState<{
    type: 'medico' | 'farmacia';
    id: string;
  } | null>(null);
  const [showCreateEntityDialog, setShowCreateEntityDialog] = useState<
    true | null | { type: 'medico' | 'farmacia'; id: string }
  >(null);
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
      const newEntities: Array<
        { type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }
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
    return getSavedEntities({ selectedDate, visits, pharmacies, doctors });
  }, [selectedDate, visits, pharmacies, doctors]);

  const handleFilteredEntitiesChange = useCallback(
    (entities: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>) => {
      setMapFilteredEntities(entities);
    },
    []
  );

  const toggleHighlight = (entity: { type: 'medico' | 'farmacia'; id: string }) => {
    setHighlightedEntity((prev) => {
      // If the same entity is already highlighted, unhighlight it
      if (prev && prev.type === entity.type && prev.id === entity.id) {
        return null;
      }
      // Otherwise, highlight the new entity
      return entity;
    });
  };

  const handleUpdateOrSaveEntity = async (
    newItemInfo:
      | { type: 'medico'; data: Omit<Medico, 'id' | 'createdAt'> }
      | { type: 'farmacia'; data: Omit<Farmacia, 'id' | 'createdAt'> }
  ) => {
    const isUpdate = !!showCreateEntityDialog && typeof showCreateEntityDialog === 'object';

    try {
      if (!isUpdate) {
        if (newItemInfo.type === 'medico') {
          await doctorsQuery.add(newItemInfo.data);
          await doctorsQuery.reload();
        } else if (newItemInfo.type === 'farmacia') {
          await pharmaciesQuery.add(newItemInfo.data);
          await pharmaciesQuery.reload();
        }
        console.log(`Successfully saved new entity`);
      } else {
        if (newItemInfo.type === 'medico') {
          const targetItem = doctorsQuery.data.find(
            (pharmacyItem) => pharmacyItem.id === showCreateEntityDialog.id
          );
          if (targetItem) {
            await doctorsQuery.updateItem(targetItem.id, { ...targetItem, ...newItemInfo.data });
            await doctorsQuery.reload();
          }
        } else if (newItemInfo.type === 'farmacia') {
          const targetItem = pharmaciesQuery.data.find(
            (pharmacyItem) => pharmacyItem.id === showCreateEntityDialog.id
          );
          if (targetItem) {
            await pharmaciesQuery.updateItem(targetItem.id, { ...targetItem, ...newItemInfo.data });
            await pharmaciesQuery.reload();
          }
        }

        console.log(`Successfully updated the Medico`);
      }
      alert(isUpdate ? 'Actualizado' : 'Nuevo medico agregado');
    } catch (error) {
      console.error(`Error al ${isUpdate ? 'actualizar' : 'agregar'}:`, error);
      alert(
        `Error al ${isUpdate ? 'Actualizado' : 'agregar'} un item. Por favor intenta de nuevo.`
      );
    }
  };

  const onEditEntity = (entityInfo: { id: string; type: 'medico' | 'farmacia' }) => {
    setShowCreateEntityDialog({ id: entityInfo.id, type: entityInfo.type });
  };

  const entityToEdit = useMemo<undefined | FormData>(() => {
    if (!showCreateEntityDialog || typeof showCreateEntityDialog !== 'object') {
      return undefined;
    }

    if (showCreateEntityDialog.type === 'farmacia') {
      const targetItem = pharmacies.find(
        (pharmacyItem) => pharmacyItem.id === showCreateEntityDialog.id
      );

      if (targetItem) {
        getFormData({ type: 'farmacia', data: targetItem });
      }
    } else if (showCreateEntityDialog.type === 'medico') {
      const targetItem = doctors.find(
        (pharmacyItem) => pharmacyItem.id === showCreateEntityDialog.id
      );

      if (targetItem) {
        getFormData({ type: 'medico', data: targetItem });
      }
    }
  }, [showCreateEntityDialog, pharmacies, doctors]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <GoogleAuth />
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
              Prod
            </Button>
          </Box>
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
          onEditEntity={onEditEntity}
        />

        {/* Map Filters */}
        <MapFilters
          pharmacies={pharmacies}
          doctors={doctors}
          visits={visits}
          selectedDate={selectedDate}
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
      </Stack>

      {/* Create Entity Dialog */}
      {!!showCreateEntityDialog && (
        <CreateEntityDialog
          onClose={() => setShowCreateEntityDialog(null)}
          onSave={handleUpdateOrSaveEntity}
          entity={entityToEdit}
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
