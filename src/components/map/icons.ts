import { Icon, divIcon } from 'leaflet';

// Custom icons for different marker types (standard pins)
export const farmaciaIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const farmaciaSelectedIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const medicoIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const medicoSelectedIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const medicoHighlightedIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [38, 62],
  iconAnchor: [19, 62],
  popupAnchor: [1, -52],
  shadowSize: [62, 62],
});
// Highlighted icons (bigger versions for focus/highlight state)
export const farmaciaHighlightedIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [38, 62],
  iconAnchor: [19, 62],
  popupAnchor: [1, -52],
  shadowSize: [62, 62],
});



/**
 * Creates a square icon for locations with both farmacias and medicos
 * Uses a split color design: green (left) for farmacias, blue (right) for medicos
 */
export function createCombinedIcon(isSelected = false, isHighlighted = false) {
  const colors = isSelected
    ? { left: '#f59e0b', right: '#f59e0b' } // Gold for selected
    : { left: '#059669', right: '#2563eb' }; // Green and blue for normal

  const size = isHighlighted ? 48 : 32;
  const fontSize = isHighlighted ? 30 : 20;

  return divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(90deg, ${colors.left} 50%, ${colors.right} 50%);
        border: 3px solid white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <span style="
          font-size: ${fontSize}px;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        ">●</span>
      </div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/**
 * Creates a circular badge icon for grouped locations
 * @param count - Number of entities at this location
 * @param color - Background color (green for farmacias, blue for medicos)
 * @param isSelected - Whether any entity at this location is selected
 * @param isHighlighted - Whether any entity at this location is highlighted
 */
export function createGroupedIcon(
  count: number,
  color: 'green' | 'blue',
  isSelected = false,
  isHighlighted = false
) {
  const bgColor = isSelected ? '#f59e0b' : color === 'green' ? '#059669' : '#2563eb';
  const size = isHighlighted ? 54 : 36;
  const fontSize = isHighlighted ? 24 : 16;

  return divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${bgColor};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${fontSize}px;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${count}</div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
