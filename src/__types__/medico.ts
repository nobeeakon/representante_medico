/**
 * Medico (Doctor) type based on medicos_geocoded.csv
 *
 * Represents a doctor/medical professional with address,
 * specialty, and geocoded coordinates.
 */
export type Medico = {
  /** Email */
  email?: string;

  /** Estado o provincia de envío */
  estadoOProvinciaDeEnvio?: string;

  /** Ciudad de envío */
  ciudadDeEnvio?: string;

  /** Colonia */
  colonia?: string;

  /** Calle de envío */
  calleDeEnvio?: string;

  /** Estatus (e.g., "Activa") */
  estatus?: string;

  /** Código postal de envío */
  codigoPostalDeEnvio?: string;

  /** Nombre de la cuenta */
  nombreDeLaCuenta?: string;

  /** Especialidad (e.g., "Odontología General", "Ortodoncia") */
  especialidad?: string;

  /** NOMBRE_BRICK - Brick/territory identifier */
  nombreBrick?: string;

  /** Latitude (geocoded) */
  lat?: number;

  /** Longitude (geocoded) */
  lng?: number;

  /** Google Maps URL */
  googleMapsUrl?: string;
};
