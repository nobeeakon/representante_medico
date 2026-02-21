/// <reference types="@types/gapi.client.drive-v3" />

import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import { getAccessToken, storeSheetId, getStoredSheetId } from './authService';

// Sheet configuration
const SHEET_TITLE = 'representante_medico__app';
const FARMACIAS_TAB = 'farmacias';
const MEDICOS_TAB = 'medicos';

// Column headers for Farmacias sheet (camelCase, no accents)
const FARMACIAS_HEADERS = [
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

// Column headers for Medicos sheet (camelCase, no accents)
const MEDICOS_HEADERS = [
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
];


/**
 * Extract error message from gapi error object
 */
function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  // Try to extract from gapi error structure
  if ('result' in error && error.result && typeof error.result === 'object' && 'error' in error.result) {
    const gapiError = error.result.error as { message?: string };
    if (gapiError.message) {
      return gapiError.message;
    }
  }

  // Try standard Error properties
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  // Try statusText for HTTP errors
  if ('statusText' in error && typeof error.statusText === 'string') {
    return error.statusText;
  }

  return String(error);
}

/**
 * Ensure access token is set on gapi client
 */
async function ensureAuthenticated(): Promise<void> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  // Set the token on gapi client
  gapi.client.setToken({
    access_token: accessToken,
  });
}

/**
 * Search for existing sheet by title using Drive API
 * Returns sheet ID if found, null otherwise
 */
async function findExistingSheet(): Promise<string | null> {
  await ensureAuthenticated();

  try {
    // Search for sheets with the specified title
    const response = await gapi.client.drive.files.list({
      q: `name='${SHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      orderBy: 'createdTime desc',
    });

    const files = response.result.files;
    if (files && files.length > 0) {
      console.log('Found existing sheet:', files[0].id);
      return files[0].id || null;
    }

    return null;
  } catch (error) {
    console.error('Error searching for existing sheet:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to search for existing sheet: ${errorMessage}`);
  }
}

/**
 * Initialize the sheet - finds existing one or creates it if it doesn't exist
 * Returns the Sheet ID
 */
export async function initializeSheet(): Promise<string> {
  // Check localStorage first for performance
  const storedSheetId = getStoredSheetId();

  if (storedSheetId) {
    try {
      await verifySheetExists(storedSheetId);
      console.log('Using existing sheet from localStorage:', storedSheetId);
      return storedSheetId;
    } catch (error) {
      console.warn('Stored sheet not found, will search for existing sheet');
    }
  }

  // Search for existing sheet in Google Drive
  try {
    const existingSheetId = await findExistingSheet();
    if (existingSheetId) {
      storeSheetId(existingSheetId);
      console.log('Found and using existing sheet:', existingSheetId);
      return existingSheetId;
    }
  } catch (error) {
    console.warn('Error searching for existing sheet, will create new one:', error);
  }

  // Create new sheet only if none found
  try {
    console.log('Creating new Google Sheet...');
    const sheetId = await createSheet();
    storeSheetId(sheetId);
    return sheetId;
  } catch (error) {
    console.error('Failed to initialize sheet:', error);
    throw error;
  }
}

/**
 * Create a new Google Sheet with Farmacias and Medicos tabs
 */
async function createSheet(): Promise<string> {
  await ensureAuthenticated();

  try {
    const response = await gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: SHEET_TITLE,
        },
        sheets: [
          {
            properties: {
              title: FARMACIAS_TAB,
            },
          },
          {
            properties: {
              title: MEDICOS_TAB,
            },
          },
        ],
      },
    });

    const spreadsheetId = response.result.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error('Failed to create sheet - no spreadsheet ID returned');
    }

    console.log('Created sheet with ID:', spreadsheetId);

    // Add headers to both sheets
    await writeHeaders(spreadsheetId);

    return spreadsheetId;
  } catch (error) {
    console.error('Error creating sheet:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to create sheet: ${errorMessage}`);
  }
}

/**
 * Write column headers to both tabs
 */
async function writeHeaders(spreadsheetId: string): Promise<void> {
  await ensureAuthenticated();

  try {
    await gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: [
          {
            range: `${FARMACIAS_TAB}!A1`,
            values: [FARMACIAS_HEADERS],
          },
          {
            range: `${MEDICOS_TAB}!A1`,
            values: [MEDICOS_HEADERS],
          },
        ],
      },
    });

    console.log('Headers written successfully');
  } catch (error) {
    console.error('Error writing headers:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to write headers: ${errorMessage}`);
  }
}

/**
 * Verify that a sheet exists and is accessible
 */
async function verifySheetExists(spreadsheetId: string): Promise<void> {
  await ensureAuthenticated();

  try {
    await gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Sheet not found or not accessible (${spreadsheetId}): ${errorMessage}`);
  }
}

/**
 * Read all Farmacias from the sheet
 */
export async function readFarmacias(): Promise<Farmacia[]> {
  try {
    const sheetId = await initializeSheet();
    await ensureAuthenticated();

    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${FARMACIAS_TAB}!A2:Z`, // Start from row 2 (skip headers)
    });

    const rows = response.result.values || [];
    return rows.map(rowToFarmacia);
  } catch (error) {
    console.error('Error reading farmacias:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to read farmacias: ${errorMessage}`);
  }
}

/**
 * Read all Medicos from the sheet
 */
export async function readMedicos(): Promise<Medico[]> {
  try {
    const sheetId = await initializeSheet();
    await ensureAuthenticated();

    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${MEDICOS_TAB}!A2:Z`, // Start from row 2 (skip headers)
    });

    const rows = response.result.values || [];
    return rows.map(rowToMedico);
  } catch (error) {
    console.error('Error reading medicos:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to read medicos: ${errorMessage}`);
  }
}

/**
 * Write a new Farmacia to the sheet
 */
export async function writeFarmacia(farmacia: Omit<Farmacia, 'id' | 'createdAt'>): Promise<Farmacia> {
  try {
    const sheetId = await initializeSheet();
    await ensureAuthenticated();

    // Generate ID and timestamp
    const newFarmacia: Farmacia = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...farmacia,
    };

    const row = farmaciaToRow(newFarmacia);

    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${FARMACIAS_TAB}!A:Z`,
      valueInputOption: 'RAW',
      resource: {
        values: [row],
      },
    });

    console.log('Farmacia written successfully');
    return newFarmacia;
  } catch (error) {
    console.error('Error writing farmacia:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to write farmacia: ${errorMessage}`);
  }
}

/**
 * Write a new Medico to the sheet
 */
export async function writeMedico(medico: Omit<Medico, 'id' | 'createdAt'>): Promise<Medico> {
  try {
    const sheetId = await initializeSheet();
    await ensureAuthenticated();

    // Generate ID and timestamp
    const newMedico: Medico = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...medico,
    };

    const row = medicoToRow(newMedico);

    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${MEDICOS_TAB}!A:Z`,
      valueInputOption: 'RAW',
      resource: {
        values: [row],
      },
    });

    console.log('Medico written successfully');
    return newMedico;
  } catch (error) {
    console.error('Error writing medico:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to write medico: ${errorMessage}`);
  }
}

/**
 * Get the URL to view the sheet in Google Sheets UI
 */
export function getSheetUrl(): string | null {
  const sheetId = getStoredSheetId();
  return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;
}

// Helper functions for data transformation

/**
 * Convert spreadsheet row to Farmacia object
 */
function rowToFarmacia(row: string[]): Farmacia {
  return {
    id: row[0] || '',
    createdAt: row[1] || '',
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
 * Convert spreadsheet row to Medico object
 */
function rowToMedico(row: string[]): Medico {
  return {
    id: row[0] || '',
    createdAt: row[1] || '',
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
  };
}

/**
 * Convert Farmacia object to spreadsheet row
 */
function farmaciaToRow(farmacia: Farmacia): (string | number)[] {
  return [
    farmacia.id,
    farmacia.createdAt,
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

/**
 * Convert Medico object to spreadsheet row
 */
function medicoToRow(medico: Medico): (string | number)[] {
  return [
    medico.id,
    medico.createdAt,
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
  ];
}

/**
 * Generate a unique ID
 * Uses timestamp + random string for uniqueness
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}
