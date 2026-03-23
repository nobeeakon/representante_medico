import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css';
import { POLYGON_GEO_JSON } from './polygons';
import type { Icon, DivIcon, PathOptions } from 'leaflet';
import type { Farmacia } from '../../__types__/pharmacy';
import type { Medico } from '../../__types__/doctor';
import { userIcon } from './icons';

// Combined location type for markers at the same coordinates
export type CombinedLocation = {
  lat: number;
  lng: number;
  farmacias: Farmacia[];
  medicos: Medico[];
  savedEntityIds: Set<string>; // IDs of entities with saved visits
};

export type MarkerData = {
  location: CombinedLocation;
  icon: Icon | DivIcon;
  isSelected: boolean;
  isHighlighted: boolean;
};

type SelectedEntity = {
  type: 'farmacia' | 'medico';
  id: string;
};

// Style for GeoJSON polygons
const POLYGON_STYLE: PathOptions = {
  color: '#2563eb',
  weight: 3 * 1.5, // Increase stroke weight by 50%
  opacity: 1,
  fillColor: '#3b82f6',
  fillOpacity: 0.2,
};

export const MapContent = ({
  center,
  zoom,
  userPosition,
  markers,
  selectedEntities,
  onToggleSelection,
}: {
  center: [number, number];
  zoom: number;
  markers: MarkerData[];
  userPosition: null | { lat: number; lng: number };
  selectedEntities: SelectedEntity[];
  onToggleSelection: ((entities: SelectedEntity[]) => void) | undefined;
}) => (
  <MapContainer
    center={center}
    zoom={zoom}
    style={{ height: '100%', width: '100%' }}
    scrollWheelZoom={false}
    doubleClickZoom={false}
    touchZoom={false}
    zoomControl={true}
    dragging={true}
  >
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    {/* Render GeoJSON polygons and lines */}
    <GeoJSON data={POLYGON_GEO_JSON} style={POLYGON_STYLE} />

    {userPosition && <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon} />}

    {/* Render markers with prepared data */}
    {markers.map((marker, index) => {
      const { location, icon } = marker;

      return (
        <Marker key={`location-${index}`} position={[location.lat, location.lng]} icon={icon}>
          <Popup maxWidth={300}>
            <div className="popup-container">
              {/* Select All Button */}
              {location.farmacias.length + location.medicos.length > 1 && (
                <div
                  style={{
                    marginBottom: '12px',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: '8px',
                  }}
                >
                  <button
                    onClick={() => {
                      const allEntities: SelectedEntity[] = [
                        ...location.farmacias.map((f) => ({
                          type: 'farmacia' as const,
                          id: f.id,
                        })),
                        ...location.medicos.map((m) => ({ type: 'medico' as const, id: m.id })),
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
                  location.medicos.length === 0 && farmaciaIndex === location.farmacias.length - 1;
                const isFarmaciaSelected = selectedEntities.some(
                  (e) => e.type === 'farmacia' && e.id === farmacia.id
                );
                const isFarmaciaSaved = location.savedEntityIds.has(farmacia.id);
                return (
                  <div key={`farmacia-${farmaciaIndex}`} className={isLastItem ? '' : 'popup-item'}>
                    <div className="popup-title">
                      <h3>
                        Farmacia{' '}
                        {location.farmacias.length > 1
                          ? `(${farmaciaIndex + 1}/${location.farmacias.length})`
                          : ''}
                        {isFarmaciaSaved && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '12px',
                              color: '#059669',
                              fontWeight: 'bold',
                            }}
                          >
                            ✓ Guardada
                          </span>
                        )}
                      </h3>
                      {!isFarmaciaSaved && (
                        <button
                          onClick={() =>
                            onToggleSelection?.([{ type: 'farmacia', id: farmacia.id }])
                          }
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
                        <a href={farmacia.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          ( Maps )
                        </a>
                      </p>
                    )}

                    <p className="popup-field">
                      <strong>Brick:</strong>{' '}
                      {farmacia.nombreBrick || <span className="popup-no-brick">(Sin Brick)</span>}
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
                  <div key={`medico-${medicoIndex}`} className={isLastItem ? '' : 'popup-item'}>
                    <div className="popup-title">
                      <h3>
                        Médico{' '}
                        {location.medicos.length > 1
                          ? `(${medicoIndex + 1}/${location.medicos.length})`
                          : ''}
                        {isMedicoSaved && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '12px',
                              color: '#2563eb',
                              fontWeight: 'bold',
                            }}
                          >
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
);
