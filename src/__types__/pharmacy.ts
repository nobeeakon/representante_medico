/**
 * Farmacia (Pharmacy) type
 *
 * Represents a pharmacy location with address, contact info,
 * and geocoded coordinates.
 */
export type Farmacia = {
  /** Unique identifier */
  id: string;

  /** Creation timestamp (ISO 8601 date string) */
  createdAt: string;

  /** Email address */
  email?: string;

  /** Phone number */
  phone?: string;

  /** Territorio */
  territorio?: string;

  /** Pais */
  pais?: string;

  /** Estado o provincia */
  estado?: string;

  /** Municipio */
  municipio?: string;

  /** Colonia */
  colonia?: string;

  /** Calle */
  calle?: string;

  /** Estatus (e.g., "Activa") */
  estatus?: string;

  /** Codigo postal */
  codigoPostal?: string;

  /** Ruta */
  ruta?: string;

  /** Nombre de la cuenta */
  nombreCuenta?: string;

  /** Plantilla de clientes */
  plantillaClientes?: string;

  /** Folio de tienda */
  folioTienda?: string;

  /** Cedula profesional */
  cedulaProfesional?: string;

  /** Grupo de cadena */
  grupoCadena?: string;

  /** Especialidad */
  especialidad?: string;

  /** Categoria del medico */
  categoriaMedico?: string;

  /** Propietario de la cuenta */
  propietarioCuenta?: string;

  /** Latitude (geocoded) */
  lat?: number;

  /** Longitude (geocoded) */
  lng?: number;

  /** Google Maps URL */
  googleMapsUrl?: string;

  /** Nombre del brick (geographic zone) */
  nombreBrick?: string;
};
