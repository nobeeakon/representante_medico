import type { Medico, CompradorStatus } from '../../../__types__/doctor';
import { BaseTable } from './BaseTable';

/**
 * Medicos table implementation
 * Handles CRUD operations specific to doctor data
 */
export class MedicosTable extends BaseTable<Medico> {
  protected readonly tableName = 'medicos';

  protected readonly headers = [
    'id',
    'createdAt',
    'email',
    'phone',
    'estado',
    'ciudad',
    'colonia',
    'calle',
    'estatus',
    'codigoPostal',
    'nombreCuenta',
    'especialidad',
    'nombreBrick',
    'lat',
    'lng',
    'googleMapsUrl',
    'direccionDetallesAdicionales',
    'compradorEstatus',
  ];

  /**
   * Convert spreadsheet row to Medico object
   */
  protected rowToObject(row: string[]): Medico {
    const createdAtDate = row[1] ? new Date(row[1]) : new Date();
    const compradorEstatus = row[17] ?? '';

    return {
      id: row[0] || '',
      createdAt: createdAtDate,
      email: row[2] || undefined,
      phone: row[3] || undefined,
      estado: row[4] || undefined,
      ciudad: row[5] || undefined,
      colonia: row[6] || undefined,
      calle: row[7] || undefined,
      estatus: row[8] || undefined,
      codigoPostal: row[9] || undefined,
      nombreCuenta: row[10] || undefined,
      especialidad: row[11] || undefined,
      nombreBrick: row[12] || undefined,
      lat: row[13] ? parseFloat(row[13]) : undefined,
      lng: row[14] ? parseFloat(row[14]) : undefined,
      googleMapsUrl: row[15] || undefined,
      direccionDetallesAdicionales: row[16] || undefined,
      compradorEstatus: this.stringToCompradorStatus(compradorEstatus)
        ? compradorEstatus
        : undefined,
    };
  }

  /**
   * Convert Medico object to spreadsheet row
   */
  protected objectToRow(medico: Medico): (string | number)[] {
    return [
      medico.id,
      medico.createdAt.toISOString(),
      medico.email || '',
      medico.phone || '',
      medico.estado || '',
      medico.ciudad || '',
      medico.colonia || '',
      medico.calle || '',
      medico.estatus || '',
      medico.codigoPostal || '',
      medico.nombreCuenta || '',
      medico.especialidad || '',
      medico.nombreBrick || '',
      medico.lat ?? '',
      medico.lng ?? '',
      medico.googleMapsUrl || '',
      medico.direccionDetallesAdicionales || '',
      medico.compradorEstatus || '',
    ];
  }

  private stringToCompradorStatus(input: string): input is CompradorStatus {
    const statusValid: Array<CompradorStatus> = ['muyBueno', 'bueno', 'normal', 'malo'];
    return (statusValid as string[]).includes(input);
  }
}
