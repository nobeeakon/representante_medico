import { useState, useMemo } from 'react'
import { MapView } from './components/Map'
import { useLoadCsvData } from './hooks/useLoadCsvData'
import './App.css'

// Special constant for entries without a brick
const NO_BRICK = '(Sin Brick)';

function App() {
  const { medicos, farmacias, loading, error } = useLoadCsvData();
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
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Cargando datos...</h2>
          <p style={{ color: '#666' }}>Por favor espera mientras cargamos los datos de farmacias y médicos.</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', padding: '20px' }}>
          <h2 style={{ color: '#ef4444' }}>Error al Cargar Datos</h2>
          <p style={{ color: '#666', marginTop: '10px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Mapa de Farmacias y Médicos</h1>

     
        {availableBricks.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', maxWidth: '900px', margin: '20px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '16px' }}>
                Filtrar por Brick:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSelectAll}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {selectedBricks.length === availableBricks.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                </button>
                {selectedBricks.length > 0 && (
                  <button
                    onClick={() => setSelectedBricks([])}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Limpiar Filtro
                  </button>
                )}
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '8px',
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '10px',
              backgroundColor: 'white',
              borderRadius: '5px',
              border: '1px solid #d1d5db'
            }}>
              {availableBricks.map(brick => {
                const isNoBrick = brick === NO_BRICK;
                return (
                  <label
                    key={brick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      backgroundColor: selectedBricks.includes(brick) ? '#e0f2fe' : 'transparent',
                      transition: 'background-color 0.2s',
                      border: isNoBrick ? '1px dashed #9ca3af' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedBricks.includes(brick)) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedBricks.includes(brick)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBricks.includes(brick)}
                      onChange={() => handleBrickToggle(brick)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{
                      fontSize: '14px',
                      userSelect: 'none',
                      fontStyle: isNoBrick ? 'italic' : 'normal',
                      color: isNoBrick ? '#6b7280' : 'inherit'
                    }}>
                      {brick}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
              {selectedBricks.length > 0
                ? `${selectedBricks.length} de ${availableBricks.length} brick${selectedBricks.length !== 1 ? 's' : ''} seleccionado${selectedBricks.length !== 1 ? 's' : ''}`
                : `${availableBricks.length} brick${availableBricks.length !== 1 ? 's' : ''} disponible${availableBricks.length !== 1 ? 's' : ''} - selecciona para filtrar`}
            </div>
          </div>
        )}
     
      </header>
      <main>

           <div style={{ marginTop: '10px', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showFarmacias}
              onChange={(e) => setShowFarmacias(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <span style={{ color: '#059669', fontWeight: showFarmacias ? 'bold' : 'normal' }}>● Farmacias</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showMedicos}
              onChange={(e) => setShowMedicos(e.target.checked)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <span style={{ color: '#2563eb', fontWeight: showMedicos ? 'bold' : 'normal' }}>● Médicos</span>
          </label>
        </div>

        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          {farmacias.length} farmacia{farmacias.length !== 1 ? 's' : ''} • {medicos.length} médico{medicos.length !== 1 ? 's' : ''} cargado{(farmacias.length + medicos.length) !== 1 ? 's' : ''}
        </div>
           <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          Mostrando {filteredFarmacias.length} farmacia{filteredFarmacias.length !== 1 ? 's' : ''} y{' '}
          {filteredMedicos.length} médico{filteredMedicos.length !== 1 ? 's' : ''}
        </div>
        <MapView farmacias={filteredFarmacias} medicos={filteredMedicos} />
      </main>
    </div>
  )
}

export default App
