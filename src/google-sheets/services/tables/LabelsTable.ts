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
    return {
      id: row[0] || '',
      createdAt: row[1] || '',
      labelType: row[2] || undefined,
      nombre: row[3] || undefined,
    };
  }

  /**
   * Convert Label object to spreadsheet row
   */
  protected objectToRow(label: Label): (string | number)[] {
    return [label.id, label.createdAt, label.labelType || '', label.nombre || ''];
  }
}
