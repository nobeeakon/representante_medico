/**
 * Farmacia (Pharmacy) type based on farmacias_geocoded.csv
 *
 * Represents a pharmacy location with address, contact info,
 * and geocoded coordinates.
 */
export type Farmacia = {
  /** Email */
  email?: string;

  /** Territorio */
  territorio?: string;

  /** País de envío */
  paisDeEnvio?: string;

  /** Estado o provincia de envío */
  estadoOProvinciaDeEnvio?: string;

  /** Municipio */
  municipio?: string;

  /** Colonia */
  colonia?: string;

  /** Calle de envío */
  calleDeEnvio?: string;

  /** Estatus (e.g., "Activa") */
  estatus?: string;

  /** Código postal de envío */
  codigoPostalDeEnvio?: string;

  /** Ruta */
  ruta?: string;

  /** Nombre de la cuenta */
  nombreDeLaCuenta?: string;

  /** Plantilla de clientes */
  plantillaDeClientes?: string;

  /** Folio de tienda */
  folioDeTienda?: string;

  /** Cédula profesional */
  cedulaProfesional?: string;

  /** Grupo de cadena */
  grupoDeCadena?: string;

  /** Especialidad */
  especialidad?: string;

  /** Categoría del médico */
  categoriaDelMedico?: string;

  /** Propietario de la cuenta */
  propietarioDeLaCuenta?: string;

  /** Latitude (geocoded) */
  lat?: number;

  /** Longitude (geocoded) */
  lng?: number;

  /** Google Maps URL */
  googleMapsUrl?: string;

  /** Nombre del brick (geographic zone) */
  nombreBrick?: string;
};
