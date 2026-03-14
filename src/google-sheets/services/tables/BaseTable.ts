import { ensureAuthenticated, extractErrorMessage, generateId } from '../utils';

/**
 * Base class for Google Sheets table operations
 * Provides common CRUD operations that can be extended by specific table implementations
 */
export abstract class BaseTable<T extends { id: string; createdAt: Date }> {
  protected abstract readonly tableName: string;
  protected abstract readonly headers: string[];

  /**
   * Fetch the current headers from the remote table
   */
  async fetchRemoteHeaders(spreadsheetId: string): Promise<string[]> {
    await ensureAuthenticated();

    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.tableName}!A1:ZZ1`,
      });

      return response.result.values?.[0] || [];
    } catch (error) {
      console.error(`Error fetching headers for ${this.tableName}:`, error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(`Failed to fetch headers for ${this.tableName}: ${errorMessage}`);
    }
  }

  /**
   * Validate that remote headers match expected headers in order
   * Throws an error if headers don't match the expected structure
   */
  private async validateHeaders(spreadsheetId: string): Promise<void> {
    const remoteHeaders = await this.fetchRemoteHeaders(spreadsheetId);

    if (this.headers.length !== remoteHeaders.length) {
      throw new Error(
        `Table "${this.tableName}" has unexpected columns. ` +
          `Remote table has ${remoteHeaders.length} columns but ${this.headers.length} are expected. ` +
          `Please check the table structure in Google Sheets. Remote: ${remoteHeaders.join(',')}. Expected: ${this.headers.join(',')}`
      );
    }

    // Check that remote headers match expected headers in order
    for (let i = 0; i < remoteHeaders.length; i++) {
      if (remoteHeaders[i] !== this.headers[i]) {
        throw new Error(
          `Table "${this.tableName}" headers are not in the expected order. ` +
            `Expected column "${this.headers[i]}" at position ${i + 1}, but found "${remoteHeaders[i]}". ` +
            `Please ensure the table structure matches the expected schema or recreate the sheet.`
        );
      }
    }
  }

  /**
   * Read all records from the table
   */
  async readAll(spreadsheetId: string): Promise<T[]> {
    try {
      await ensureAuthenticated();

      // Validate headers before reading
      await this.validateHeaders(spreadsheetId);

      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.tableName}!A2:Z`, // Start from row 2 (skip headers)
      });

      const rows = response.result.values || [];
      return rows.map((row) => this.rowToObject(row));
    } catch (error) {
      console.error(`Error reading ${this.tableName}:`, error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(`Failed to read ${this.tableName}: ${errorMessage}`);
    }
  }

  /**
   * Write a new record to the table
   */
  async write(spreadsheetId: string, data: Omit<T, 'id' | 'createdAt'>): Promise<T> {
    try {
      await ensureAuthenticated();

      // Validate headers before writing
      await this.validateHeaders(spreadsheetId);

      // Generate ID and timestamp
      const newRecord = {
        id: generateId(),
        createdAt: new Date(),
        ...data,
      } as T;

      const row = this.objectToRow(newRecord);

      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.tableName}!A:Z`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      console.log(`${this.tableName} record written successfully`);

      return newRecord;
    } catch (error) {
      console.error(`Error writing ${this.tableName}:`, error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(`Failed to write ${this.tableName}: ${errorMessage}`);
    }
  }

  /**
   * Write multiple new records to the table in a single batch operation
   */
  async batchWrite(spreadsheetId: string, dataArray: Array<Omit<T, 'id' | 'createdAt'>>): Promise<T[]> {
    try {
      await ensureAuthenticated();

      // Validate headers before writing
      await this.validateHeaders(spreadsheetId);

      // Generate IDs and timestamps for all records
      const newRecords = dataArray.map((data) => ({
        id: generateId(),
        createdAt: new Date(),
        ...data,
      } as T));

      // Convert all records to rows
      const rows = newRecords.map((record) => this.objectToRow(record));

      // Write all rows at once
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.tableName}!A:Z`,
        valueInputOption: 'RAW',
        resource: {
          values: rows,
        },
      });

      console.log(`${this.tableName} batch write: ${newRecords.length} records written successfully`);

      return newRecords;
    } catch (error) {
      console.error(`Error batch writing ${this.tableName}:`, error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(`Failed to batch write ${this.tableName}: ${errorMessage}`);
    }
  }

  /**
   * Update an existing record in the table
   * @param spreadsheetId - The Google Sheets spreadsheet ID
   * @param index - The 0-based index of the record in the data array
   * @param updatedRecord - The complete updated record
   */
  async update(spreadsheetId: string, index: number, updatedRecord: T): Promise<void> {
    try {
      await ensureAuthenticated();

      // Validate headers before updating
      await this.validateHeaders(spreadsheetId);

      // Calculate actual row number (add 2: 1 for header row, 1 for 0-based index)
      const rowNumber = index + 2;

      // Convert to row format
      const row = this.objectToRow(updatedRecord);

      // Update in Google Sheets
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.tableName}!A${rowNumber}:Z${rowNumber}`,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      console.log(`${this.tableName} record updated successfully`);
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(`Failed to update ${this.tableName}: ${errorMessage}`);
    }
  }

  /**
   * Delete a record from the table
   * @param spreadsheetId - The Google Sheets spreadsheet ID
   * @param index - The 0-based index of the record in the data array
   */
  async delete(spreadsheetId: string, index: number): Promise<void> {
    try {
      await ensureAuthenticated();

      // Validate headers before deleting
      await this.validateHeaders(spreadsheetId);

      // Calculate actual row number (add 2: 1 for header row, 1 for 0-based index)
      const rowNumber = index + 2;

      // Get the sheet ID for the table
      const response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = response.result.sheets?.find(
        (s) => s.properties?.title === this.tableName
      );

      if (!sheet?.properties?.sheetId) {
        throw new Error(`Sheet "${this.tableName}" not found in spreadsheet`);
      }

      // Delete the row using batchUpdate
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1, // 0-based for API
                  endIndex: rowNumber, // exclusive
                },
              },
            },
          ],
        },
      });

      console.log(`${this.tableName} record deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(`Failed to delete ${this.tableName}: ${errorMessage}`);
    }
  }

  /**
   * Get the headers for this table
   */
  getHeaders(): string[] {
    return this.headers;
  }

  /**
   * Get the table name for this table
   */
  getTableName(): string {
    return this.tableName;
  }

  /**
   * Convert a spreadsheet row to an object
   * Must be implemented by subclasses
   */
  protected abstract rowToObject(row: string[]): T;

  /**
   * Convert an object to a spreadsheet row
   * Must be implemented by subclasses
   */
  protected abstract objectToRow(obj: T): (string | number)[];
}
