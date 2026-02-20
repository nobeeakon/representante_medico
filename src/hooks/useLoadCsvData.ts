import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { Farmacia } from '../__types__/farmacia';
import type { Medico } from '../__types__/medico';

// Helper function to map CSV row to Medico type
function mapCsvRowToMedico(row: Record<string, string>): Medico {
  return {
    email: row['Email'] || undefined,
    estadoOProvinciaDeEnvio: row['Estado o provincia de envío'] || undefined,
    ciudadDeEnvio: row['Ciudad de envío'] || undefined,
    colonia: row['Colonia'] || undefined,
    calleDeEnvio: row['Calle de envío'] || undefined,
    estatus: row['Estatus'] || undefined,
    codigoPostalDeEnvio: row['Código postal de envío'] || undefined,
    nombreDeLaCuenta: row['Nombre de la cuenta'] || undefined,
    especialidad: row['Especialidad'] || undefined,
    nombreBrick: row['NOMBRE_BRICK'] || undefined,
    lat: row['lat'] ? parseFloat(row['lat']) : undefined,
    lng: row['lng'] ? parseFloat(row['lng']) : undefined,
    googleMapsUrl: row['google_maps_url'] || undefined,
  };
}

// Helper function to map CSV row to Farmacia type
function mapCsvRowToFarmacia(row: Record<string, string>): Farmacia {
  return {
    email: row['Email'] || undefined,
    territorio: row['Territorio'] || undefined,
    paisDeEnvio: row['País de envío'] || undefined,
    estadoOProvinciaDeEnvio: row['Estado o provincia de envío'] || undefined,
    municipio: row['Municipio'] || undefined,
    colonia: row['Colonia'] || undefined,
    calleDeEnvio: row['Calle de envío'] || undefined,
    estatus: row['Estatus'] || undefined,
    codigoPostalDeEnvio: row['Código postal de envío'] || undefined,
    ruta: row['Ruta'] || undefined,
    nombreDeLaCuenta: row['Nombre de la cuenta'] || undefined,
    plantillaDeClientes: row['Plantilla de clientes'] || undefined,
    folioDeTienda: row['Folio de tienda'] || undefined,
    cedulaProfesional: row['Cédula profesional'] || undefined,
    grupoDeCadena: row['Grupo de cadena'] || undefined,
    especialidad: row['Especialidad'] || undefined,
    categoriaDelMedico: row['Categoría del médico'] || undefined,
    propietarioDeLaCuenta: row['Propietario de la cuenta'] || undefined,
    lat: row['lat'] ? parseFloat(row['lat']) : undefined,
    lng: row['lng'] ? parseFloat(row['lng']) : undefined,
    googleMapsUrl: row['google_maps_url'] || undefined,
    nombreBrick: row['NOMBRE_BRICK'] || undefined,
  };
}

interface UseLoadCsvDataReturn {
  medicos: Medico[];
  farmacias: Farmacia[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to load CSV data for farmacias and medicos from public directory
 */
export function useLoadCsvData(): UseLoadCsvDataReturn {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load farmacias CSV
        const farmaciasResponse = await fetch('/__data__/farmacias_geocoded_bricks.csv');
        if (!farmaciasResponse.ok) {
          throw new Error(`Failed to load farmacias CSV: ${farmaciasResponse.statusText}`);
        }
        const farmaciasText = await farmaciasResponse.text();

        // Load medicos CSV
        const medicosResponse = await fetch('/__data__/medicos_geocoded.csv');
        if (!medicosResponse.ok) {
          throw new Error(`Failed to load medicos CSV: ${medicosResponse.statusText}`);
        }
        const medicosText = await medicosResponse.text();

        // Parse farmacias CSV
        Papa.parse<Record<string, string>>(farmaciasText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedFarmacias = results.data.map(mapCsvRowToFarmacia);
            setFarmacias(parsedFarmacias);
            console.log(`Loaded ${parsedFarmacias.length} farmacias from CSV`);
          },
          error: (error: Error) => {
            console.error('Error parsing farmacias CSV:', error);
            setError(`Error parsing farmacias CSV: ${error.message}`);
          },
        });

        // Parse medicos CSV
        Papa.parse<Record<string, string>>(medicosText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedMedicos = results.data.map(mapCsvRowToMedico);
            setMedicos(parsedMedicos);
            console.log(`Loaded ${parsedMedicos.length} medicos from CSV`);
          },
          error: (error: Error) => {
            console.error('Error parsing medicos CSV:', error);
            setError(`Error parsing medicos CSV: ${error.message}`);
          },
        });

        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading data';
        console.error('Error loading CSV files:', err);
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { medicos, farmacias, loading, error };
}
