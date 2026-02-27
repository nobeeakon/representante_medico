/**
 * TypeScript definitions for Google API Client Library
 * https://github.com/google/google-api-javascript-client
 */

declare namespace gapi {
  function load(name: string, callback: () => void): void;

  namespace client {
    function init(config: {
      apiKey?: string;
      discoveryDocs?: string[];
      clientId?: string;
      scope?: string;
    }): Promise<void>;

    function load(api: string, version: string): Promise<void>;

    function setToken(token: { access_token: string } | null): void;
    function getToken(): { access_token: string } | null;

    namespace drive {
      namespace files {
        function list(params: {
          q?: string;
          fields?: string;
          spaces?: string;
          orderBy?: string;
        }): Promise<{
          result: {
            files?: Array<{
              id?: string;
              name?: string;
            }>;
          };
        }>;
      }
    }

    namespace sheets {
      namespace spreadsheets {
        function create(params: {
          resource: {
            properties: {
              title: string;
            };
            sheets?: Array<{
              properties: {
                title: string;
              };
            }>;
          };
        }): Promise<{
          result: {
            spreadsheetId: string;
            spreadsheetUrl: string;
          };
        }>;

        function get(params: { spreadsheetId: string; fields?: string }): Promise<{
          result: {
            spreadsheetId: string;
            properties: {
              title: string;
            };
            sheets?: Array<{
              properties?: {
                sheetId?: number;
                title?: string;
              };
            }>;
          };
        }>;

        function batchUpdate(params: {
          spreadsheetId: string;
          resource: {
            requests: Array<{
              addSheet?: {
                properties: {
                  title: string;
                };
              };
              deleteDimension?: {
                range: {
                  sheetId: number;
                  dimension: 'ROWS' | 'COLUMNS';
                  startIndex: number;
                  endIndex: number;
                };
              };
            }>;
          };
        }): Promise<{
          result: {
            spreadsheetId: string;
            replies: unknown[];
          };
        }>;

        namespace values {
          function batchUpdate(params: {
            spreadsheetId: string;
            resource: {
              valueInputOption: string;
              data: Array<{
                range: string;
                values: (string | number)[][];
              }>;
            };
          }): Promise<{
            result: {
              totalUpdatedCells: number;
              totalUpdatedColumns: number;
              totalUpdatedRows: number;
              totalUpdatedSheets: number;
            };
          }>;

          function update(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            resource: {
              values: (string | number)[][];
            };
          }): Promise<{
            result: {
              updatedCells: number;
              updatedColumns: number;
              updatedRange: string;
              updatedRows: number;
            };
          }>;

          function get(params: { spreadsheetId: string; range: string }): Promise<{
            result: {
              values?: string[][];
            };
          }>;

          function append(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            resource: {
              values: (string | number)[][];
            };
          }): Promise<{
            result: {
              updates: {
                updatedCells: number;
                updatedColumns: number;
                updatedRange: string;
                updatedRows: number;
              };
            };
          }>;
        }
      }
    }
  }
}

declare const gapi: typeof gapi;
