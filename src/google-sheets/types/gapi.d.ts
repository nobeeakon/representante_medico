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

        function get(params: {
          spreadsheetId: string;
        }): Promise<{
          result: {
            spreadsheetId: string;
            properties: {
              title: string;
            };
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

          function get(params: {
            spreadsheetId: string;
            range: string;
          }): Promise<{
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
