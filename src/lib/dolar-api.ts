export interface DolarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface DolarData {
  blue: DolarRate;
  oficial?: DolarRate;
  updatedAt: string;
}

// Fallback por si la API no responde o no hay conexión temporal
const DEFAULT_BLUE: DolarRate = {
  moneda: "USD",
  casa: "blue",
  nombre: "Blue",
  compra: 1520,
  venta: 1540,
  fechaActualizacion: new Date().toISOString(),
};

/**
 * Obtiene la cotización del Dólar Blue en tiempo real desde dolarapi.com
 */
export async function fetchDolarBlue(): Promise<DolarRate> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 120 }, // Cache Next.js 2 minutos
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn("DolarApi responded with error status:", res.status);
      return DEFAULT_BLUE;
    }

    const data: DolarRate = await res.json();
    if (!data || !data.venta) return DEFAULT_BLUE;

    return data;
  } catch (error) {
    console.warn("Error fetching Dolar Blue from DolarApi, using fallback:", error);
    return DEFAULT_BLUE;
  }
}

/**
 * Obtiene las cotizaciones Blue y Oficial de Argentina
 */
export async function fetchAllDolares(): Promise<{ blue: DolarRate; oficial: DolarRate | null }> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 120 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return { blue: DEFAULT_BLUE, oficial: null };
    }

    const list: DolarRate[] = await res.json();
    const blue = list.find((d) => d.casa.toLowerCase() === "blue") || DEFAULT_BLUE;
    const oficial = list.find((d) => d.casa.toLowerCase() === "oficial") || null;

    return { blue, oficial };
  } catch (error) {
    console.warn("Error fetching all dolares, using fallback:", error);
    return { blue: DEFAULT_BLUE, oficial: null };
  }
}
