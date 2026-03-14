import type { Label } from '../../../__types__/label';
import { BaseTable } from './BaseTable';

/**
 * Labels table implementation
 * Handles CRUD operations specific to label data
 */
export class LabelsTable extends BaseTable<Label> {
  protected readonly tableName = 'labels';

  protected readonly headers = ['id', 'createdAt', 'labelType', 'nombre'];

  /**
   * Convert spreadsheet row to Label object
   */
  protected rowToObject(row: string[]): Label {
    const createdAtDate = row[1]?new Date(row[1]):new Date();
    return {
      id: row[0] || '',
      createdAt: createdAtDate,
      labelType: row[2] || undefined,
      nombre: row[3] || undefined,
    };
  }

  /**
   * Convert Label object to spreadsheet row
   */
  protected objectToRow(label: Label): (string | number)[] {
    return [label.id, label.createdAt.toISOString(), label.labelType || '', label.nombre || ''];
  }
}
