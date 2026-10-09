"use server";

import { fetchDolarBlue, fetchAllDolares, DolarRate } from "@/lib/dolar-api";

export async function getLiveDolarRates(): Promise<{
  success: boolean;
  blue: DolarRate;
  oficial?: DolarRate | null;
}> {
  try {
    const { blue, oficial } = await fetchAllDolares();
    return {
      success: true,
      blue,
      oficial,
    };
  } catch (error: any) {
    return {
      success: false,
      blue: {
        moneda: "USD",
        casa: "blue",
        nombre: "Blue",
        compra: 1520,
        venta: 1540,
        fechaActualizacion: new Date().toISOString(),
      },
    };
  }
}
