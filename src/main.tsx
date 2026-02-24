import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import './index.css';
import App from './App.tsx';
import { SheetInitializer } from './google-sheets/SheetInitializer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CssBaseline />
    <SheetInitializer>
      <App />
    </SheetInitializer>
  </StrictMode>
);
