# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React 19 + TypeScript + Vite application for managing medical representatives' data. Uses Google Sheets as a database backend with OAuth2 authentication.

## Architecture

### Database: Google Sheets

The application uses Google Sheets as its database layer. A single spreadsheet (`representante_medico__app`) contains two tabs:

- **farmacias** - Pharmacy data (24 columns including contact info, location, credentials, and geographic data)
- **medicos** - Doctor data (16 columns including contact info, location, specialty, and geographic data)

### Authentication Flow

1. User clicks "Connect to Google Sheets" ([GoogleAuth.tsx](src/google-sheets/GoogleAuth.tsx))
2. OAuth2 flow initiated using Google Identity Services
3. Access token obtained and stored in memory ([authService.ts](src/google-sheets/authService.ts))
4. Token automatically refreshed on expiration
5. Sheet ID cached in localStorage for performance

### Data Flow

```
User Action → React Component → useGoogleSheetsData Hook
                                        ↓
                           googleSheetsService (API calls)
                                        ↓
                           Google Sheets API (gapi.client)
                                        ↓
                           Google Sheet (Database)
```

1. **Authentication Layer** ([authService.ts](src/google-sheets/authService.ts))
   - Manages OAuth2 tokens
   - Initializes Google API client
   - Stores/retrieves sheet ID from localStorage

2. **Service Layer** ([googleSheetsService.ts](src/google-sheets/googleSheetsService.ts))
   - CRUD operations for Farmacias and Medicos
   - Sheet initialization (finds existing or creates new)
   - Row ↔ Object transformations
   - ID generation (timestamp + random string)

3. **Hook Layer** ([useGoogleSheetsData.ts](src/google-sheets/useGoogleSheetsData.ts))
   - React state management for data
   - Loading/error states
   - Data fetching on mount
   - Methods: `addFarmacia`, `addMedico`, `reload`

4. **Component Layer** ([App.tsx](src/App.tsx))
   - Consumes hook data
   - Renders UI based on data state

### Sheet Structure

**Farmacias Columns** (camelCase, Spanish without accents):
```
id, createdAt, email, phone, territorio, pais, estado, municipio,
colonia, calle, estatus, codigoPostal, ruta, nombreCuenta,
plantillaClientes, folioTienda, cedulaProfesional, grupoCadena,
especialidad, categoriaMedico, propietarioCuenta, lat, lng,
googleMapsUrl, nombreBrick
```

**Medicos Columns**:
```
id, createdAt, email, phone, estado, ciudad, colonia, calle,
estatus, codigoPostal, nombreCuenta, especialidad, nombreBrick,
lat, lng, googleMapsUrl
```

### Data Model

- **Farmacia** - See type definition in [src/__types__/pharmacy.ts](src/__types__/pharmacy.ts)
- **Medico** - See type definition in [src/__types__/doctor.ts](src/__types__/doctor.ts)

### Key Features

- **Auto Sheet Discovery**: Searches Drive for existing sheet before creating new one
- **Offline-First ID Caching**: Sheet ID stored in localStorage for instant loading
- **Type-Safe API**: Full TypeScript definitions for Google Sheets/Drive APIs in [src/google-sheets/types](src/google-sheets/types)
- **Error Handling**: Comprehensive error extraction from gapi errors
- **Batch Operations**: Parallel reads of both tabs using `Promise.all`

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
├── useGoogleSheetsData.ts      # Hook for fetching data
├── googleAuth.ts               # Auth logic/token management
├── googleSheetsService.ts      # API service layer
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
