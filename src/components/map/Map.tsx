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
  farmaciaHighlightedIcon,
  medicoIcon,
  medicoSelectedIcon,
  medicoHighlightedIcon,
  createCombinedIcon,
  createGroupedIcon,
} from './icons';

type SelectedEntity = {
  type: 'farmacia' | 'medico';
  id: string;
};

interface MapProps {
  farmacias?: Farmacia[];
  medicos?: Medico[];
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
}

// Prepared marker data ready for rendering
type MarkerData = {
  location: CombinedLocation;
  icon: Icon | DivIcon;
  isSelected: boolean;
  isHighlighted: boolean;
};

/**
 * Groups farmacias and medicos by their coordinates
 * Returns a map of combined locations keyed by "lat,lng"
 */
function groupByLocation(farmacias: Farmacia[], medicos: Medico[]): Map<string, CombinedLocation> {
  const locationMap = new Map<string, CombinedLocation>();

  // Add farmacias to the map
  farmacias.forEach((farmacia) => {
    if (!farmacia.lat || !farmacia.lng) return;

    const key = `${farmacia.lat},${farmacia.lng}`;
    const existing = locationMap.get(key);

    if (existing) {
      existing.farmacias.push(farmacia);
    } else {
      locationMap.set(key, {
        lat: farmacia.lat,
        lng: farmacia.lng,
        farmacias: [farmacia],
        medicos: [],
      });
    }
  });

  // Add medicos to the map
  medicos.forEach((medico) => {
    if (!medico.lat || !medico.lng) return;

    const key = `${medico.lat},${medico.lng}`;
    const existing = locationMap.get(key);

    if (existing) {
      existing.medicos.push(medico);
    } else {
      locationMap.set(key, {
        lat: medico.lat,
        lng: medico.lng,
        farmacias: [],
        medicos: [medico],
      });
    }
  });

  return locationMap;
}

/**
 * MapView component that displays pharmacies (farmacias) and doctors (medicos) as markers
 *
 * @param farmacias - Array of pharmacy locations
 * @param medicos - Array of doctor locations
 * @param center - Map center coordinates [lat, lng] (default: [20.579117, -100.399349] - Queretaro, Mexico)
 * @param zoom - Initial zoom level (default: 11)
 * @param selectedEntities - Array of currently selected entities (pharmacies or doctors)
 * @param onToggleSelection - Callback to toggle entity selection
 */
export function MapView({
  farmacias = [],
  medicos = [],
  center = [20.579117, -100.399349],
  zoom = 11,
  selectedEntities = [],
  highlightedEntity = null,
  onToggleSelection,
}: MapProps) {
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Prepare marker data with icons based on location composition and selection state
  const markers = useMemo(() => {
    const locationMap = groupByLocation(farmacias, medicos);
    const locations = Array.from(locationMap.values());

    return locations.map((location): MarkerData => {
      const hasFarmacias = location.farmacias.length > 0;
      const hasMedicos = location.medicos.length > 0;
      const hasMultipleFarmacias = location.farmacias.length > 1;
      const hasMultipleMedicos = location.medicos.length > 1;

      // Check if any entity at this location is selected
      const hasSelectedFarmacia = location.farmacias.some((f) =>
        selectedEntities.some((e) => e.type === 'farmacia' && e.id === f.id)
      );
      const hasSelectedMedico = location.medicos.some((m) =>
        selectedEntities.some((e) => e.type === 'medico' && e.id === m.id)
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

      // Mixed types at the same location (both farmacias and medicos) - use square split icon
      if (hasFarmacias && hasMedicos) {
        icon = createCombinedIcon(isSelected, isHighlighted);
      }
      // Multiple farmacias - use green circular badge
      else if (hasMultipleFarmacias) {
        icon = createGroupedIcon(location.farmacias.length, 'green', isSelected, isHighlighted);
      }
      // Multiple medicos - use blue circular badge
      else if (hasMultipleMedicos) {
        icon = createGroupedIcon(location.medicos.length, 'blue', isSelected, isHighlighted);
      }
      // Single medico - use blue pin
      else if (hasMedicos) {
        if (isHighlighted) {
          icon = medicoHighlightedIcon;
        } else {
          icon = isSelected ? medicoSelectedIcon : medicoIcon;
        }
      }
      // Single farmacia - use green pin (default)
      else {
        if (isHighlighted) {
          icon = farmaciaHighlightedIcon;
        } else {
          icon = isSelected ? farmaciaSelectedIcon : farmaciaIcon;
        }
      }

      return { location, icon, isSelected, isHighlighted };
    });
  }, [farmacias, medicos, selectedEntities, highlightedEntity]);

  // Filter markers if "show only selected" is enabled
  const filteredMarkers = useMemo(() => {
    if (!showOnlySelected) return markers;
    return markers.filter((marker) => marker.isSelected);
  }, [markers, showOnlySelected]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Filter Button */}
      {selectedEntities.length > 0 && <button
        onClick={() => setShowOnlySelected(!showOnlySelected)}
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
      }
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
                        </h3>
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
                        </h3>
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
