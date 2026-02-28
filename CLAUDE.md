# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React 19 + TypeScript + Vite application for managing medical representatives' data. Uses Google Sheets as a database backend with OAuth2 authentication.

## Architecture

### Database: Google Sheets

The application uses Google Sheets as its database layer. A single spreadsheet (`representante_medico__app`) contains four tabs:

- **farmacias** - Pharmacy data (24 columns including contact info, location, credentials, and geographic data)
- **medicos** - Doctor data (16 columns including contact info, location, specialty, and geographic data)
- **visitas** - Visit data (12 columns including visit date, entity reference, status, labels, notes, and product information)
- **labels** - Label data (4 columns including label type and name)

### Authentication Flow

1. User clicks "Connect to Google Sheets" ([GoogleAuth.tsx](src/google-sheets/GoogleAuth.tsx))
2. OAuth2 flow initiated using Google Identity Services
3. Access token obtained and stored in memory ([authService.ts](src/google-sheets/authService.ts))
4. Token automatically refreshed on expiration
5. Sheet ID cached in localStorage for performance

### Data Flow

```
User Action → React Component → Query Hook (useLabelsQuery, etc.)
                                        ↓
                           Table Operations (created by factory)
                                        ↓
                    Table Classes (LabelsTable, MedicosTable, etc.)
                                        ↓
                           Google Sheets API (gapi.client)
                                        ↓
                           Google Sheet (Database)
```

1. **Authentication Layer** ([authService.ts](src/google-sheets/authService.ts))
   - Manages OAuth2 tokens
   - Initializes Google API client
   - Stores/retrieves sheet ID from localStorage

2. **Table Layer** ([src/google-sheets/services/tables/](src/google-sheets/services/tables/))
   - **BaseTable.ts** - Abstract base class providing common CRUD operations
     - `readAll()` - Fetches all records from a tab
     - `write()` - Appends new record to the tab (auto-generates ID and createdAt)
     - `update()` - Updates existing record by index
     - `rowToObject()` - Abstract method for deserializing row data
     - `objectToRow()` - Abstract method for serializing objects
   - **LabelsTable.ts** - Extends BaseTable for label data (4 columns)
   - **VisitasTable.ts** - Extends BaseTable for visit data (12 columns)
   - **MedicosTable.ts** - Extends BaseTable for doctor data (16 columns)
   - **FarmaciasTable.ts** - Extends BaseTable for pharmacy data (24 columns)

3. **Service Layer** ([src/google-sheets/services/index.ts](src/google-sheets/services/index.ts))
   - Manages table instances and sheet initialization
   - **createTableOperations()** factory - Creates standardized table operations interface
     - Returns `{ read, write, update }` methods
     - Handles sheet ID initialization automatically
   - Exports table operations: `labels`, `visitas`, `medicos`, `farmacias`

4. **Hook Layer** ([useGoogleSheet.ts](src/google-sheets/useGoogleSheet.ts))
   - **hookFactory()** - Creates type-safe query hooks from table operations
     - Manages React state (data, loading, error)
     - Provides `add()`, `updateItem()`, `reload()` methods
     - Handles authentication checks and initialization
   - Exports: `useLabelsQuery`, `useVisitsQuery`, `useDoctorsQuery`, `usePharmaciesQuery`

5. **Component Layer** ([App.tsx](src/App.tsx))
   - Consumes query hooks
   - Renders UI based on data state

### Sheet Structure

All columns use camelCase, Spanish terms without accents.

**Farmacias Columns** (24 columns):
```
id, createdAt, email, phone, territorio, pais, estado, municipio,
colonia, calle, estatus, codigoPostal, ruta, nombreCuenta,
plantillaClientes, folioTienda, cedulaProfesional, grupoCadena,
especialidad, categoriaMedico, propietarioCuenta, lat, lng,
googleMapsUrl, nombreBrick
```

**Medicos Columns** (16 columns):
```
id, createdAt, email, phone, estado, ciudad, colonia, calle,
estatus, codigoPostal, nombreCuenta, especialidad, nombreBrick,
lat, lng, googleMapsUrl
```

**Visitas Columns** (12 columns):
```
id, createdAt, fechaVisita, entidadObjetivoTipo, entidadObjetivoId,
estatus, etiquetasIds, nota, productoJson, fechaVisitaPlaneada,
productoSolicitadoJson, productoDejadoJson
```

**Labels Columns** (4 columns):
```
id, createdAt, labelType, nombre
```

### Data Model

- **Farmacia** - See type definition in [src/__types__/pharmacy.ts](src/__types__/pharmacy.ts)
- **Medico** - See type definition in [src/__types__/doctor.ts](src/__types__/doctor.ts)
- **Visita** - See type definition in [src/__types__/visita.ts](src/__types__/visita.ts)
- **Label** - See type definition in [src/__types__/label.ts](src/__types__/label.ts)

### Key Features

- **Auto Sheet Discovery**: Searches Drive for existing sheet before creating new one
- **Offline-First ID Caching**: Sheet ID stored in localStorage for instant loading
- **Type-Safe API**: Full TypeScript definitions for Google Sheets/Drive APIs in [src/google-sheets/types](src/google-sheets/types)
- **Factory Patterns**: Consistent table operations and query hooks via factory functions
- **Error Handling**: Comprehensive error extraction from gapi errors
- **Batch Operations**: Parallel reads of multiple tabs using `Promise.all`

## Commands

```bash
# Development server (http://localhost:5173)
npm run dev

# Build for production (includes TypeScript compilation)
npm run build

# Preview production build
npm run preview

# Lint TypeScript and TSX files
npm run lint
```

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file for local development:

```bash
# Google OAuth Client ID (public, not a secret)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# OAuth Scopes
VITE_GOOGLE_SCOPES=https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets

# API Discovery Document (optional)
VITE_GOOGLE_DISCOVERY_DOCS=https://sheets.googleapis.com/$discovery/rest?version=v4
```

### Environment Files

- `.env.local` - Local development (gitignored)
- `.env.production` - Production build config (committed)

**Important**: The Google OAuth Client ID is public information and safe to commit. It's not a secret - the security comes from the OAuth redirect URI allowlist configuration in Google Cloud Console.

## Technology Stack

- **Framework**: React 19
- **Language**: TypeScript ~5.9 with strict mode enabled
- **Build Tool**: Vite 7 with @vitejs/plugin-react (Babel for Fast Refresh)
- **Linting**: ESLint 9 with TypeScript and React plugins

## TypeScript Configuration

The project uses a composite TypeScript setup:
- `tsconfig.json` - Root configuration with project references
- `tsconfig.app.json` - Application code configuration (strict mode, ES2022 target)
- `tsconfig.node.json` - Node/Vite configuration code

Strict mode is enabled with additional linting rules including `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`.

### TypeScript Coding Standards

- **Use `type` instead of `interface`**: Prefer `type` declarations for all type definitions
  ```typescript
  // Good
  type UserProps = {
    name: string;
    age: number;
  };

  // Avoid
  interface UserProps {
    name: string;
    age: number;
  }
  ```

- **No JSDoc comments at top of files**: Don't add file-level JSDoc documentation blocks

- **Inline prop types when simple**: For components with few props (≤3), inline the type definition
  ```typescript
  // Good - inline for simple props
  export function Button({ label, onClick }: { label: string; onClick: () => void }) {
    return <button onClick={onClick}>{label}</button>;
  }

  // Use separate type for complex props
  type ComplexComponentProps = {
    title: string;
    description: string;
    items: string[];
    onSubmit: (data: FormData) => void;
    // ... more props
  };

  export function ComplexComponent(props: ComplexComponentProps) {
    // ...
  }
  ```

- **Property naming**: Use camelCase for properties, Spanish terms allowed but without accents
  - Examples: `nombreCuenta`, `estado`, `codigoPostal`

- **Consolidate related states**: Combine interdependent state variables into a single state object to prevent invalid state combinations
  ```typescript
  // Avoid - multiple related states can get out of sync
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);

  // Good - single source of truth
  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    data: Data | null;
    error: string | null;
  }>({ status: 'idle', data: null, error: null });
  ```

## File Organization

**Prefer colocation over separation by type.** Group related files by feature/domain rather than by technical role (hooks/utils/components).

### Structure Pattern

```
src/
├── __types__/           # Shared types used across features
├── feature-name/        # Feature-based folders (e.g., google-sheets/)
│   ├── Component.tsx    # Components related to this feature
│   ├── Component.css    # Component styles
│   ├── useFeature.ts    # Hooks for this feature
│   ├── service.ts       # Business logic/API calls
│   ├── utils.ts         # Feature-specific utilities
│   └── types/           # Feature-specific types
└── App.tsx              # Root component
```

### Guidelines

- **Feature folders**: Create folders like `google-sheets/`, `map/`, `auth/` that contain all related files
- **Keep related files together**: Component, styles, hooks, services, utils, and types for a feature stay in the same folder
- **Shared code**: Only extract to top-level `__types__/`, `utils/`, or `components/` if truly used across multiple features
- **Avoid generic folders**: Don't create `hooks/`, `utils/`, `components/` folders that separate files by type

### Example (Current Structure)

```
src/google-sheets/
├── GoogleAuth.tsx              # Auth UI component
├── GoogleAuth.css              # Auth component styles
├── useGoogleSheet.ts           # Query hooks factory
├── authService.ts              # Auth logic/token management
├── utils.ts                    # Shared utilities
├── services/
│   ├── index.ts                # Table operations factory & exports
│   ├── sheet-management.ts     # Sheet initialization logic
│   └── tables/                 # Table class implementations
│       ├── BaseTable.ts        # Abstract base class
│       ├── LabelsTable.ts      # Labels table (4 columns)
│       ├── VisitasTable.ts     # Visits table (9 columns)
│       ├── MedicosTable.ts     # Doctors table (16 columns)
│       └── FarmaciasTable.ts   # Pharmacies table (24 columns)
└── types/                      # Google Sheets specific types
```

## Google Sheets Integration

### API Configuration

- **OAuth Scopes Required**:
  - `https://www.googleapis.com/auth/spreadsheets` - Read/write sheets
  - `https://www.googleapis.com/auth/drive.file` - Search for sheets created by this app

- **APIs Used**:
  - `gapi.client.sheets` - CRUD operations on spreadsheet data
  - `gapi.client.drive` - Search for existing sheets by name

### Type Definitions

Custom TypeScript type definitions for Google APIs are maintained in [src/google-sheets/types](src/google-sheets/types). When encountering type errors with Google API methods or needing to add new API method definitions, update the type definitions in that folder instead of using type assertions like `as any`.

### Sheet Lifecycle

1. **First Load**: App searches Drive for existing sheet named `representante_medico__app`
2. **Not Found**: Creates new sheet with two tabs and headers
3. **Found**: Stores sheet ID in localStorage for future loads
4. **Subsequent Loads**: Uses cached sheet ID, validates it exists
5. **Cache Invalid**: Falls back to Drive search

### Data Sync Strategy

- **Read Operations**: On-demand (component mount, explicit reload)
- **Write Operations**: Optimistic update (local state updated immediately, then written to sheet)
- **No Real-Time Sync**: Changes in Google Sheets UI won't auto-reflect in app (requires manual reload)

### Factory Patterns

The application uses two factory patterns to create consistent, type-safe interfaces for working with Google Sheets data.

#### Table Operations Factory

Located in [services/index.ts](src/google-sheets/services/index.ts), the `createTableOperations()` factory creates a standardized interface for each table:

```typescript
type TableOperations<T> = {
  read: () => Promise<T[]>;
  write: (data: Omit<T, 'id' | 'createdAt'>) => Promise<T>;
  update: (index: number, data: T) => Promise<void>;
};
```

**What it does:**
- Takes a table instance (e.g., `LabelsTable`)
- Returns methods that automatically handle sheet initialization
- Ensures consistent error handling and sheet ID management

**Exported operations:**
```typescript
export const labels = createTableOperations(labelsTable);
export const visitas = createTableOperations(visitasTable);
export const medicos = createTableOperations(medicosTable);
export const farmacias = createTableOperations(farmaciasTable);
```

#### Query Hook Factory

Located in [useGoogleSheet.ts](src/google-sheets/useGoogleSheet.ts), the `hookFactory()` creates React hooks for each table:

```typescript
function hookFactory<DataType>(operations: TableOperations<DataType>) {
  return function useQuery() {
    // Returns: { data, loading, error, add, updateItem, reload }
  };
}
```

**What it provides:**
- Unified state management (idle, loading, success, error)
- Authentication checks before data operations
- Optimistic UI updates
- Methods: `add()`, `updateItem()`, `reload()`

**Exported hooks:**
```typescript
export const useLabelsQuery = hookFactory(labels);
export const useVisitsQuery = hookFactory(visitas);
export const useDoctorsQuery = hookFactory(medicos);
export const usePharmaciesQuery = hookFactory(farmacias);
```

**Usage example:**
```typescript
function MyComponent() {
  const { data, loading, error, add, updateItem } = useLabelsQuery();

  const handleAdd = async () => {
    await add({ labelType: 'category', nombre: 'Important' });
  };

  const handleUpdate = async (id: string) => {
    await updateItem(id, { nombre: 'Very Important' });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{data.map(item => /* render */)}</div>;
}
```

### Working with Tables

#### Table Architecture

Tables are implemented as classes that extend [BaseTable.ts](src/google-sheets/services/tables/BaseTable.ts). This provides a consistent pattern for CRUD operations across all data types.

**BaseTable Provides:**
- `readAll(spreadsheetId)` - Fetches all records and caches them
- `write(spreadsheetId, data)` - Appends a new record (auto-generates ID and createdAt)
- `update(spreadsheetId, id, data)` - Updates an existing record by ID
- `getHeaders()` - Returns column headers for the table
- `getTableName()` - Returns the sheet table name

**Subclasses Must Implement:**
- `tableName` - The name of the Google Sheets tab (e.g., 'medicos', 'farmacias')
- `headers` - Array of column names in order
- `rowToObject(row)` - Deserialize a sheet row into a typed object
- `objectToRow(obj)` - Serialize an object into a sheet row

#### Adding a New Table

Follow these steps to add a new table type to the application:

1. **Create a type definition** in `src/__types__/your-type.ts`
   ```typescript
   export type YourType = {
     id: string;
     createdAt: string;
     field1?: string;
     field2?: number;
     // ... additional fields
   };
   ```

2. **Create a table class** in [src/google-sheets/services/tables/](src/google-sheets/services/tables/)
   ```typescript
   import type { YourType } from '../../../__types__/your-type';
   import { BaseTable } from './BaseTable';

   export class YourTable extends BaseTable<YourType> {
     protected readonly tableName = 'your_table_name';

     protected readonly headers = [
       'id',
       'createdAt',
       'field1',
       'field2',
       // ... all columns in order
     ];

     protected rowToObject(row: string[]): YourType {
       return {
         id: row[0] || '',
         createdAt: row[1] || '',
         field1: row[2] || undefined,
         field2: row[3] ? parseFloat(row[3]) : undefined,
         // ... map all fields
       };
     }

     protected objectToRow(obj: YourType): (string | number)[] {
       return [
         obj.id,
         obj.createdAt,
         obj.field1 || '',
         obj.field2 ?? '',
         // ... all fields in order
       ];
     }
   }
   ```

3. **Update services/index.ts** to wire up the table
   ```typescript
   // Import the new table
   import { YourTable } from './tables/YourTable';

   // Instantiate it
   const yourTable = new YourTable();

   // Add to tables array (for sheet initialization)
   const tables = [..., yourTable];

   // Create table operations
   export const yourData = createTableOperations(yourTable);
   ```

4. **Update useGoogleSheet.ts** to export the query hook
   ```typescript
   // Import the table operations
   import { yourData } from './services';

   // Export the query hook
   export const useYourDataQuery = hookFactory(yourData);
   ```

5. **Use the hook in components**
   ```typescript
   import { useYourDataQuery } from './google-sheets/useGoogleSheet';

   function MyComponent() {
     const { data, loading, error, add, updateItem, reload } = useYourDataQuery();
     // ... use the data
   }
   ```

The new table will be automatically created in the Google Sheet with the appropriate headers on first initialization.

#### Updating Existing Tables

When modifying table structure (adding/removing columns):

1. **Update the type definition** in `src/__types__/`
2. **Update the headers array** in the table class - **ALWAYS add new columns to the END**
3. **Update rowToObject()** to handle the new column mapping
4. **Update objectToRow()** to serialize the new field
5. **Update sheet initialization** in googleSheetsService.ts to include new headers
6. **Update CLAUDE.md** to reflect the new column count and column list in the "Sheet Structure" section
7. **Consider migration** - Existing sheets won't have new columns automatically

**Critical Rules:**
- **New columns MUST be added to the END of the table** - Never insert columns in the middle, as this will break existing data
- **Whenever a type definition is updated, the corresponding table class MUST be updated** - Type and table must stay in sync
- The order of fields in `headers`, `rowToObject`, and `objectToRow` must match exactly
- Index `N` in `headers` corresponds to `row[N]` and position `N` in the returned array

## Entry Points

- Application entry: `src/main.tsx` - Sets up React root with StrictMode
- Root component: `src/App.tsx` - Main application component
- HTML entry: `index.html` - Vite's entry HTML file

## Deployment

### GitHub Pages

The application is deployed to GitHub Pages:
- **Base Path**: `/representante_medico/` (configured in [vite.config.ts](vite.config.ts))
- **Build Output**: `dist/` directory
- **Deployment**: Automated via GitHub Actions (see [.github](.github))

### OAuth Redirect URIs

For Google OAuth to work in production, ensure the following redirect URIs are configured in Google Cloud Console:
- `http://localhost:5173` (development)
- `https://your-domain.github.io/representante_medico/` (production)

## Common Issues

### Google API Type Errors

When encountering type errors with Google API methods (e.g., `gapi.client.sheets` or `gapi.client.drive`), update the type definitions in [src/google-sheets/types](src/google-sheets/types) instead of using `as any`.

### Authentication Flow Breaks

If authentication stops working:
1. Check browser console for errors
2. Verify Google API script tags are loaded in [index.html](index.html)
3. Clear localStorage and try again: `localStorage.clear()`
4. Check OAuth redirect URIs in Google Cloud Console

### Sheet Not Found After Refresh

The app caches the sheet ID in localStorage. If the sheet is deleted or becomes inaccessible:
1. Clear localStorage: `localStorage.removeItem('google_sheet_id')`
2. Or use: `clearSheetId()` from [authService.ts](src/google-sheets/authService.ts)
3. Refresh the page - app will search for or create a new sheet
