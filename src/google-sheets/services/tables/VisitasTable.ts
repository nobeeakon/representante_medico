import type { Visita, VisitaStatus , VisitaEntidadObjetivo} from '../../../__types__/visita';
import { BaseTable } from './BaseTable';

type Columns = keyof Visita;

/**
 * Visitas table implementation
 * Handles CRUD operations specific to visit data
 */
export class VisitasTable extends BaseTable<Visita> {
  protected readonly tableName = 'visitas';

  protected readonly headers: Columns[] = [
    'id',
    'createdAt',
    'fechaVisita',
    'entidadObjetivoTipo',
    'entidadObjetivoId',
    'estatus',
    'etiquetasIds',
    'nota',
    'productoJson',
    'fechaVisitaPlaneada',
  ];

  /**
   * Validates estatus value with exhaustive check
   */
  private validateEstatus(value: string): value is VisitaStatus {
    const tmpValue = value as VisitaStatus;
    switch (tmpValue) {
      case 'planeado':
      case 'visitado':
      case 'noEncontrado':
        return true;
      default: {
        const exhaustive: never = tmpValue;
        console.error(
          `Invalid estatus value: "${exhaustive}". Expected one of: pleaneado, visitado, noEncontrado`
        );
        return false;
      }
    }
  }

    /**
   * Validates estatus value with exhaustive check
   */
  private validateTargetEntityType(value: string): value is VisitaEntidadObjetivo {
    const tmpValue = value as VisitaEntidadObjetivo;
    switch (tmpValue) {
      case 'medico':
      case 'farmacia':
        return true;
      default: {
        const exhaustive: never = tmpValue;
        console.error(
          `Invalid estatus value: "${exhaustive}". Expected one of: pleaneado, visitado, noEncontrado`
        );
        return false;
      }
    }
  }


  /**
   * Convert spreadsheet row to Visita object
   */
  protected rowToObject(row: string[]): Visita {
    const estatus = row[5] || ''
    const entidadObjetivoTipo = row[3] || ''

    return {
      id: row[0] || '',
      createdAt: row[1] || '',
      fechaVisita: row[2] || undefined,
      entidadObjetivoTipo: this.validateTargetEntityType(entidadObjetivoTipo)?entidadObjetivoTipo:'medico',
      entidadObjetivoId: row[4] || '',
      estatus: this.validateEstatus(estatus)?estatus:'planeado' as const,
      etiquetasIds: row[6] ? JSON.parse(row[6]) : undefined,
      nota: row[7] || undefined,
      productoJson: row[8] ? JSON.parse(row[8]) : [],
      fechaVisitaPlaneada: row[9] || '',
    };
  }

  /**
   * Convert Visita object to spreadsheet row
   */
  protected objectToRow(visita: Visita): (string | number)[] {
    return [
      visita.id,
      visita.createdAt,
      visita.fechaVisita || '',
      visita.entidadObjetivoTipo,
      visita.entidadObjetivoId,
      visita.estatus,
      visita.etiquetasIds ? JSON.stringify(visita.etiquetasIds) : '',
      visita.nota || '',
      JSON.stringify(visita.productoJson),
      visita.fechaVisitaPlaneada,
    ];
  }
}
