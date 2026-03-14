import type { Farmacia } from '../../../__types__/pharmacy';
import { BaseTable } from './BaseTable';

/**
 * Farmacias table implementation
 * Handles CRUD operations specific to pharmacy data
 */
export class FarmaciasTable extends BaseTable<Farmacia> {
  protected readonly tableName = 'farmacias';

  protected readonly headers = [
    'id',
    'createdAt',
    'email',
    'phone',
    'territorio',
    'pais',
    'estado',
    'municipio',
    'colonia',
    'calle',
    'estatus',
    'codigoPostal',
    'ruta',
    'nombreCuenta',
    'plantillaClientes',
    'folioTienda',
    'cedulaProfesional',
    'grupoCadena',
    'especialidad',
    'categoriaMedico',
    'propietarioCuenta',
    'lat',
    'lng',
    'googleMapsUrl',
    'nombreBrick',
  ];

  /**
   * Convert spreadsheet row to Farmacia object
   */
  protected rowToObject(row: string[]): Farmacia {

    const createdAtDate = row[1]?new Date(row[1]):new Date();

    return {
      id: row[0] || '',
      createdAt: createdAtDate,
      email: row[2] || undefined,
      phone: row[3] || undefined,
      territorio: row[4] || undefined,
      pais: row[5] || undefined,
      estado: row[6] || undefined,
      municipio: row[7] || undefined,
      colonia: row[8] || undefined,
      calle: row[9] || undefined,
      estatus: row[10] || undefined,
      codigoPostal: row[11] || undefined,
      ruta: row[12] || undefined,
      nombreCuenta: row[13] || undefined,
      plantillaClientes: row[14] || undefined,
      folioTienda: row[15] || undefined,
      cedulaProfesional: row[16] || undefined,
      grupoCadena: row[17] || undefined,
      especialidad: row[18] || undefined,
      categoriaMedico: row[19] || undefined,
      propietarioCuenta: row[20] || undefined,
      lat: row[21] ? parseFloat(row[21]) : undefined,
      lng: row[22] ? parseFloat(row[22]) : undefined,
      googleMapsUrl: row[23] || undefined,
      nombreBrick: row[24] || undefined,
    };
  }

  /**
   * Convert Farmacia object to spreadsheet row
   */
  protected objectToRow(farmacia: Farmacia): (string | number)[] {
    return [
      farmacia.id,
      farmacia.createdAt.toISOString(),
      farmacia.email || '',
      farmacia.phone || '',
      farmacia.territorio || '',
      farmacia.pais || '',
      farmacia.estado || '',
      farmacia.municipio || '',
      farmacia.colonia || '',
      farmacia.calle || '',
      farmacia.estatus || '',
      farmacia.codigoPostal || '',
      farmacia.ruta || '',
      farmacia.nombreCuenta || '',
      farmacia.plantillaClientes || '',
      farmacia.folioTienda || '',
      farmacia.cedulaProfesional || '',
      farmacia.grupoCadena || '',
      farmacia.especialidad || '',
      farmacia.categoriaMedico || '',
      farmacia.propietarioCuenta || '',
      farmacia.lat ?? '',
      farmacia.lng ?? '',
      farmacia.googleMapsUrl || '',
      farmacia.nombreBrick || '',
    ];
  }
}
