import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Collapse,
  Chip,
  Typography,
} from '@mui/material';
import { BrickFilter, NO_BRICK } from './BrickFilter';
import { VisitHistoryFilterDialog, type VisitHistoryFilterConfig } from './VisitHistoryFilterDialog';
import type { Farmacia } from '../__types__/pharmacy';
import type { Medico } from '../__types__/doctor';
import type { Visita } from '../__types__/visita';

type MapFiltersProps = {
  pharmacies: Farmacia[];
  doctors: Medico[];
  visits: Visita[];
  onFilteredEntitiesChange: (entities: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }>) => void;
};

// Extracts unique brick names from entities, sorted alphabetically
// Adds "No Brick" option if any entities lack a brick assignment
function getAvailableBricks(entities: Array<{ nombreBrick?: string }>): string[] {
  const brickSet = new Set<string>();
  let hasUndefinedBrick = false;

  entities.forEach((entity) => {
    if (entity.nombreBrick) {
      brickSet.add(entity.nombreBrick);
    } else {
      hasUndefinedBrick = true;
    }
  });

  const bricksArray = Array.from(brickSet).sort();

  if (hasUndefinedBrick) {
    bricksArray.push(NO_BRICK);
  }

  return bricksArray;
}

export function MapFilters({ pharmacies, doctors, visits, onFilteredEntitiesChange }: MapFiltersProps) {
  const [selectedBricks, setSelectedBricks] = useState<string[]>([]);
  const [showFarmacias, setShowFarmacias] = useState<boolean>(true);
  const [showMedicos, setShowMedicos] = useState<boolean>(true);
  const [filterVisibility, setFilterVisibility] = useState<{
    brickFilter: boolean;
    entityTypeFilter: boolean;
  }>({ brickFilter: false, entityTypeFilter: false });
  const [showVisitHistoryFilterDialog, setShowVisitHistoryFilterDialog] = useState(false);
  const [visitHistoryFilter, setVisitHistoryFilter] = useState<VisitHistoryFilterConfig>({ type: 'none' });

  const availableBricks = useMemo(
    () => getAvailableBricks([...pharmacies, ...doctors]),
    [pharmacies, doctors]
  );

  // Filter entities based on selected bricks, visibility toggles, and visit history
  const filteredEntities = useMemo(() => {
    // Helper function to check if an entity passes the visit history filter
    const passesVisitHistoryFilter = (entityType: 'farmacia' | 'medico', entityId: string): boolean => {
      if (visitHistoryFilter.type === 'none') {
        return true;
      }

      // Get all visits for this entity
      const entityVisits = visits.filter(
        (v) => v.entidadObjetivoTipo === entityType && v.entidadObjetivoId === entityId
      );

      if (visitHistoryFilter.type === 'never-visited') {
        return entityVisits.length === 0;
      }

      if (visitHistoryFilter.type === 'only-not-found') {
        // Entity must have at least one visit and all visits must be "noEncontrado"
        if (entityVisits.length === 0) {
          return false;
        }
        return entityVisits.every((v) => v.estatus === 'noEncontrado');
      }

      if (visitHistoryFilter.type === 'not-visited-since') {
        const daysThreshold = visitHistoryFilter.daysSince ?? 30;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        const thresholdString = thresholdDate.toISOString().split('T')[0];

        // No visits at all means it passes
        if (entityVisits.length === 0) {
          return true;
        }

        // Get the most recent visit date
        const mostRecentVisit = entityVisits
          .filter((v) => v.fechaVisita) // Only consider visits with actual visit date
          .sort((a, b) => (b.fechaVisita ?? '').localeCompare(a.fechaVisita ?? ''))
          .at(0);

        // If no visits with actual dates, consider it as never visited
        if (!mostRecentVisit || !mostRecentVisit.fechaVisita) {
          return true;
        }

        // Check if most recent visit is older than threshold
        return mostRecentVisit.fechaVisita < thresholdString;
      }

      if (visitHistoryFilter.type === 'visited-within-days') {
        const daysThreshold = visitHistoryFilter.daysSince ?? 30;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        const thresholdString = thresholdDate.toISOString().split('T')[0];

        // No visits at all means it doesn't pass
        if (entityVisits.length === 0) {
          return false;
        }

        // Get the most recent visit date
        const mostRecentVisit = entityVisits
          .filter((v) => v.fechaVisita) // Only consider visits with actual visit date
          .sort((a, b) => (b.fechaVisita ?? '').localeCompare(a.fechaVisita ?? ''))
          .at(0);

        // If no visits with actual dates, doesn't pass
        if (!mostRecentVisit || !mostRecentVisit.fechaVisita) {
          return false;
        }

        // Check if most recent visit is within the threshold (newer than or equal to threshold)
        return mostRecentVisit.fechaVisita >= thresholdString;
      }

      return true;
    };

    const entities: Array<{ type: 'farmacia'; data: Farmacia } | { type: 'medico'; data: Medico }> = [];

    // Add filtered pharmacies
    if (showFarmacias) {
      const farmaciasToAdd =
        selectedBricks.length === 0
          ? pharmacies
          : pharmacies.filter((farmacia) => {
              if (selectedBricks.includes(NO_BRICK) && !farmacia.nombreBrick) {
                return true;
              }
              return farmacia.nombreBrick && selectedBricks.includes(farmacia.nombreBrick);
            });

      // Apply visit history filter
      const farmaciasWithVisitFilter = farmaciasToAdd.filter((farmacia) =>
        passesVisitHistoryFilter('farmacia', farmacia.id)
      );

      farmaciasWithVisitFilter.forEach((farmacia) => {
        entities.push({ type: 'farmacia', data: farmacia });
      });
    }

    // Add filtered doctors
    if (showMedicos) {
      const medicosToAdd =
        selectedBricks.length === 0
          ? doctors
          : doctors.filter((medico) => {
              if (selectedBricks.includes(NO_BRICK) && !medico.nombreBrick) {
                return true;
              }
              return medico.nombreBrick && selectedBricks.includes(medico.nombreBrick);
            });

      // Apply visit history filter
      const medicosWithVisitFilter = medicosToAdd.filter((medico) =>
        passesVisitHistoryFilter('medico', medico.id)
      );

      medicosWithVisitFilter.forEach((medico) => {
        entities.push({ type: 'medico', data: medico });
      });
    }

    return entities;
  }, [pharmacies, doctors, selectedBricks, showFarmacias, showMedicos, visitHistoryFilter, visits]);

  // Notify parent whenever filtered entities change
  useEffect(() => {
    onFilteredEntitiesChange(filteredEntities);
  }, [filteredEntities, onFilteredEntitiesChange]);

  return (
    <>
      {/* Filter Toggle Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant={filterVisibility.brickFilter ? 'contained' : 'outlined'}
          onClick={() => setFilterVisibility(prev => ({ ...prev, brickFilter: !prev.brickFilter }))}
        >
          Bricks
        </Button>
        <Button
          variant={filterVisibility.entityTypeFilter ? 'contained' : 'outlined'}
          onClick={() => setFilterVisibility(prev => ({ ...prev, entityTypeFilter: !prev.entityTypeFilter }))}
        >
          Entidades
        </Button>
        <Button
          variant={visitHistoryFilter.type !== 'none' ? 'contained' : 'outlined'}
          color={visitHistoryFilter.type !== 'none' ? 'secondary' : 'primary'}
          onClick={() => setShowVisitHistoryFilterDialog(true)}
        >
          Historial
          {visitHistoryFilter.type !== 'none' && (
            <Chip
              label="●"
              size="small"
              color="secondary"
              sx={{ ml: 1, height: '20px', minWidth: '20px', '& .MuiChip-label': { px: 0.5 } }}
            />
          )}
        </Button>
      </Box>

      {/* Brick Filter */}
      <Collapse in={filterVisibility.brickFilter}>
        <BrickFilter bricks={availableBricks} value={selectedBricks} onChange={setSelectedBricks} />
      </Collapse>

      {/* Visibility Toggles */}
      <Collapse in={filterVisibility.entityTypeFilter}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showFarmacias}
                onChange={(e) => setShowFarmacias(e.target.checked)}
                sx={{ color: 'success.main', '&.Mui-checked': { color: 'success.main' } }}
              />
            }
            label={
              <Typography
                sx={{ fontWeight: showFarmacias ? 'bold' : 'normal', color: 'success.main' }}
              >
                ● Farmacias
              </Typography>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={showMedicos}
                onChange={(e) => setShowMedicos(e.target.checked)}
                sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
              />
            }
            label={
              <Typography
                sx={{ fontWeight: showMedicos ? 'bold' : 'normal', color: 'primary.main' }}
              >
                ● Médicos
              </Typography>
            }
          />
        </Box>
      </Collapse>

      {/* Stats */}
      <Stack spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Mostrando ({filteredEntities.filter((e) => e.type === 'farmacia').length}/
          {pharmacies.length}) farmacias ({filteredEntities.filter((e) => e.type === 'medico').length}/{doctors.length}) médicos
        </Typography>
        {visitHistoryFilter.type !== 'none' && (
          <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 'bold' }}>
            {visitHistoryFilter.type === 'never-visited' && '🔍 Filtro: Nunca visitadas'}
            {visitHistoryFilter.type === 'not-visited-since' &&
              `🔍 Filtro: No visitadas desde hace ${visitHistoryFilter.daysSince} días`}
            {visitHistoryFilter.type === 'visited-within-days' &&
              `🔍 Filtro: Visitadas en los últimos ${visitHistoryFilter.daysSince} días`}
            {visitHistoryFilter.type === 'only-not-found' && '🔍 Filtro: Solo marcadas como "No encontrado"'}
          </Typography>
        )}
      </Stack>

      {/* Visit History Filter Dialog */}
      <VisitHistoryFilterDialog
        open={showVisitHistoryFilterDialog}
        currentFilter={visitHistoryFilter}
        onClose={() => setShowVisitHistoryFilterDialog(false)}
        onApply={setVisitHistoryFilter}
      />
    </>
  );
}
