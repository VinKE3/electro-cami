"use server";

import { db } from "@/db";
import { cashMovements, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCashMovements() {
  try {
    const list = await db.query.cashMovements.findMany({
      orderBy: [desc(cashMovements.date)],
      with: {
        product: true,
      },
    });

    // Calcular balances en Pesos (ARS) y Dólares (USD)
    let efectivoTotal = 0;
    let mercadoPagoTotal = 0;
    let totalIngresos = 0;
    let totalEgresos = 0;

    let dolaresEfectivoTotal = 0;
    let dolaresIngresos = 0;
    let dolaresEgresos = 0;

    for (const item of list) {
      const amount = parseFloat(item.amount);
      const isUSD = item.currency === "USD";

      if (isUSD) {
        if (item.type === "ingreso") {
          dolaresIngresos += amount;
          dolaresEfectivoTotal += amount;
        } else {
          dolaresEgresos += amount;
          dolaresEfectivoTotal -= amount;
        }
      } else {
        if (item.type === "ingreso") {
          totalIngresos += amount;
          if (item.paymentMethod === "efectivo") efectivoTotal += amount;
          else mercadoPagoTotal += amount;
        } else {
          totalEgresos += amount;
          if (item.paymentMethod === "efectivo") efectivoTotal -= amount;
          else mercadoPagoTotal -= amount;
        }
      }
    }

    return {
      success: true,
      data: {
        movements: list,
        efectivoTotal,
        mercadoPagoTotal,
        totalBalance: efectivoTotal + mercadoPagoTotal,
        totalIngresos,
        totalEgresos,
        dolaresEfectivoTotal,
        dolaresIngresos,
        dolaresEgresos,
      },
    };
  } catch (error: any) {
    console.error("Error fetching cash movements:", error);
    return { success: false, error: error.message };
  }
}

export async function createCashMovement(formData: {
  type: "ingreso" | "egreso";
  category: string;
  amount: number;
  paymentMethod: "efectivo" | "mercado_pago" | "transferencia";
  description: string;
  currency?: "ARS" | "USD";
  productId?: number | null;
  units?: number | null;
  updateCostPrice?: boolean;
  newCashPrice?: number | null;
}) {
  try {
    if (formData.amount <= 0) throw new Error("El monto debe ser mayor a 0");

    const currency = formData.currency || "ARS";
    const units = formData.units ? Number(formData.units) : 1;

    const [newMovement] = await db
      .insert(cashMovements)
      .values({
        type: formData.type,
        category: formData.category,
        amount: formData.amount.toString(),
        currency: currency,
        paymentMethod: formData.paymentMethod,
        description: formData.description.trim(),
        productId: formData.productId || null,
        units: formData.productId ? units : null,
      })
      .returning();

    // Si es compra de mercadería vinculada a un producto:
    if (
      formData.type === "egreso" &&
      formData.category === "compra_mercaderia" &&
      formData.productId
    ) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, formData.productId));

      if (product) {
        const currentStock = product.stock ?? 0;
        const newStock = currentStock + units;
        const newStatus = newStock > 0 ? "disponible" : product.status;

        const updateData: any = {
          stock: newStock,
          status: newStatus,
        };

        // Si se indicó actualizar el costo del producto con el nuevo precio de compra unitario:
        if (formData.updateCostPrice) {
          const unitCost = Math.round(formData.amount / units);
          updateData.costPrice = unitCost.toString();
        }

        // Si se indicó actualizar el precio de venta al público en el mismo paso:
        if (formData.newCashPrice && formData.newCashPrice > 0) {
          updateData.cashPrice = formData.newCashPrice.toString();
        }

        await db
          .update(products)
          .set(updateData)
          .where(eq(products.id, formData.productId));
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, data: newMovement };
  } catch (error: any) {
    console.error("Error creating cash movement:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCashMovement(id: number) {
  try {
    await db.delete(cashMovements).where(eq(cashMovements.id, id));
    revalidatePath("/admin");
    revalidatePath("/admin/caja");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting cash movement:", error);
    return { success: false, error: error.message };
  }
}

export async function exchangeDollarsToPesos(data: {
  usdAmount: number;
  exchangeRate: number;
  targetMethod: "efectivo" | "mercado_pago";
  notes?: string;
}) {
  try {
    if (data.usdAmount <= 0) throw new Error("El monto en dólares debe ser mayor a 0");
    if (data.exchangeRate <= 0) throw new Error("La cotización debe ser mayor a 0");

    const arsAmount = Math.round(data.usdAmount * data.exchangeRate);

    // 1. Egreso en caja USD
    await db.insert(cashMovements).values({
      type: "egreso",
      category: "cambio_divisa",
      amount: data.usdAmount.toString(),
      currency: "USD",
      paymentMethod: "efectivo",
      description: `Venta/Canje de US$ ${data.usdAmount} billete a $${arsAmount.toLocaleString("es-AR")} ARS (Cotiz: $${data.exchangeRate})${data.notes ? ` - ${data.notes}` : ""}`,
    });

    // 2. Ingreso en caja ARS
    await db.insert(cashMovements).values({
      type: "ingreso",
      category: "cambio_divisa",
      amount: arsAmount.toString(),
      currency: "ARS",
      paymentMethod: data.targetMethod,
      description: `Ingreso por cambio de US$ ${data.usdAmount} billete (Cotiz: $${data.exchangeRate})${data.notes ? ` - ${data.notes}` : ""}`,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/caja");

    return { success: true, arsAmount };
  } catch (error: any) {
    console.error("Error exchanging USD to ARS:", error);
    return { success: false, error: error.message };
  }
}

export async function setInitialCashBalances(data: {
  targetCashPesos: number;
  targetMercadoPago: number;
  targetDolares: number;
  reason?: string;
}) {
  try {
    // 1. Obtener balance actual
    const currentRes = await getCashMovements();
    if (!currentRes.success || !currentRes.data) {
      throw new Error("No se pudo obtener el saldo actual de caja");
    }

    const { efectivoTotal, mercadoPagoTotal, dolaresEfectivoTotal } = currentRes.data;

    const diffCash = Math.round(Number(data.targetCashPesos)) - Math.round(Number(efectivoTotal));
    const diffMP = Math.round(Number(data.targetMercadoPago)) - Math.round(Number(mercadoPagoTotal));
    const diffUSD = Math.round(Number(data.targetDolares)) - Math.round(Number(dolaresEfectivoTotal || 0));
    const reasonText = data.reason?.trim() || "Ajuste de Capital / Fondo Inicial";

    // 2. Ajuste Efectivo Pesos
    if (Math.abs(diffCash) >= 1) {
      await db.insert(cashMovements).values({
        type: diffCash > 0 ? "ingreso" : "egreso",
        category: "fondo_inicial",
        amount: Math.abs(diffCash).toString(),
        currency: "ARS",
        paymentMethod: "efectivo",
        description: `${reasonText} - Efectivo Billetes`,
      });
    }

    // 3. Ajuste Mercado Pago Pesos
    if (Math.abs(diffMP) >= 1) {
      await db.insert(cashMovements).values({
        type: diffMP > 0 ? "ingreso" : "egreso",
        category: "fondo_inicial",
        amount: Math.abs(diffMP).toString(),
        currency: "ARS",
        paymentMethod: "mercado_pago",
        description: `${reasonText} - Mercado Pago / Digital`,
      });
    }

    // 4. Ajuste Dólares Físicos (USD)
    if (Math.abs(diffUSD) >= 1) {
      await db.insert(cashMovements).values({
        type: diffUSD > 0 ? "ingreso" : "egreso",
        category: "fondo_inicial",
        amount: Math.abs(diffUSD).toString(),
        currency: "USD",
        paymentMethod: "efectivo",
        description: `${reasonText} - Dólares Billete Físico`,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/caja");

    return { success: true };
  } catch (error: any) {
    console.error("Error setting initial cash balances:", error);
    return { success: false, error: error.message };
  }
}


