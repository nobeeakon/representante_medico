import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Producto } from '../__types__/producto';

type CreateProductDialogProps = {
  onClose: () => void;
  onSaveProduct: (product: Omit<Producto, 'id' | 'createdAt'>) => Promise<void>;
};

type FormData = {
  nombre: string;
  presentacion: string;
};

type DialogState = {
  loading: boolean;
  error: string | null;
  data: FormData;
};

const getInitialState = (): DialogState => ({
  loading: false,
  error: null,
  data: {
    nombre: '',
    presentacion: '',
  },
});

export function CreateProductDialog({
  onClose,
  onSaveProduct,
}: CreateProductDialogProps) {
  const [state, setState] = useState<DialogState>(getInitialState);

  // Validation
  const validationError = useMemo(() => {
    if (!state.data.nombre.trim()) {
      return 'El nombre del producto es requerido';
    }
    if (!state.data.presentacion.trim()) {
      return 'La presentación del producto es requerida';
    }
    return null;
  }, [state.data.nombre, state.data.presentacion]);

  // Handle save
  const handleSave = async () => {
    if (validationError) {
      setState((prev) => ({
        ...prev,
        error: validationError,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const newProduct: Omit<Producto, 'id' | 'createdAt'> = {
        nombre: state.data.nombre.trim(),
        presentacion: state.data.presentacion.trim(),
      };
      await onSaveProduct(newProduct);

      // Close dialog on success
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Error al guardar. Por favor intenta de nuevo.',
      }));
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      fullScreen
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon />
          <Typography variant="h6" component="span">
            Crear Nuevo Producto
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Nombre del Producto *"
            value={state.data.nombre}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, nombre: e.target.value },
              }))
            }
            fullWidth
            size="small"
            required
            autoFocus
            placeholder="Ej: Paracetamol"
          />
          <TextField
            label="Presentación *"
            value={state.data.presentacion}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                data: { ...prev.data, presentacion: e.target.value },
              }))
            }
            fullWidth
            size="small"
            required
            placeholder="Ej: 500mg tabletas"
          />
        </Stack>

        {/* Error Message */}
        {state.error && (
          <Alert
            severity="error"
            onClose={() =>
              setState((prev) => ({
                ...prev,
                error: null,
              }))
            }
          >
            {state.error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={state.loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={state.loading || !!validationError}
          startIcon={state.loading ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {state.loading ? 'Guardando...' : 'Crear Producto'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
