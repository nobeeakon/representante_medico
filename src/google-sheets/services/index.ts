/// <reference types="@types/gapi.client.drive-v3" />

import { initializeSheet as initSheet } from './sheet-management';
import type { BaseTable } from './tables/BaseTable';
import { FarmaciasTable } from './tables/FarmaciasTable';
import { MedicosTable } from './tables/MedicosTable';
import { VisitasTable } from './tables/VisitasTable';
import { LabelsTable } from './tables/LabelsTable';
import { ProductosTable } from './tables/ProductosTable';

// Sheet configuration
const SHEET_TITLE = 'representante_medico__app';

// Initialize table instances
const farmaciasTable = new FarmaciasTable();
const medicosTable = new MedicosTable();
const visitasTable = new VisitasTable();
const labelsTable = new LabelsTable();
const productosTable = new ProductosTable();
const tables = [farmaciasTable, medicosTable, visitasTable, labelsTable, productosTable];

let currentSheetId: null | string = null;
export const resetInitializedSheet = () => (currentSheetId = null);

/**
 * Initialize the sheet - finds existing one or creates it if it doesn't exist
 * Returns the Sheet ID
 */
export async function initializeSheet(): Promise<string> {
  currentSheetId = await initSheet(SHEET_TITLE, tables);

  return currentSheetId;
}

export type TableOperations<T extends { id: string; createdAt: string }> = {
  read: () => Promise<T[]>;
  write: (data: Omit<T, 'id' | 'createdAt'>) => Promise<T>;
  update: (index: number, data: T) => Promise<void>;
};

function createTableOperations<T extends { id: string; createdAt: string }>(
  table: BaseTable<T>
): TableOperations<T> {
  return {
    read: async () => {
      if (!currentSheetId) {
        throw new Error(
          'No sheet id found. Something went wrong. Remember to initialize the sheet before trying to do any operation'
        );
      }
      return table.readAll(currentSheetId);
    },
    write: async (data) => {
      if (!currentSheetId) {
        throw new Error(
          'No sheet id found. Something went wrong. Remember to initialize the sheet before trying to do any operation'
        );
      }
      return table.write(currentSheetId, data);
    },
    update: async (index, data) => {
      if (!currentSheetId) {
        throw new Error(
          'No sheet id found. Something went wrong. Remember to initialize the sheet before trying to do any operation'
        );
      }
      await table.update(currentSheetId, index, data);
    },
  };
}

export const farmacias = createTableOperations(farmaciasTable);
export const medicos = createTableOperations(medicosTable);
export const visitas = createTableOperations(visitasTable);
export const labels = createTableOperations(labelsTable);
export const productos = createTableOperations(productosTable);
