import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import 'leaflet/dist/leaflet.css';
import './Map.css';

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
  onToggleSelection?: (entity: SelectedEntity) => void;
}

// Combined location type for markers at the same coordinates
interface CombinedLocation {
  lat: number;
  lng: number;
  farmacias: Farmacia[];
  medicos: Medico[];
}

// Custom icons for different marker types (standard pins)
const farmaciaIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const farmaciaSelectedIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const medicoIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const medicoSelectedIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Creates a square icon for locations with both farmacias and medicos
 * Uses a split color design: green (left) for farmacias, blue (right) for medicos
 */
function createCombinedIcon(isSelected = false) {
  const colors = isSelected
    ? { left: '#f59e0b', right: '#f59e0b' } // Gold for selected
    : { left: '#059669', right: '#2563eb' }; // Green and blue for normal

  return divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(90deg, ${colors.left} 50%, ${colors.right} 50%);
        border: 3px solid white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <span style="
          font-size: 20px;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        ">●</span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Creates a circular badge icon for grouped locations
 * @param count - Number of entities at this location
 * @param color - Background color (green for farmacias, blue for medicos)
 * @param isSelected - Whether any entity at this location is selected
 */
function createGroupedIcon(count: number, color: 'green' | 'blue', isSelected = false) {
  const bgColor = isSelected ? '#f59e0b' : color === 'green' ? '#059669' : '#2563eb';

  return divIcon({
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background-color: ${bgColor};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${count}</div>
    `,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

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
  onToggleSelection,
}: MapProps) {
  // Group markers by location to handle overlapping coordinates
  const locationMap = groupByLocation(farmacias, medicos);
  const locations = Array.from(locationMap.values());

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '600px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render combined markers for each unique location */}
      {locations.map((location, index) => {
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

        // Determine which icon to use based on what's at this location
        let icon;

        // Mixed types at the same location (both farmacias and medicos) - use square split icon
        if (hasFarmacias && hasMedicos) {
          icon = createCombinedIcon(isSelected);
        }
        // Multiple farmacias - use green circular badge
        else if (hasMultipleFarmacias) {
          icon = createGroupedIcon(location.farmacias.length, 'green', isSelected);
        }
        // Multiple medicos - use blue circular badge
        else if (hasMultipleMedicos) {
          icon = createGroupedIcon(location.medicos.length, 'blue', isSelected);
        }
        // Single medico - use blue pin
        else if (hasMedicos) {
          icon = isSelected ? medicoSelectedIcon : medicoIcon;
        }
        // Single farmacia - use green pin (default)
        else {
          icon = isSelected ? farmaciaSelectedIcon : farmaciaIcon;
        }

        return (
          <Marker key={`location-${index}`} position={[location.lat, location.lng]} icon={icon}>
            <Popup maxWidth={300}>
              <div className="popup-container">
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
                      style={{
                        backgroundColor: isFarmaciaSelected ? '#fef3c7' : 'transparent',
                        padding: isFarmaciaSelected ? '8px' : '0',
                        borderRadius: '4px',
                      }}
                    >
                      <div className="popup-title">
                        <h3>
                          Farmacia{' '}
                          {location.farmacias.length > 1
                            ? `(${farmaciaIndex + 1}/${location.farmacias.length})`
                            : ''}
                        </h3>
                        <button
                          onClick={() => onToggleSelection?.({ type: 'farmacia', id: farmacia.id })}
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
                      style={{
                        backgroundColor: isMedicoSelected ? '#fef3c7' : 'transparent',
                        padding: isMedicoSelected ? '8px' : '0',
                        borderRadius: '4px',
                      }}
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
                            onClick={() => onToggleSelection?.({ type: 'medico', id: medico.id })}
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
  );
}
