import { useState, useEffect, useCallback } from 'react';
import { farmacias, medicos, visitas, labels, productos, initializeSheet } from './services';
import { isAuthenticated, initializeGoogleApi } from './authService';
import type { TableOperations } from './services/index';

type BasicDataType = { id: string; createdAt: string };
type DataState<DataType extends BasicDataType> = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: DataType[];
  error: string | null;
};

const hookFactory = <DataType extends BasicDataType>(dataOperations: TableOperations<DataType>) => {
  return function useGoogleSheetsData() {
    const [state, setState] = useState<DataState<DataType>>({
      status: 'idle',
      data: [],
      error: null,
    });

    const loadData = useCallback(async () => {
      if (!isAuthenticated()) {
        setState({
          status: 'error',
          data: [],
          error: 'Not authenticated. Please connect to Google Sheets.',
        });
        return;
      }

      try {
        // Ensure Google API is initialized first
        await initializeGoogleApi();
      } catch (err) {
        console.error('Failed to initialize Google API:', err);
        setState({
          status: 'error',
          data: [],
          error: 'Failed to initialize Google API. Please refresh the page.',
        });
        return;
      }

      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const data = await dataOperations.read();

        setState({
          status: 'success',
          data,
          error: null,
        });

        console.log(`Loaded ${data.length} items`);
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

    const add = async (newItem: Omit<DataType, 'id' | 'createdAt'>): Promise<DataType> => {
      try {
        const newFarmacia = await dataOperations.write(newItem);

        setState((prev) => ({
          ...prev,
          data: [...prev.data, newFarmacia],
        }));

        return newFarmacia;
      } catch (err) {
        console.error('Error adding farmacia:', err);
        throw err;
      }
    };

    const batchAdd = async (newItems: Array<Omit<DataType, 'id' | 'createdAt'>>): Promise<DataType[]> => {
      try {
        const newRecords = await dataOperations.batchWrite(newItems);

        setState((prev) => ({
          ...prev,
          data: [...prev.data, ...newRecords],
        }));

        return newRecords;
      } catch (err) {
        console.error('Error batch adding records:', err);
        throw err;
      }
    };

    const updateItem = async (
      id: string,
      data: Partial<Omit<DataType, 'id' | 'createdAt'>>
    ): Promise<void> => {
      try {
        const targetItem = state.data
          .map((item, idx) => ({ idx, item }))
          .find((item) => item.item.id === id);

        if (targetItem == null) {
          throw new Error(`Unable to find the required item: ${id}`);
        }

        const updatedItem = { ...targetItem.item, ...data };

        await dataOperations.update(targetItem.idx, updatedItem);

        setState((prev) => ({
          ...prev,
          data: prev.data.map((item) => (item.id === item.id ? { ...updatedItem } : item)),
        }));
      } catch (err) {
        console.error('Error updating farmacia:', err);
        throw err;
      }
    };

    return {
      data: state.data,
      loading: state.status === 'loading',
      error: state.error,
      add,
      batchAdd,
      updateItem,
      reload: loadData,
    };
  };
};

export const usePharmaciesQuery = hookFactory(farmacias);
export const useDoctorsQuery = hookFactory(medicos);
export const useVisitsQuery = hookFactory(visitas);
export const useLabelsQuery = hookFactory(labels);
export const useProductosQuery = hookFactory(productos);

/**
 * Hook to initialize the Google Sheet
 * Handles authentication, API initialization, and sheet creation/discovery
 */
export function useSheetInitialization() {
  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    sheetId: string | null;
    error: string | null;
  }>({
    status: 'idle',
    sheetId: null,
    error: null,
  });

  const initialize = useCallback(async () => {
    if (!isAuthenticated()) {
      setState({
        status: 'error',
        sheetId: null,
        error: 'Not authenticated. Please connect to Google Sheets.',
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      // Ensure Google API is initialized
      await initializeGoogleApi();

      // Initialize or find the sheet
      const sheetId = await initializeSheet();

      setState({
        status: 'success',
        sheetId,
        error: null,
      });

      console.log(`Sheet initialized with ID: ${sheetId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error initializing sheet';
      console.error('Error initializing sheet:', err);

      setState({
        status: 'error',
        sheetId: null,
        error: errorMessage,
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initialize();
  }, [initialize]);

  return {
    sheetId: state.sheetId,
    loading: state.status === 'loading',
    error: state.error,
    initialized: state.status === 'success',
    reinitialize: initialize,
  };
}
