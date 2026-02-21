import { useState, useMemo } from 'react'
import { MapView } from './components/Map'
import { useGoogleSheetsData } from './google-sheets/useGoogleSheetsData'
import { GoogleAuth } from './google-sheets/GoogleAuth'
import './App.css'

// Special constant for entries without a brick
const NO_BRICK = '(Sin Brick)';

function App() {
  const { medicos, farmacias, loading, error } = useGoogleSheetsData();
  const [selectedBricks, setSelectedBricks] = useState<string[]>([]);
  const [showFarmacias, setShowFarmacias] = useState<boolean>(true);
  const [showMedicos, setShowMedicos] = useState<boolean>(true);

  // Get unique brick names from both farmacias and medicos
  const availableBricks = useMemo(() => {
    const brickSet = new Set<string>();
    let hasUndefinedBrick = false;

    farmacias.forEach(farmacia => {
      if (farmacia.nombreBrick) {
        brickSet.add(farmacia.nombreBrick);
      } else {
        hasUndefinedBrick = true;
      }
    });

    medicos.forEach(medico => {
      if (medico.nombreBrick) {
        brickSet.add(medico.nombreBrick);
      } else {
        hasUndefinedBrick = true;
      }
    });

    const bricksArray = Array.from(brickSet).sort();

    // Add "No Brick" option at the end if there are entries without bricks
    if (hasUndefinedBrick) {
      bricksArray.push(NO_BRICK);
    }

    return bricksArray;
  }, [farmacias, medicos]);

  // Filter farmacias and medicos based on selected bricks and visibility toggles
  const filteredFarmacias = useMemo(() => {
    if (!showFarmacias) {
      return [];
    }
    if (selectedBricks.length === 0) {
      return farmacias;
    }
    return farmacias.filter(farmacia => {
      // Check if NO_BRICK is selected and this farmacia has no brick
      if (selectedBricks.includes(NO_BRICK) && !farmacia.nombreBrick) {
        return true;
      }
      // Check if this farmacia's brick is in the selected list
      return farmacia.nombreBrick && selectedBricks.includes(farmacia.nombreBrick);
    });
  }, [farmacias, selectedBricks, showFarmacias]);

  const filteredMedicos = useMemo(() => {
    if (!showMedicos) {
      return [];
    }
    if (selectedBricks.length === 0) {
      return medicos;
    }
    return medicos.filter(medico => {
      // Check if NO_BRICK is selected and this medico has no brick
      if (selectedBricks.includes(NO_BRICK) && !medico.nombreBrick) {
        return true;
      }
      // Check if this medico's brick is in the selected list
      return medico.nombreBrick && selectedBricks.includes(medico.nombreBrick);
    });
  }, [medicos, selectedBricks, showMedicos]);

  // Handle individual brick checkbox toggle
  const handleBrickToggle = (brick: string): void => {
    setSelectedBricks(prev => {
      if (prev.includes(brick)) {
        return prev.filter(b => b !== brick);
      } else {
        return [...prev, brick];
      }
    });
  };

  // Handle select all / deselect all
  const handleSelectAll = (): void => {
    if (selectedBricks.length === availableBricks.length) {
      setSelectedBricks([]);
    } else {
      setSelectedBricks([...availableBricks]);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h2>Cargando datos...</h2>
          <p>Por favor espera mientras cargamos los datos de farmacias y médicos.</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    const isAuthError = error.includes('Not authenticated') || error.includes('Failed to initialize Google API');

    return (
      <div className="error-container">
        <div className="error-content">
          <h2>Error al Cargar Datos</h2>
          <p>{error}</p>
          {isAuthError && (
            <GoogleAuth onAuthStateChange={(isAuth) => {
              if (isAuth) {
                window.location.reload();
              }
            }} />
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn-retry"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>Mapa de Farmacias y Médicos</h1>

        <GoogleAuth />

        {availableBricks.length > 0 && (
          <div className="brick-filter-container">
            <div className="brick-filter-header">
              <label className="brick-filter-label">
                Filtrar por Brick:
              </label>
              <div className="brick-filter-buttons">
                <button
                  onClick={handleSelectAll}
                  className="btn-select-all"
                >
                  {selectedBricks.length === availableBricks.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                </button>
                {selectedBricks.length > 0 && (
                  <button
                    onClick={() => setSelectedBricks([])}
                    className="btn-clear-filter"
                  >
                    Limpiar Filtro
                  </button>
                )}
              </div>
            </div>
            <div className="brick-list">
              {availableBricks.map(brick => {
                const isNoBrick = brick === NO_BRICK;
                const isSelected = selectedBricks.includes(brick);
                return (
                  <label
                    key={brick}
                    className={`brick-item ${isSelected ? 'selected' : ''} ${isNoBrick ? 'no-brick' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleBrickToggle(brick)}
                    />
                    <span className={`brick-item-label ${isNoBrick ? 'no-brick' : ''}`}>
                      {brick}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="brick-filter-summary">
              {selectedBricks.length > 0
                ? `${selectedBricks.length} de ${availableBricks.length} brick${selectedBricks.length !== 1 ? 's' : ''} seleccionado${selectedBricks.length !== 1 ? 's' : ''}`
                : `${availableBricks.length} brick${availableBricks.length !== 1 ? 's' : ''} disponible${availableBricks.length !== 1 ? 's' : ''} - selecciona para filtrar`}
            </div>
          </div>
        )}

      </header>
      <main>

        <div className="visibility-toggles">
          <label className="visibility-toggle">
            <input
              type="checkbox"
              checked={showFarmacias}
              onChange={(e) => setShowFarmacias(e.target.checked)}
            />
            <span className={`visibility-toggle-label farmacias ${showFarmacias ? 'active' : ''}`}>● Farmacias</span>
          </label>
          <label className="visibility-toggle">
            <input
              type="checkbox"
              checked={showMedicos}
              onChange={(e) => setShowMedicos(e.target.checked)}
            />
            <span className={`visibility-toggle-label medicos ${showMedicos ? 'active' : ''}`}>● Médicos</span>
          </label>
        </div>

        <div className="stats">
          <span>

          {farmacias.length} farmacia{farmacias.length !== 1 ? 's' : ''} • {medicos.length} médico{medicos.length !== 1 ? 's' : ''} cargado{(farmacias.length + medicos.length) !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="filtered-stats">
          Mostrando {filteredFarmacias.length} farmacia{filteredFarmacias.length !== 1 ? 's' : ''} y{' '}
          {filteredMedicos.length} médico{filteredMedicos.length !== 1 ? 's' : ''}
        </div>

        <MapView farmacias={filteredFarmacias} medicos={filteredMedicos} />
      </main>
    </div>
  )
}

export default App
