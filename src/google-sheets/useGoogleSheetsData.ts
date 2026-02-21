import { useState, useEffect, useCallback } from 'react';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import {
  initializeSheet,
  readFarmacias,
  readMedicos,
  writeFarmacia,
  writeMedico,
} from './googleSheetsService';
import { isAuthenticated, initializeGoogleApi } from './authService';

type DataState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  medicos: Medico[];
  farmacias: Farmacia[];
  error: string | null;
};

type UseGoogleSheetsDataReturn = {
  medicos: Medico[];
  farmacias: Farmacia[];
  loading: boolean;
  error: string | null;
  addFarmacia: (farmacia: Omit<Farmacia, 'id' | 'createdAt'>) => Promise<Farmacia>;
  addMedico: (medico: Omit<Medico, 'id' | 'createdAt'>) => Promise<Medico>;
  reload: () => Promise<void>;
};

export function useGoogleSheetsData(): UseGoogleSheetsDataReturn {
  const [state, setState] = useState<DataState>({
    status: 'idle',
    medicos: [],
    farmacias: [],
    error: null,
  });

  const loadData = useCallback(async () => {
    try {
      // Ensure Google API is initialized first
      await initializeGoogleApi();
    } catch (err) {
      console.error('Failed to initialize Google API:', err);
      setState({
        status: 'error',
        medicos: [],
        farmacias: [],
        error: 'Failed to initialize Google API. Please refresh the page.',
      });
      return;
    }

    if (!isAuthenticated()) {
      setState({
        status: 'error',
        medicos: [],
        farmacias: [],
        error: 'Not authenticated. Please connect to Google Sheets.',
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      await initializeSheet();

      const [farmacias, medicos] = await Promise.all([readFarmacias(), readMedicos()]);

      setState({
        status: 'success',
        medicos,
        farmacias,
        error: null,
      });

      console.log(`Loaded ${farmacias.length} farmacias and ${medicos.length} medicos from Google Sheets`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading data';
      console.error('Error loading data from Google Sheets:', err);

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const addFarmacia = async (farmacia: Omit<Farmacia, 'id' | 'createdAt'>): Promise<Farmacia> => {
    try {
      const newFarmacia = await writeFarmacia(farmacia);

      setState((prev) => ({
        ...prev,
        farmacias: [...prev.farmacias, newFarmacia],
      }));

      return newFarmacia;
    } catch (err) {
      console.error('Error adding farmacia:', err);
      throw err;
    }
  };

  const addMedico = async (medico: Omit<Medico, 'id' | 'createdAt'>): Promise<Medico> => {
    try {
      const newMedico = await writeMedico(medico);

      setState((prev) => ({
        ...prev,
        medicos: [...prev.medicos, newMedico],
      }));

      return newMedico;
    } catch (err) {
      console.error('Error adding medico:', err);
      throw err;
    }
  };

  return {
    medicos: state.medicos,
    farmacias: state.farmacias,
    loading: state.status === 'loading',
    error: state.error,
    addFarmacia,
    addMedico,
    reload: loadData,
  };
}
