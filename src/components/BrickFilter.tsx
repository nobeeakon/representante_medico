import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

// Special constant for entries without a brick
export const NO_BRICK = '(Sin Brick)';

type BrickFilterProps = {
  bricks: string[];
  value: string[];
  onChange: (selected: string[]) => void;
};

export function BrickFilter({ bricks, value, onChange }: BrickFilterProps) {
  const handleBrickToggle = (brick: string): void => {
    if (value.includes(brick)) {
      onChange(value.filter((b) => b !== brick));
    } else {
      onChange([...value, brick]);
    }
  };

  const handleSelectAll = (): void => {
    if (value.length === bricks.length) {
      onChange([]);
    } else {
      onChange([...bricks]);
    }
  };

  const handleClear = (): void => {
    onChange([]);
  };

  if (bricks.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Filtrar por Brick:
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={handleSelectAll}>
              {value.length === bricks.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
            </Button>
            {value.length > 0 && (
              <Button size="small" variant="outlined" color="error" onClick={handleClear}>
                Limpiar Filtro
              </Button>
            )}
          </Stack>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            maxHeight: 300,
            overflowY: 'auto',
            p: 1.5,
          }}
        >
          <FormGroup>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              {bricks.map((brick) => {
                const isNoBrick = brick === NO_BRICK;
                const isSelected = value.includes(brick);
                return (
                  <FormControlLabel
                    key={brick}
                    sx={{ m: 0, px: 0.3, height: 'fit-content', border: '1px solid lightgrey' }}
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleBrickToggle(brick)}
                        size="small"
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          fontStyle: isNoBrick ? 'italic' : 'normal',
                          color: isNoBrick ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {brick}
                      </Typography>
                    }
                  />
                );
              })}
            </Box>
          </FormGroup>
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {value.length > 0
            ? `${value.length} de ${bricks.length} brick${value.length !== 1 ? 's' : ''} seleccionado${value.length !== 1 ? 's' : ''}`
            : `${bricks.length} brick${bricks.length !== 1 ? 's' : ''} disponible${bricks.length !== 1 ? 's' : ''} - selecciona para filtrar`}
        </Typography>
      </Stack>
    </Paper>
  );
}
