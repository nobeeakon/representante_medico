# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React 19 + TypeScript + Vite application. Currently using the default Vite template structure with no custom architecture implemented yet.

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

## Entry Points

- Application entry: `src/main.tsx` - Sets up React root with StrictMode
- Root component: `src/App.tsx` - Main application component
- HTML entry: `index.html` - Vite's entry HTML file

## Current State

This is a minimal Vite template with no custom application code, routing, state management, or architectural patterns yet established. The application currently renders a basic counter example.
