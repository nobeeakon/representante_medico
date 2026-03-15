import { useState, useMemo } from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Box,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import type { Producto } from '../__types__/producto';

type ManageProductsDialogProps = {
  open: boolean;
  onClose: () => void;
  productos: Producto[];
  onAdd: (product: Omit<Producto, 'id' | 'createdAt'>) => Promise<Producto>;
  onUpdate: (id: string, data: Partial<Omit<Producto, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type FormData = {
  nombre: string;
  presentacion: string;
};

type DialogState = {
  mode: 'list' | 'add' | 'edit';
  editingProductId: string | null;
  formData: FormData;
  loading: boolean;
  error: string | null;
};

const getInitialFormData = (): FormData => ({
  nombre: '',
  presentacion: '',
});

const getInitialState = (): DialogState => ({
  mode: 'list',
  editingProductId: null,
  formData: getInitialFormData(),
  loading: false,
  error: null,
});

export function ManageProductsDialog({
  open,
  onClose,
  productos,
  onAdd,
  onUpdate,
  onDelete,
}: ManageProductsDialogProps) {
  const [state, setState] = useState<DialogState>(getInitialState);

  // Sort products by name - moved to top level to follow Rules of Hooks
  const sortedProductos = useMemo(() => {
    return [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  // Validation
  const validationError = useMemo(() => {
    if (state.mode === 'list') return null;

    if (!state.formData.nombre.trim()) {
      return 'El nombre del producto es requerido';
    }
    if (!state.formData.presentacion.trim()) {
      return 'La presentación del producto es requerida';
    }
    return null;
  }, [state.mode, state.formData.nombre, state.formData.presentacion]);

  // Start adding a new product
  const handleStartAdd = () => {
    setState({
      mode: 'add',
      editingProductId: null,
      formData: getInitialFormData(),
      loading: false,
      error: null,
    });
  };

  // Start editing an existing product
  const handleStartEdit = (product: Producto) => {
    setState({
      mode: 'edit',
      editingProductId: product.id,
      formData: {
        nombre: product.nombre,
        presentacion: product.presentacion,
      },
      loading: false,
      error: null,
    });
  };

  // Cancel add/edit and return to list
  const handleCancel = () => {
    setState(getInitialState());
  };

  // Save (add or update)
  const handleSave = async () => {
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const productData = {
        nombre: state.formData.nombre.trim(),
        presentacion: state.formData.presentacion.trim(),
      };

      if (state.mode === 'add') {
        await onAdd(productData);
      } else if (state.mode === 'edit' && state.editingProductId) {
        await onUpdate(state.editingProductId, productData);
      }

      // Return to list view on success
      setState(getInitialState());
    } catch (err) {
      console.error('Error saving product:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Error al guardar. Por favor intenta de nuevo.',
      }));
    }
  };

  // Delete a product
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await onDelete(id);
      setState(getInitialState());
    } catch (err) {
      console.error('Error deleting product:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Error al eliminar. Por favor intenta de nuevo.',
      }));
    }
  };

  // Render form (for add/edit modes)
  const renderForm = () => {
    const isAdd = state.mode === 'add';
    const title = isAdd ? 'Crear Nuevo Producto' : 'Editar Producto';

    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>

        <Stack spacing={3} sx={{ mt: 3 }}>
          <TextField
            label="Nombre del Producto *"
            value={state.formData.nombre}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                formData: { ...prev.formData, nombre: e.target.value },
              }))
            }
            fullWidth
            required
            autoFocus
            placeholder="Ej: Perioxidin"
            disabled={state.loading}
          />

          <TextField
            label="Presentación *"
            value={state.formData.presentacion}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                formData: { ...prev.formData, presentacion: e.target.value },
              }))
            }
            fullWidth
            required
            placeholder="Ej: 500mg tabletas"
            disabled={state.loading}
          />

          {state.error && (
            <Alert severity="error" onClose={() => setState((prev) => ({ ...prev, error: null }))}>
              {state.error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={state.loading}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={state.loading ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={state.loading || !!validationError}
            >
              {state.loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </Box>
        </Stack>
      </Box>
    );
  };

  // Render product list
  const renderList = () => {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Productos ({productos.length})</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleStartAdd}>
            Agregar Producto
          </Button>
        </Box>

        {state.error && (
          <Alert
            severity="error"
            onClose={() => setState((prev) => ({ ...prev, error: null }))}
            sx={{ mb: 2 }}
          >
            {state.error}
          </Alert>
        )}

        {productos.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6" gutterBottom>
              No hay productos
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Agrega tu primer producto para comenzar
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleStartAdd}>
              Agregar Producto
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Presentación</TableCell>
                  <TableCell>Fecha de Creación</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedProductos.map((product) => (
                  <TableRow
                    key={product.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {product.nombre}
                    </TableCell>
                    <TableCell>{product.presentacion}</TableCell>
                    <TableCell>{new Date(product.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleStartEdit(product)}
                        disabled={state.loading}
                        title="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(product.id)}
                        disabled={state.loading}
                        title="Eliminar"
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Gestión de Productos
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ overflow: 'auto', height: '100%' }}>
        {state.mode === 'list' ? renderList() : renderForm()}
      </Box>
    </Dialog>
  );
}
