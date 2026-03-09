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
  selectedDate: string;
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

export function MapFilters({ pharmacies, doctors, visits, selectedDate, onFilteredEntitiesChange }: MapFiltersProps) {
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
    // Helper to parse date string in local timezone (not UTC)
    const parseDateLocal = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    };

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
        const referenceDate = parseDateLocal(selectedDate);
        const thresholdDate = new Date(referenceDate);
        thresholdDate.setDate(referenceDate.getDate() - daysThreshold);

        // No visits at all means it passes
        if (entityVisits.length === 0) {
          return true;
        }

        // Get the most recent visit date
        const mostRecentVisit = entityVisits
          .filter((v) => v.fechaVisita) // Only consider visits with actual visit date
          .sort((a, b) => b.fechaVisita.getTime() - a.fechaVisita.getTime())
          .at(0);

        // If no visits with actual dates, consider it as never visited
        if (!mostRecentVisit || !mostRecentVisit.fechaVisita) {
          return true;
        }

        // Check if most recent visit is older than threshold
        return mostRecentVisit.fechaVisita < thresholdDate;
      }

      if (visitHistoryFilter.type === 'visited-within-days') {
        const daysThreshold = visitHistoryFilter.daysSince ?? 30;
        const referenceDate = parseDateLocal(selectedDate);
        const thresholdDate = new Date(referenceDate);
        thresholdDate.setDate(referenceDate.getDate() - daysThreshold);

        // No visits at all means it doesn't pass
        if (entityVisits.length === 0) {
          return false;
        }

        // Get the most recent visit date
        const mostRecentVisit = entityVisits
          .filter((v) => v.fechaVisita) // Only consider visits with actual visit date
          .sort((a, b) => b.fechaVisita.getTime() - a.fechaVisita.getTime())
          .at(0);

        // If no visits with actual dates, doesn't pass
        if (!mostRecentVisit || !mostRecentVisit.fechaVisita) {
          return false;
        }

        // Check if most recent visit is within the threshold (newer than or equal to threshold)
        return mostRecentVisit.fechaVisita >= thresholdDate;
      }

      if (visitHistoryFilter.type === 'planning-focused') {
        const daysAhead = visitHistoryFilter.daysAhead ?? 7;
        const daysBack = visitHistoryFilter.daysBack ?? 30;

        const referenceDate = parseDateLocal(selectedDate);
        const futureDate = new Date(referenceDate);
        futureDate.setDate(referenceDate.getDate() + daysAhead);

        const pastDate = new Date(referenceDate);
        pastDate.setDate(referenceDate.getDate() - daysBack);

        // Set reference date to start of day for comparison
        const referenceDateStart = new Date(referenceDate);
        referenceDateStart.setHours(0, 0, 0, 0);
        const referenceDateEnd = new Date(referenceDate);
        referenceDateEnd.setHours(23, 59, 59, 999);

        const hasVisitToday = entityVisits.some(v =>
          v.fechaVisita >= referenceDateStart && v.fechaVisita <= referenceDateEnd
        );

        // Check if there's any planned visit in the next daysAhead days (from reference date)
        const hasPlannedVisitSoon = entityVisits.some(
          (v) => v.estatus === 'planeado' && v.fechaVisita &&
                 v.fechaVisita >= referenceDate && v.fechaVisita <= futureDate
        );

        // Check if there's any visit/plan in the last daysBack days (from reference date)
        const hasRecentActivity = entityVisits.filter(v => v.estatus === 'visitado')
        .some(
          (v) => v.fechaVisita && v.fechaVisita >= pastDate && v.fechaVisita <= referenceDate
        );

        // Pass filter if: NO planned visit soon AND NO recent activity
        return hasVisitToday || (!hasPlannedVisitSoon && !hasRecentActivity);
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
  }, [pharmacies, doctors, selectedBricks, showFarmacias, showMedicos, visitHistoryFilter, visits, selectedDate]);

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
        <Typography variant="caption" color="text.secondary">
          📅 Fecha de referencia: {selectedDate}
        </Typography>
        {visitHistoryFilter.type !== 'none' && (
          <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 'bold' }}>
            {visitHistoryFilter.type === 'never-visited' && '🔍 Filtro: Nunca visitadas'}
            {visitHistoryFilter.type === 'not-visited-since' &&
              `🔍 Filtro: No visitadas desde hace ${visitHistoryFilter.daysSince} días`}
            {visitHistoryFilter.type === 'visited-within-days' &&
              `🔍 Filtro: Visitadas en los últimos ${visitHistoryFilter.daysSince} días`}
            {visitHistoryFilter.type === 'only-not-found' && '🔍 Filtro: Solo marcadas como "No encontrado"'}
            {visitHistoryFilter.type === 'planning-focused' &&
              `🔍 Filtro: Sin visita planificada en los siguientes ${visitHistoryFilter.daysAhead} días, ni actividad reciente (${visitHistoryFilter.daysBack}d)`}
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
