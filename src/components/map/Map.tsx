import { useMemo, useState, useCallback, useEffect } from 'react';
import type { Icon, DivIcon } from 'leaflet';
import { FilterList, FilterAlt, Fullscreen, Crop, PinDrop } from '@mui/icons-material';
import type { Farmacia } from '../../__types__/pharmacy';
import type { Medico } from '../../__types__/doctor';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon as turfPolygon } from '@turf/helpers';
import {
  farmaciaIcon,
  farmaciaSelectedIcon,
  medicoIcon,
  medicoSelectedIcon,
  highlightedIcon,
  createCombinedIcon,
  createGroupedIcon,
} from './icons';
import { POLYGON_GEO_JSON } from './polygons';
import { MapContent, type MarkerData, type CombinedLocation } from './MapContent';

type SelectedEntity = {
  type: 'farmacia' | 'medico';
  id: string;
};

type SavedEntity =
  | { type: 'farmacia'; data: Farmacia; visitId: string; visitDate: Date; status: string }
  | { type: 'medico'; data: Medico; visitId: string; visitDate: Date; status: string };

interface MapProps {
  entities?: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>;
  savedEntities?: SavedEntity[];
  center?: [number, number];
  zoom?: number;
  selectedEntities?: SelectedEntity[];
  highlightedEntity?: SelectedEntity | null;
  onToggleSelection?: (entities: SelectedEntity[]) => void;
}

/**
 * Groups entities by their coordinates and tracks which have saved visits
 * Returns a map of combined locations keyed by "lat,lng"
 */
function groupByLocation(
  entities: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>,
  savedEntities: SavedEntity[]
): Map<string, CombinedLocation> {
  const locationMap = new Map<string, CombinedLocation>();

  // Create a set of saved entity IDs for quick lookup
  const savedEntityIds = new Set(savedEntities.map((e) => e.data.id));

  entities.forEach((entity) => {
    const lat = entity.data.lat;
    const lng = entity.data.lng;

    if (!lat || !lng) return;

    const key = `${lat},${lng}`;
    const existing = locationMap.get(key);

    if (existing) {
      if (entity.type === 'farmacia') {
        existing.farmacias.push(entity.data as Farmacia);
      } else {
        existing.medicos.push(entity.data as Medico);
      }
      if (savedEntityIds.has(entity.data.id)) {
        existing.savedEntityIds.add(entity.data.id);
      }
    } else {
      const newLocation: CombinedLocation = {
        lat,
        lng,
        farmacias: entity.type === 'farmacia' ? [entity.data as Farmacia] : [],
        medicos: entity.type === 'medico' ? [entity.data as Medico] : [],
        savedEntityIds: new Set(),
      };
      if (savedEntityIds.has(entity.data.id)) {
        newLocation.savedEntityIds.add(entity.data.id);
      }
      locationMap.set(key, newLocation);
    }
  });

  return locationMap;
}

/** Calculates distance between 2 points in km */
const getDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * MapView component that displays pharmacies (farmacias) and doctors (medicos) as markers
 *
 * @param entities - Array of entities with type and data (farmacias or medicos)
 * @param center - Map center coordinates [lat, lng] (default: [20.579117, -100.399349] - Queretaro, Mexico)
 * @param zoom - Initial zoom level (default: 11)
 * @param selectedEntities - Array of currently selected entities (pharmacies or doctors)
 * @param onToggleSelection - Callback to toggle entity selection
 */
export function MapView({
  entities = [],
  savedEntities = [],
  center = [20.579117, -100.399349],
  zoom = 11,
  selectedEntities = [],
  highlightedEntity = null,
  onToggleSelection,
}: MapProps) {
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [filterByPolygon, setFilterByPolygon] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<null | {
    lat: number;
    lng: number;
  }>(null);
  const [isAroundUserLocation, setIsAroundUserLocation] = useState(false);

  // Check if a point is inside any of the polygons
  const isPointInPolygon = useCallback((lat: number, lng: number): boolean => {
    const pt = point([lng, lat]); // Turf uses [lng, lat] format

    for (const feature of POLYGON_GEO_JSON.features) {
      if (feature.geometry.type === 'Polygon') {
        const poly = turfPolygon(feature.geometry.coordinates);
        if (booleanPointInPolygon(pt, poly)) {
          return true;
        }
      }
    }
    return false;
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const updateUserPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setCurrentUserLocation({ lat, lng });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setCurrentUserLocation(null);
          setIsAroundUserLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    // update immediately after mount
    updateUserPosition();

    const intervaIid = setInterval(() => {
      updateUserPosition();
    }, 30 * 1000);

    return () => {
      clearInterval(intervaIid);
    };
  }, []);

  // Prepare marker data with icons based on location composition and selection state
  const markers = useMemo(() => {
    const locationMap = groupByLocation(entities, savedEntities);
    const locations = Array.from(locationMap.values());

    return locations.map((location): MarkerData => {
      const hasFarmacias = location.farmacias.length > 0;
      const hasMedicos = location.medicos.length > 0;
      const hasMultipleFarmacias = location.farmacias.length > 1;
      const hasMultipleMedicos = location.medicos.length > 1;

      // Check if any entity at this location is selected or saved (both show as selected/yellow)
      const hasSelectedFarmacia = location.farmacias.some(
        (f) =>
          selectedEntities.some((e) => e.type === 'farmacia' && e.id === f.id) ||
          location.savedEntityIds.has(f.id)
      );
      const hasSelectedMedico = location.medicos.some(
        (m) =>
          selectedEntities.some((e) => e.type === 'medico' && e.id === m.id) ||
          location.savedEntityIds.has(m.id)
      );
      const isSelected = hasSelectedFarmacia || hasSelectedMedico;

      // Check if any entity at this location is highlighted
      const hasHighlightedFarmacia =
        highlightedEntity &&
        highlightedEntity.type === 'farmacia' &&
        location.farmacias.some((f) => f.id === highlightedEntity.id);
      const hasHighlightedMedico =
        highlightedEntity &&
        highlightedEntity.type === 'medico' &&
        location.medicos.some((m) => m.id === highlightedEntity.id);
      const isHighlighted = !!(hasHighlightedFarmacia || hasHighlightedMedico);

      // Determine which icon to use based on what's at this location
      let icon: Icon | DivIcon;

      // If highlighted, always use the star icon regardless of type
      if (isHighlighted) {
        icon = highlightedIcon;
      }
      // Mixed types at the same location (both farmacias and medicos) - use square split icon
      else if (hasFarmacias && hasMedicos) {
        icon = createCombinedIcon(isSelected, false);
      }
      // Multiple farmacias - use green circular badge
      else if (hasMultipleFarmacias) {
        icon = createGroupedIcon(location.farmacias.length, 'green', isSelected, false);
      }
      // Multiple medicos - use blue circular badge
      else if (hasMultipleMedicos) {
        icon = createGroupedIcon(location.medicos.length, 'blue', isSelected, false);
      }
      // Single medico - use blue pin
      else if (hasMedicos) {
        icon = isSelected ? medicoSelectedIcon : medicoIcon;
      }
      // Single farmacia - use green pin (default)
      else {
        icon = isSelected ? farmaciaSelectedIcon : farmaciaIcon;
      }

      return { location, icon, isSelected, isHighlighted };
    });
  }, [entities, selectedEntities, highlightedEntity, savedEntities]);

  // Filter markers based on selection and polygon filters
  const filteredMarkers = useMemo(() => {
    let filtered = [...markers];

    if (isAroundUserLocation && currentUserLocation) {
      filtered = filtered.filter((markerItem) => {
        return getDistance(currentUserLocation, markerItem.location) < 2.5;
      });
    }

    // Filter by selection
    if (showOnlySelected) {
      filtered = filtered.filter((marker) => marker.isSelected);
    }

    // Filter by polygon
    if (filterByPolygon) {
      filtered = filtered.filter((marker) =>
        isPointInPolygon(marker.location.lat, marker.location.lng)
      );
    }

    return filtered;
  }, [
    markers,
    showOnlySelected,
    filterByPolygon,
    isPointInPolygon,
    isAroundUserLocation,
    currentUserLocation,
  ]);

  return (
    <>
      {/* Normal Map View */}
      <div style={{ position: 'relative', height: '600px' }}>
        {/* Filter Button - Circular Bottom Left */}
        <button
          onClick={() => setShowOnlySelected(!showOnlySelected)}
          disabled={
            !showOnlySelected && selectedEntities.length === 0 && savedEntities.length === 0
          }
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            zIndex: 1000,
            width: '48px',
            height: '48px',
            padding: '0',
            cursor: 'pointer',
            backgroundColor: showOnlySelected ? '#2563eb' : 'white',
            color: showOnlySelected ? 'white' : '#374151',
            border: showOnlySelected ? 'none' : '2px solid #e5e7eb',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={showOnlySelected ? 'Mostrar todos' : 'Filtrar seleccionados'}
        >
          {showOnlySelected ? <FilterAlt /> : <FilterList />}
        </button>

        {/* Polygon Filter Button - Circular Bottom Left */}
        <button
          onClick={() => setFilterByPolygon(!filterByPolygon)}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '80px',
            zIndex: 1000,
            width: '48px',
            height: '48px',
            padding: '0',
            cursor: 'pointer',
            backgroundColor: filterByPolygon ? '#f59e0b' : 'white',
            color: filterByPolygon ? 'white' : '#374151',
            border: filterByPolygon ? 'none' : '2px solid #e5e7eb',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={filterByPolygon ? 'Mostrar todos' : 'Filtrar por polígonos'}
        >
          <Crop />
        </button>

        {currentUserLocation && (
          <button
            onClick={() => setIsAroundUserLocation((prev) => !prev)}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '140px',
              zIndex: 1000,
              width: '48px',
              height: '48px',
              padding: '0',
              cursor: 'pointer',
              backgroundColor: isAroundUserLocation ? '#f59e0b' : 'white',
              color: isAroundUserLocation ? 'white' : '#374151',
              border: isAroundUserLocation ? 'none' : '2px solid #e5e7eb',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Ver alrededor del usuario"
          >
            <PinDrop />
          </button>
        )}
        {/* Full Screen Toggle Button - Circular Bottom Left */}
        <button
          onClick={() => setIsFullScreen(true)}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '200px',
            zIndex: 1000,
            width: '48px',
            height: '48px',
            padding: '0',
            cursor: 'pointer',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Ver en pantalla completa"
        >
          <Fullscreen />
        </button>

        <MapContent
          userPosition={currentUserLocation}
          center={center}
          zoom={zoom}
          selectedEntities={selectedEntities}
          markers={filteredMarkers}
          onToggleSelection={onToggleSelection}
        />
      </div>

      {/* Full Screen Dialog */}
      {isFullScreen && (
        <dialog
          open
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            margin: 0,
            padding: 0,
            border: 'none',
            zIndex: 9999,
            backgroundColor: 'white',
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsFullScreen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 10000,
              width: '48px',
              height: '48px',
              padding: '0',
              fontSize: '24px',
              cursor: 'pointer',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Cerrar pantalla completa"
          >
            ✕
          </button>

          {/* Filter Button in Full Screen - Circular Bottom Left */}
          <button
            onClick={() => setShowOnlySelected(!showOnlySelected)}
            disabled={
              !showOnlySelected && selectedEntities.length === 0 && savedEntities.length === 0
            }
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              zIndex: 10000,
              width: '48px',
              height: '48px',
              padding: '0',
              cursor: 'pointer',
              backgroundColor: showOnlySelected ? '#2563eb' : 'white',
              color: showOnlySelected ? 'white' : '#374151',
              border: showOnlySelected ? 'none' : '2px solid #e5e7eb',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={showOnlySelected ? 'Mostrar todos' : 'Filtrar seleccionados'}
          >
            {showOnlySelected ? <FilterAlt /> : <FilterList />}
          </button>

          {/* Polygon Filter Button in Full Screen - Circular Bottom Left */}
          <button
            onClick={() => setFilterByPolygon(!filterByPolygon)}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '80px',
              zIndex: 10000,
              width: '48px',
              height: '48px',
              padding: '0',
              cursor: 'pointer',
              backgroundColor: filterByPolygon ? '#f59e0b' : 'white',
              color: filterByPolygon ? 'white' : '#374151',
              border: filterByPolygon ? 'none' : '2px solid #e5e7eb',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={filterByPolygon ? 'Mostrar todos' : 'Filtrar por polígonos'}
          >
            <Crop />
          </button>

          <button
            onClick={() => setIsAroundUserLocation((prev) => !prev)}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '140px',
              zIndex: 10000,
              width: '48px',
              height: '48px',
              padding: '0',
              cursor: 'pointer',
              backgroundColor: isAroundUserLocation ? '#f59e0b' : 'white',
              color: isAroundUserLocation ? 'white' : '#374151',
              border: isAroundUserLocation ? 'none' : '2px solid #e5e7eb',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Ver alrededor del usuario"
          >
            <PinDrop />
          </button>

          <div style={{ width: '100%', height: '100%' }}>
            <MapContent
              userPosition={currentUserLocation}
              center={center}
              zoom={zoom}
              selectedEntities={selectedEntities}
              markers={filteredMarkers}
              onToggleSelection={onToggleSelection}
            />
          </div>
        </dialog>
      )}
    </>
  );
}
