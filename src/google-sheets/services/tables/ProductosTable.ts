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
    return {
      id: row[0] || '',
      createdAt: row[1] || '',
      nombre: row[2] || '',
      presentacion: row[3] || '',
    };
  }

  /**
   * Convert Producto object to spreadsheet row
   */
  protected objectToRow(producto: Producto): (string | number)[] {
    return [producto.id, producto.createdAt, producto.nombre, producto.presentacion];
  }
}
