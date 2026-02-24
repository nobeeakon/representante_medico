import { ensureAuthenticated, extractErrorMessage } from './utils';
import type { BaseTable } from './tables/BaseTable';

type TableInstance = BaseTable<{ id: string; createdAt: string }>;

// Lock to prevent concurrent initialization
let initializationPromise: Promise<string> | null = null;

/**
 * Search for existing sheet by title using Drive API
 * Returns sheet ID if found, null otherwise
 */
async function findExistingSheet(sheetTitle: string): Promise<string | null> {
  await ensureAuthenticated();

  try {
    // Search for sheets with the specified title
    const response = await gapi.client.drive.files.list({
      q: `name='${sheetTitle}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
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
 * Create a new Google Sheet with all configured tables as tabs
 */
async function createSheet(sheetTitle: string, tables: TableInstance[]): Promise<string> {
  await ensureAuthenticated();

  try {
    const sheets = tables.map((table) => ({
      properties: {
        title: table.getTableName(),
      },
    }));

    const response = await gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: sheetTitle,
        },
        sheets,
      },
    });

    const spreadsheetId = response.result.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error('Failed to create sheet - no spreadsheet ID returned');
    }

    console.log('Created sheet with ID:', spreadsheetId);

    // Add headers to all tables
    await writeHeaders(spreadsheetId, tables);

    return spreadsheetId;
  } catch (error) {
    console.error('Error creating sheet:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to create sheet: ${errorMessage}`);
  }
}

/**
 * Get list of existing table names in the spreadsheet
 */
async function getExistingTableNames(spreadsheetId: string): Promise<Set<string>> {
  await ensureAuthenticated();

  try {
    const response = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });

    const sheets = response.result.sheets || [];
    const tableNames = new Set(
      sheets.map((sheet) => sheet.properties?.title).filter((title): title is string => !!title)
    );

    return tableNames;
  } catch (error) {
    console.error('Error getting existing table names:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to get existing table names: ${errorMessage}`);
  }
}

/**
 * Create missing tabs in an existing spreadsheet
 */
async function createMissingTabs(spreadsheetId: string, tableNames: string[]): Promise<void> {
  if (tableNames.length === 0) return;

  await ensureAuthenticated();

  try {
    const requests = tableNames.map((tableName) => ({
      addSheet: {
        properties: {
          title: tableName,
        },
      },
    }));

    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests,
      },
    });

    console.log(`Created ${tableNames.length} missing tab(s):`, tableNames);
  } catch (error) {
    console.error('Error creating missing tabs:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to create missing tabs: ${errorMessage}`);
  }
}

/**
 * Write column headers to new tables and add missing columns to existing tables
 */
async function writeHeaders(spreadsheetId: string, tables: TableInstance[]): Promise<void> {
  await ensureAuthenticated();

  try {
    // Get list of existing tables
    const existingTables = await getExistingTableNames(spreadsheetId);

    // Separate new and existing tables
    const newTables = tables.filter((table) => !existingTables.has(table.getTableName()));
    const existingTableInstances = tables.filter((table) =>
      existingTables.has(table.getTableName())
    );

    // Create missing tabs first
    if (newTables.length > 0) {
      await createMissingTabs(
        spreadsheetId,
        newTables.map((t) => t.getTableName())
      );
    }

    // Prepare batch update data
    const batchData = [];

    // Add headers for new tables
    for (const table of newTables) {
      batchData.push({
        range: `${table.getTableName()}!A1`,
        values: [table.getHeaders()],
      });
    }

    // Add missing columns for existing tables
    for (const table of existingTableInstances) {
      const remoteHeaders = await table.fetchRemoteHeaders(spreadsheetId);
      const expectedHeaders = table.getHeaders();

      // Validate that remote headers match expected headers in order
      for (let i = 0; i < remoteHeaders.length; i++) {
        if (i >= expectedHeaders.length) {
          throw new Error(
            `Table "${table.getTableName()}" has unexpected columns. ` +
              `Remote table has ${remoteHeaders.length} columns but only ${expectedHeaders.length} are expected. ` +
              `Please check the table structure in Google Sheets.`
          );
        }

        if (remoteHeaders[i] !== expectedHeaders[i]) {
          throw new Error(
            `Table "${table.getTableName()}" headers are not in the expected order. ` +
              `Expected column "${expectedHeaders[i]}" at position ${i + 1}, but found "${remoteHeaders[i]}". ` +
              `Please ensure the table structure matches the expected schema or recreate the sheet.`
          );
        }
      }

      // Add missing columns if needed
      if (remoteHeaders.length < expectedHeaders.length) {
        const missingHeaders = expectedHeaders.slice(remoteHeaders.length);

        batchData.push({
          range: `${table.getTableName()}!A1`,
          values: [expectedHeaders],
        });

        console.log(
          `Adding ${missingHeaders.length} missing column(s) to table "${table.getTableName()}":`,
          missingHeaders
        );
      }
    }

    if (batchData.length === 0) {
      console.log('All tables up to date, no headers to write');
      return;
    }

    // Batch update all headers
    await gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: batchData,
      },
    });

    if (newTables.length > 0) {
      console.log(
        `Headers written for ${newTables.length} new table(s):`,
        newTables.map((t) => t.getTableName())
      );
    }
  } catch (error) {
    console.error('Error writing headers:', error);
    const errorMessage = extractErrorMessage(error);
    throw new Error(`Failed to write headers: ${errorMessage}`);
  }
}

/**
 * Initialize the sheet - finds existing one or creates it if it doesn't exist
 * Returns the Sheet ID
 *
 * Uses a lock to prevent concurrent initializations that could create duplicate sheets
 */
export async function initializeSheet(
  sheetTitle: string,
  tables: TableInstance[]
): Promise<string> {
  // If already initializing, return the existing promise
  if (initializationPromise) {
    console.log('Initialization already in progress, waiting...');
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Search for existing sheet in Google Drive
      console.log('Searching for existing sheet...');
      const existingSheetId = await findExistingSheet(sheetTitle);

      if (existingSheetId) {
        console.log('Found existing sheet:', existingSheetId);
        await writeHeaders(existingSheetId, tables);
        return existingSheetId;
      }

      // No sheet found - create new one
      console.log('No existing sheet found, creating new Google Sheet...');
      const sheetId = await createSheet(sheetTitle, tables);
      return sheetId;
    } catch (error) {
      console.error('Failed to initialize sheet:', error);
      throw error;
    } finally {
      // Clear the lock after completion (success or failure)
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Get the URL to view the sheet in Google Sheets UI
 */
export async function getSheetUrl(sheetTitle: string): Promise<string | null> {
  try {
    const sheetId = await findExistingSheet(sheetTitle);
    return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;
  } catch (error) {
    console.error('Error getting sheet URL:', error);
    return null;
  }
}
