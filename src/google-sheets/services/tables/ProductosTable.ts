import type { Producto } from '../../../__types__/producto';
import { BaseTable } from './BaseTable';

type Columns = keyof Producto;

/**
 * Productos table implementation
 * Handles CRUD operations specific to producto data
 */
export class ProductosTable extends BaseTable<Producto> {
  protected readonly tableName = 'productos';

  protected readonly headers: Columns[] = ['id', 'createdAt', 'nombre', 'presentacion'];

  /**
   * Convert spreadsheet row to Producto object
   */
  protected rowToObject(row: string[]): Producto {
    const createdAtDate = row[1]?new Date(row[1]):new Date();

    return {
      id: row[0] || '',
      createdAt: createdAtDate,
      nombre: row[2] || '',
      presentacion: row[3] || '',
    };
  }

  /**
   * Convert Producto object to spreadsheet row
   */
  protected objectToRow(producto: Producto): (string | number)[] {
    return [producto.id, producto.createdAt.toISOString(), producto.nombre, producto.presentacion];
  }
}
