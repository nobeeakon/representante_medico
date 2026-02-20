import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import type { Farmacia } from '../__types__/farmacia';
import type { Medico } from '../__types__/medico';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  farmacias?: Farmacia[];
  medicos?: Medico[];
  center?: [number, number];
  zoom?: number;
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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const medicoIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Purple icon for locations with both farmacias and medicos
const combinedIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * Creates a circular badge icon for grouped locations
 * @param count - Number of entities at this location
 * @param color - Background color (green for farmacias, blue for medicos)
 */
function createGroupedIcon(count: number, color: 'green' | 'blue') {
  const bgColor = color === 'green' ? '#059669' : '#2563eb';

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
    popupAnchor: [0, -18]
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
        medicos: []
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
        medicos: [medico]
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
 */
export function MapView({ farmacias = [], medicos = [], center = [20.579117, -100.399349], zoom = 11 }: MapProps) {
  // Group markers by location to handle overlapping coordinates
  const locationMap = groupByLocation(farmacias, medicos);
  const locations = Array.from(locationMap.values());

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '600px', width: '100%' }}
    >
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

        // Determine which icon to use based on what's at this location
        let icon;

        // Mixed types at the same location (both farmacias and medicos) - use purple pin
        if (hasFarmacias && hasMedicos) {
          icon = combinedIcon;
        }
        // Multiple farmacias - use green circular badge
        else if (hasMultipleFarmacias) {
          icon = createGroupedIcon(location.farmacias.length, 'green');
        }
        // Multiple medicos - use blue circular badge
        else if (hasMultipleMedicos) {
          icon = createGroupedIcon(location.medicos.length, 'blue');
        }
        // Single medico - use blue pin
        else if (hasMedicos) {
          icon = medicoIcon;
        }
        // Single farmacia - use green pin (default)
        else {
          icon = farmaciaIcon;
        }

        return (
          <Marker
            key={`location-${index}`}
            position={[location.lat, location.lng]}
            icon={icon}
          >
            <Popup maxWidth={300}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {/* Render all farmacias at this location */}
                {location.farmacias.map((farmacia, farmaciaIndex) => (
                  <div key={`farmacia-${farmaciaIndex}`} style={{ marginBottom: location.medicos.length > 0 || farmaciaIndex < location.farmacias.length - 1 ? '16px' : '0', paddingBottom: location.medicos.length > 0 || farmaciaIndex < location.farmacias.length - 1 ? '16px' : '0', borderBottom: location.medicos.length > 0 || farmaciaIndex < location.farmacias.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#059669' }}>
                      Farmacia {location.farmacias.length > 1 ? `(${farmaciaIndex + 1}/${location.farmacias.length})` : ''}
                    </h3>
                    {farmacia.nombreDeLaCuenta && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Nombre:</strong> {farmacia.nombreDeLaCuenta}
                      </p>
                    )}
                    {farmacia.calleDeEnvio && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Dirección:</strong> {farmacia.calleDeEnvio}
                      </p>
                    )}
                    {farmacia.colonia && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Colonia:</strong> {farmacia.colonia}
                      </p>
                    )}
                    {farmacia.municipio && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Municipio:</strong> {farmacia.municipio}
                      </p>
                    )}
                    <p style={{ margin: '4px 0' }}>
                      <strong>Brick:</strong> {farmacia.nombreBrick || <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>(Sin Brick)</span>}
                    </p>
                    {farmacia.googleMapsUrl && (
                      <p style={{ margin: '8px 0 0 0' }}>
                        <a
                          href={farmacia.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#059669' }}
                        >
                          Ver en Google Maps
                        </a>
                      </p>
                    )}
                  </div>
                ))}

                {/* Render all medicos at this location */}
                {location.medicos.map((medico, medicoIndex) => (
                  <div key={`medico-${medicoIndex}`} style={{ marginBottom: medicoIndex < location.medicos.length - 1 ? '16px' : '0', paddingBottom: medicoIndex < location.medicos.length - 1 ? '16px' : '0', borderBottom: medicoIndex < location.medicos.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#2563eb' }}>
                      Médico {location.medicos.length > 1 ? `(${medicoIndex + 1}/${location.medicos.length})` : ''}
                    </h3>
                    {medico.nombreDeLaCuenta && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Nombre:</strong> {medico.nombreDeLaCuenta}
                      </p>
                    )}
                    {medico.especialidad && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Especialidad:</strong> {medico.especialidad}
                      </p>
                    )}
                    {medico.calleDeEnvio && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Dirección:</strong> {medico.calleDeEnvio}
                      </p>
                    )}
                    {medico.colonia && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Colonia:</strong> {medico.colonia}
                      </p>
                    )}
                    {medico.ciudadDeEnvio && (
                      <p style={{ margin: '4px 0' }}>
                        <strong>Ciudad:</strong> {medico.ciudadDeEnvio}
                      </p>
                    )}
                    <p style={{ margin: '4px 0' }}>
                      <strong>Brick:</strong> {medico.nombreBrick || <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>(Sin Brick)</span>}
                    </p>
                    {medico.googleMapsUrl && (
                      <p style={{ margin: '8px 0 0 0' }}>
                        <a
                          href={medico.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb' }}
                        >
                          Ver en Google Maps
                        </a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
