import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Icon, DivIcon } from 'leaflet';
import type { Farmacia } from '../../__types__/pharmacy';
import type { Medico } from '../../__types__/doctor';
import 'leaflet/dist/leaflet.css';
import './Map.css';
import {
  farmaciaIcon,
  farmaciaSelectedIcon,
  medicoIcon,
  medicoSelectedIcon,
  highlightedIcon,
  createCombinedIcon,
  createGroupedIcon,
} from './icons';

type SelectedEntity = {
  type: 'farmacia' | 'medico';
  id: string;
};

type SavedEntity =
  | { type: 'farmacia'; data: Farmacia; visitId: string; plannedVisitDate: string; visitDate?: string; status: string }
  | { type: 'medico'; data: Medico; visitId: string; plannedVisitDate: string; visitDate?: string; status: string };

interface MapProps {
  entities?: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>;
  savedEntities?: SavedEntity[];
  center?: [number, number];
  zoom?: number;
  selectedEntities?: SelectedEntity[];
  highlightedEntity?: SelectedEntity | null;
  onToggleSelection?: (entities: SelectedEntity[]) => void;
}

// Combined location type for markers at the same coordinates
interface CombinedLocation {
  lat: number;
  lng: number;
  farmacias: Farmacia[];
  medicos: Medico[];
  savedEntityIds: Set<string>; // IDs of entities with saved visits
}

// Prepared marker data ready for rendering
type MarkerData = {
  location: CombinedLocation;
  icon: Icon | DivIcon;
  isSelected: boolean;
  isHighlighted: boolean;
};

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
  const savedEntityIds = new Set(savedEntities.map(e => e.data.id));

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
      const hasSelectedFarmacia = location.farmacias.some((f) =>
        selectedEntities.some((e) => e.type === 'farmacia' && e.id === f.id) || location.savedEntityIds.has(f.id)
      );
      const hasSelectedMedico = location.medicos.some((m) =>
        selectedEntities.some((e) => e.type === 'medico' && e.id === m.id) || location.savedEntityIds.has(m.id)
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

  // Filter markers if "show only selected" is enabled
  const filteredMarkers = useMemo(() => {
    if (!showOnlySelected) return markers;
    return markers.filter((marker) => marker.isSelected);
  }, [markers, showOnlySelected]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Filter Button */}
       <button
        onClick={() => setShowOnlySelected(!showOnlySelected)}
        disabled={!showOnlySelected && selectedEntities.length === 0 && savedEntities.length === 0}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          backgroundColor: showOnlySelected ? '#2563eb' : 'white',
          color: showOnlySelected ? 'white' : '#374151',
          border: '2px solid #e5e7eb',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        {showOnlySelected ? 'Mostrar Todos' : 'Solo Seleccionados'}
      </button>
    
      <MapContainer center={center} zoom={zoom} style={{ height: '600px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render markers with prepared data */}
      {filteredMarkers.map((marker, index) => {
        const { location, icon } = marker;

        return (
          <Marker key={`location-${index}`} position={[location.lat, location.lng]} icon={icon}>
            <Popup maxWidth={300}>
              <div className="popup-container">
                {/* Select All Button */}
                {(location.farmacias.length + location.medicos.length > 1) && (
                  <div style={{ marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    <button
                      onClick={() => {
                        const allEntities: SelectedEntity[] = [
                          ...location.farmacias.map(f => ({ type: 'farmacia' as const, id: f.id })),
                          ...location.medicos.map(m => ({ type: 'medico' as const, id: m.id }))
                        ];
                        onToggleSelection?.(allEntities);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        width: '100%',
                      }}
                    >
                      Seleccionar Todos ({location.farmacias.length + location.medicos.length})
                    </button>
                  </div>
                )}
                {/* Render all farmacias at this location */}
                {location.farmacias.map((farmacia, farmaciaIndex) => {
                  const isLastItem =
                    location.medicos.length === 0 &&
                    farmaciaIndex === location.farmacias.length - 1;
                  const isFarmaciaSelected = selectedEntities.some(
                    (e) => e.type === 'farmacia' && e.id === farmacia.id
                  );
                  const isFarmaciaSaved = location.savedEntityIds.has(farmacia.id);
                  return (
                    <div
                      key={`farmacia-${farmaciaIndex}`}
                      className={isLastItem ? '' : 'popup-item'}
                    >
                      <div className="popup-title">
                        <h3>
                          Farmacia{' '}
                          {location.farmacias.length > 1
                            ? `(${farmaciaIndex + 1}/${location.farmacias.length})`
                            : ''}
                          {isFarmaciaSaved && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#059669', fontWeight: 'bold' }}>
                              ✓ Guardada
                            </span>
                          )}
                        </h3>
                        {!isFarmaciaSaved && (
                          <button
                            onClick={() => onToggleSelection?.([{ type: 'farmacia', id: farmacia.id }])}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              backgroundColor: isFarmaciaSelected ? '#dc2626' : '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                            }}
                          >
                            {isFarmaciaSelected ? 'Deseleccionar' : 'Seleccionar'}
                          </button>
                        )}
                      </div>
                      {farmacia.nombreCuenta && (
                        <p className="popup-field">
                          <strong>Nombre:</strong> {farmacia.nombreCuenta}
                        </p>
                      )}
                      {farmacia.calle && (
                        <p className="popup-field">
                          <strong>Dirección:</strong> {farmacia.calle} {'  '}
                          <a
                            href={farmacia.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            ( Maps )
                          </a>
                        </p>
                      )}

                      <p className="popup-field">
                        <strong>Brick:</strong>{' '}
                        {farmacia.nombreBrick || (
                          <span className="popup-no-brick">(Sin Brick)</span>
                        )}
                      </p>
                    </div>
                  );
                })}

                {/* Render all medicos at this location */}
                {location.medicos.map((medico, medicoIndex) => {
                  const isLastItem = medicoIndex === location.medicos.length - 1;
                  const isMedicoSelected = selectedEntities.some(
                    (e) => e.type === 'medico' && e.id === medico.id
                  );
                  const isMedicoSaved = location.savedEntityIds.has(medico.id);
                  return (
                    <div
                      key={`medico-${medicoIndex}`}
                      className={isLastItem ? '' : 'popup-item'}
                    >
                      <div className="popup-title">
                        <h3>
                          Médico{' '}
                          {location.medicos.length > 1
                            ? `(${medicoIndex + 1}/${location.medicos.length})`
                            : ''}
                          {isMedicoSaved && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>
                              ✓ Guardado
                            </span>
                          )}
                        </h3>
                        {!isMedicoSaved && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => onToggleSelection?.([{ type: 'medico', id: medico.id }])}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                backgroundColor: isMedicoSelected ? '#dc2626' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                              }}
                            >
                              {isMedicoSelected ? 'Deseleccionar' : 'Seleccionar'}
                            </button>
                          </div>
                        )}
                      </div>
                      {medico.nombreCuenta && (
                        <p className="popup-field">
                          <strong>Nombre:</strong> {medico.nombreCuenta}
                        </p>
                      )}
                      {medico.especialidad && (
                        <p className="popup-field">
                          <strong>Especialidad:</strong> {medico.especialidad}
                        </p>
                      )}
                      {medico.calle && (
                        <p className="popup-field">
                          <strong>Dirección:</strong> {medico.calle} {'  '}
                          <a href={medico.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                            ( Maps )
                          </a>
                        </p>
                      )}

                      <p className="popup-field">
                        <strong>Brick:</strong>{' '}
                        {medico.nombreBrick || <span className="popup-no-brick">(Sin Brick)</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
    </div>
  );
}
