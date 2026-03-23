export type CompradorStatus = 'muyBueno' | 'bueno' | 'normal' | 'malo';

/**
 * Medico (Doctor) type
 *
 * Represents a doctor/medical professional with address,
 * specialty, and geocoded coordinates.
 */
export type Medico = {
  /** Unique identifier */
  id: string;

  /** Creation timestamp (ISO 8601 date string) */
  createdAt: Date;

  /** Email address */
  email?: string;

  /** Phone number */
  phone?: string;

  /** Estado o provincia */
  estado?: string;

  /** Ciudad */
  ciudad?: string;

  /** Colonia */
  colonia?: string;

  /** Calle */
  calle?: string;

  /** Direccion detalles adicionales */
  direccionDetallesAdicionales?: string;

  /** Estatus (e.g., "Activa") */
  estatus?: string;

  /** Estatus (e.g., "Activa") */
  compradorEstatus?: CompradorStatus;

  /** Codigo postal */
  codigoPostal?: string;

  /** Nombre de la cuenta */
  nombreCuenta?: string;

  /** Especialidad (e.g., "Odontologia General", "Ortodoncia") */
  especialidad?: string;

  /** Nombre del brick - Brick/territory identifier */
  nombreBrick?: string;

  /** Latitude (geocoded) */
  lat?: number;

  /** Longitude (geocoded) */
  lng?: number;

  /** Google Maps URL */
  googleMapsUrl?: string;
};
