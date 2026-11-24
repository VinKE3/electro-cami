"use server";

import { db } from "@/db";
import {
  credits,
  installments,
  payments,
  cashMovements,
  customers,
  products,
} from "@/db/schema";
import { eq, desc, asc, and, lte, gte, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getArgentinaTodayStr, getArgentinaDateOffsetStr } from "@/lib/utils";
import { requireSession } from "@/lib/auth";

// Función para calcular fecha de vencimiento según frecuencia
function calculateDueDate(startDateStr: string, index: number, frequency: string, frequencyDays: number): string {
  // Parsing date string safely (YYYY-MM-DD)
  const [year, month, day] = startDateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (frequency === "semanal") {
    date.setUTCDate(date.getUTCDate() + (index + 1) * 7);
  } else if (frequency === "quincenal") {
    date.setUTCDate(date.getUTCDate() + (index + 1) * 14);
  } else if (frequency === "mensual") {
    date.setUTCMonth(date.getUTCMonth() + (index + 1));
  } else {
    // Frecuencia personalizada en días
    date.setUTCDate(date.getUTCDate() + (index + 1) * (frequencyDays || 7));
  }

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function createCredit(formData: {
  customerId: number;
  productId?: number | null;
  concept: string;
  currency?: "ARS" | "USD";
  exchangeRate?: number;
  costAmount?: number;
  baseAmount: number;
  interestRate: number; // e.g. 20 (meaning 20%)
  downPayment?: number; // entrega inicial
  installmentCount: number; // e.g. 6
  frequency: "semanal" | "quincenal" | "mensual" | "dias";
  frequencyDays?: number;
  startDate: string; // YYYY-MM-DD
  downPaymentMethod?: "efectivo" | "mercado_pago" | "transferencia";
  notes?: string;
}) {
  try {
    await requireSession();
    const base = Number(formData.baseAmount);
    const interest = Number(formData.interestRate || 0);
    const downPayment = Number(formData.downPayment || 0);
    const count = Number(formData.installmentCount);
    const creditCurrency = formData.currency || "ARS";

    if (count <= 0) throw new Error("La cantidad de cuotas debe ser al menos 1.");

    // Cálculo: Precio con interés y ajuste exacto en última cuota
    const interestMultiplier = 1 + interest / 100;
    const totalFinanced = Math.round(base * interestMultiplier);
    const remainingToFinance = Math.max(0, totalFinanced - downPayment);
    const baseInstallmentAmount = Math.floor(remainingToFinance / count);
    const lastInstallmentAmount =
      remainingToFinance - baseInstallmentAmount * (count - 1);

    // 1..4 Ejecutar creación de crédito, cuotas, seña y descuento de stock de forma atómica
    const newCredit = await db.transaction(async (tx) => {
      const [createdCredit] = await tx
        .insert(credits)
        .values({
          customerId: formData.customerId,
          productId: formData.productId || null,
          concept: formData.concept.trim(),
          currency: creditCurrency,
          exchangeRate: formData.exchangeRate ? formData.exchangeRate.toString() : null,
          costAmount: (formData.costAmount || 0).toString(),
          baseAmount: base.toString(),
          interestRate: interest.toString(),
          totalAmount: totalFinanced.toString(),
          downPayment: downPayment.toString(),
          remainingAmount: remainingToFinance.toString(),
          installmentCount: count,
          installmentAmount: baseInstallmentAmount.toString(),
          frequency: formData.frequency,
          frequencyDays: formData.frequencyDays || 7,
          startDate: formData.startDate,
          status: remainingToFinance <= 0 ? "finalizado" : "activo",
          notes: formData.notes?.trim() || null,
        })
        .returning();

      const installmentsToInsert = [];
      for (let i = 0; i < count; i++) {
        const dueDate = calculateDueDate(
          formData.startDate,
          i,
          formData.frequency,
          formData.frequencyDays || 7
        );
        const amountForThisInstallment =
          i === count - 1 ? lastInstallmentAmount : baseInstallmentAmount;

        installmentsToInsert.push({
          creditId: createdCredit.id,
          installmentNumber: i + 1,
          amount: amountForThisInstallment.toString(),
          paidAmount: "0",
          dueDate: dueDate,
          status: "pendiente",
        });
      }

      if (installmentsToInsert.length > 0) {
        await tx.insert(installments).values(installmentsToInsert);
      }

      if (downPayment > 0) {
        const [initialPayment] = await tx
          .insert(payments)
          .values({
            creditId: createdCredit.id,
            installmentId: null,
            amount: downPayment.toString(),
            currency: creditCurrency,
            paymentMethod: formData.downPaymentMethod || "efectivo",
            notes: "Entrega inicial / Seña",
          })
          .returning();

        await tx.insert(cashMovements).values({
          type: "ingreso",
          category: "entrega_inicial",
          amount: downPayment.toString(),
          currency: creditCurrency,
          paymentMethod: formData.downPaymentMethod || "efectivo",
          description: `Entrega inicial por ${formData.concept} (Crédito #${createdCredit.id})`,
          creditId: createdCredit.id,
          paymentId: initialPayment.id,
        });
      }

      if (formData.productId) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, formData.productId));

        if (product) {
          const currentStock = product.stock ?? 1;
          const newStock = Math.max(0, currentStock - 1);
          const newStatus = newStock <= 0 ? "agotado" : "disponible";
          await tx
            .update(products)
            .set({
              stock: newStock,
              status: newStatus,
            })
            .where(eq(products.id, formData.productId));
        }
      }

      return createdCredit;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/creditos");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/productos");

    return { success: true, data: newCredit };
  } catch (error: any) {
    console.error("Error creating credit:", error);
    return { success: false, error: error.message };
  }
}

export async function registerPayment(data: {
  creditId: number;
  installmentId?: number | null;
  amount: number;
  paymentMethod: "efectivo" | "mercado_pago" | "transferencia" | "otro";
  notes?: string;
  payInCurrency?: "ARS" | "USD";
  exchangeRate?: number;
  amountInArs?: number;
}) {
  try {
    await requireSession();
    const paymentAmount = Number(data.amount);
    if (paymentAmount <= 0) throw new Error("El monto del pago debe ser mayor a cero");

    const txResult = await db.transaction(async (tx) => {
      const credit = await tx.query.credits.findFirst({
        where: eq(credits.id, data.creditId),
        with: {
          customer: true,
          installments: {
            orderBy: [installments.installmentNumber],
          },
        },
      });

      if (!credit) throw new Error("Crédito no encontrado");

      const isCreditUSD = credit.currency === "USD";
      const payInCurrency = data.payInCurrency || (isCreditUSD ? "USD" : "ARS");

      // 1. Insertar el pago
      const [newPayment] = await tx
        .insert(payments)
        .values({
          creditId: credit.id,
          installmentId: data.installmentId || null,
          amount: paymentAmount.toString(),
          currency: credit.currency || "ARS",
          exchangeRate: data.exchangeRate ? data.exchangeRate.toString() : null,
          amountInArs: data.amountInArs ? data.amountInArs.toString() : null,
          paymentMethod: data.paymentMethod,
          notes: data.notes?.trim() || null,
        })
        .returning();

      // 2. Registrar en Caja automáticamente
      const cashAmount =
        payInCurrency === "ARS" && isCreditUSD && data.amountInArs
          ? data.amountInArs.toString()
          : paymentAmount.toString();

      const cashDesc =
        isCreditUSD && payInCurrency === "ARS"
          ? `Cobro a ${credit.customer.name} por "${credit.concept}" (US$ ${paymentAmount} al cambio $${data.exchangeRate})`
          : `Cobro a ${credit.customer.name} ${credit.customer.lastName || ""} por "${credit.concept}"`;

      await tx.insert(cashMovements).values({
        type: "ingreso",
        category: "cobro_cuota",
        amount: cashAmount,
        currency: payInCurrency,
        paymentMethod: data.paymentMethod,
        description: cashDesc,
        creditId: credit.id,
        paymentId: newPayment.id,
      });

      // 3. Actualizar la cuota específica si se proveyó
      if (data.installmentId) {
        const targetInst = credit.installments.find((i) => i.id === data.installmentId);
        if (targetInst) {
          const currentPaid = parseFloat(targetInst.paidAmount || "0");
          const newPaid = currentPaid + paymentAmount;
          const totalInstAmount = parseFloat(targetInst.amount);

          const newStatus = newPaid >= totalInstAmount ? "pagada" : "parcial";

          await tx
            .update(installments)
            .set({
              paidAmount: newPaid.toString(),
              status: newStatus,
              paidAt: newStatus === "pagada" ? new Date() : null,
            })
            .where(eq(installments.id, targetInst.id));
        }
      } else {
        // Si no se eligió una cuota en específico, aplicar pago en cascada a las más antiguas pendientes
        let remainingToApply = paymentAmount;
        for (const inst of credit.installments) {
          if (remainingToApply <= 0) break;
          if (inst.status !== "pagada") {
            const instAmount = parseFloat(inst.amount);
            const instPaid = parseFloat(inst.paidAmount || "0");
            const instDue = instAmount - instPaid;

            if (remainingToApply >= instDue) {
              await tx
                .update(installments)
                .set({
                  paidAmount: instAmount.toString(),
                  status: "pagada",
                  paidAt: new Date(),
                })
                .where(eq(installments.id, inst.id));
              remainingToApply -= instDue;
            } else {
              await tx
                .update(installments)
                .set({
                  paidAmount: (instPaid + remainingToApply).toString(),
                  status: "parcial",
                })
                .where(eq(installments.id, inst.id));
              remainingToApply = 0;
            }
          }
        }
      }

      // 4. Actualizar saldo restante del crédito
      const currentRemaining = parseFloat(credit.remainingAmount);
      const newRemaining = Math.max(0, currentRemaining - paymentAmount);
      const isCompleted = newRemaining === 0;

      await tx
        .update(credits)
        .set({
          remainingAmount: newRemaining.toString(),
          status: isCompleted ? "finalizado" : "activo",
        })
        .where(eq(credits.id, credit.id));

      return {
        creditId: credit.id,
        paymentId: newPayment.id,
        newRemaining,
        isCompleted,
        customerName: `${credit.customer.name} ${credit.customer.lastName || ""}`.trim(),
        customerPhone: credit.customer.phone,
        concept: credit.concept,
        currency: credit.currency || "ARS",
      };
    });

    revalidatePath("/admin");
    revalidatePath("/admin/creditos");
    revalidatePath(`/admin/creditos/${txResult.creditId}`);
    revalidatePath("/admin/caja");

    return {
      success: true,
      data: {
        paymentId: txResult.paymentId,
        newRemaining: txResult.newRemaining,
        isCompleted: txResult.isCompleted,
        customerName: txResult.customerName,
        customerPhone: txResult.customerPhone,
        concept: txResult.concept,
        amount: paymentAmount,
        currency: txResult.currency,
        exchangeRate: data.exchangeRate,
        amountInArs: data.amountInArs,
        paymentMethod: data.paymentMethod,
      },
    };
  } catch (error: any) {
    console.error("Error registering payment:", error);
    return { success: false, error: error.message };
  }
}

export async function getCredits(options?: { status?: string }) {
  try {
    await requireSession();
    const list = await db.query.credits.findMany({
      where: (c, { eq }) => {
        if (options?.status && options.status !== "todos") {
          return eq(c.status, options.status);
        }
        return undefined;
      },
      with: {
        customer: true,
        product: true,
        installments: {
          orderBy: [installments.installmentNumber],
        },
        payments: {
          orderBy: [desc(payments.paymentDate)],
        },
      },
      orderBy: [desc(credits.createdAt)],
    });

    return { success: true, data: list };
  } catch (error: any) {
    console.error("Error fetching credits:", error);
    return { success: false, error: error.message };
  }
}

export async function getCreditById(id: number) {
  try {
    await requireSession();
    const credit = await db.query.credits.findFirst({
      where: eq(credits.id, id),
      with: {
        customer: true,
        product: true,
        installments: {
          orderBy: [installments.installmentNumber],
        },
        payments: {
          orderBy: [desc(payments.paymentDate)],
        },
      },
    });

    return { success: true, data: credit };
  } catch (error: any) {
    console.error("Error fetching credit:", error);
    return { success: false, error: error.message };
  }
}

// Obtener cobros para el Dashboard (Hoy, Esta semana, Vencidos)
export async function getDashboardOverview() {
  try {
    await requireSession();
    const todayStr = getArgentinaTodayStr();
    const nextWeekStr = getArgentinaDateOffsetStr(7);

    // 1. Créditos activos
    const allCredits = await db.query.credits.findMany({
      where: eq(credits.status, "activo"),
      with: {
        customer: true,
        product: true,
      },
    });

    const totalInTheStreetArs = allCredits
      .filter((c) => (c.currency || "ARS") !== "USD")
      .reduce((acc, c) => acc + parseFloat(c.remainingAmount || "0"), 0);

    const totalInTheStreetUsd = allCredits
      .filter((c) => c.currency === "USD")
      .reduce((acc, c) => acc + parseFloat(c.remainingAmount || "0"), 0);

    // 2. Cuotas pendientes y vencidas de créditos activos
    const allPendingInstallments = await db.query.installments.findMany({
      where: sql`${installments.status} != 'pagada'`,
      with: {
        credit: {
          with: {
            customer: true,
          },
        },
      },
      orderBy: [installments.dueDate],
    });

    const pendingInstallments = allPendingInstallments.filter(
      (i) => i.credit && i.credit.status === "activo"
    );

    // Separar en: Vencidas (dueDate < todayStr), Vence Hoy (dueDate == todayStr), Próximos 7 días
    const overdue = pendingInstallments.filter((i) => i.dueDate < todayStr);
    const dueToday = pendingInstallments.filter((i) => i.dueDate === todayStr);
    const upcomingThisWeek = pendingInstallments.filter(
      (i) => i.dueDate > todayStr && i.dueDate <= nextWeekStr
    );

    // 3. Totales en caja
    const allCashMovements = await db.select().from(cashMovements);
    let cashInHand = 0;
    let mercadoPagoBalance = 0;
    let dolaresEfectivoTotal = 0;

    for (const mov of allCashMovements) {
      const amount = parseFloat(mov.amount);
      const isIngreso = mov.type === "ingreso";
      const factor = isIngreso ? 1 : -1;

      if (mov.currency === "USD") {
        dolaresEfectivoTotal += factor * amount;
      } else {
        if (mov.paymentMethod === "efectivo") {
          cashInHand += factor * amount;
        } else {
          mercadoPagoBalance += factor * amount;
        }
      }
    }

    return {
      success: true,
      data: {
        activeCreditsCount: allCredits.length,
        totalInTheStreet: totalInTheStreetArs,
        totalInTheStreetUsd,
        cashInHand: Math.max(0, cashInHand),
        mercadoPagoBalance: Math.max(0, mercadoPagoBalance),
        dolaresEfectivoTotal: Math.max(0, dolaresEfectivoTotal),
        overdue,
        dueToday,
        upcomingThisWeek,
      },
    };
  } catch (error: any) {
    console.error("Error in getDashboardOverview:", error);
    return { success: false, error: error.message };
  }
}

export async function revertPayment(paymentId: number) {
  try {
    await requireSession();

    const result = await db.transaction(async (tx) => {
      const targetPayment = await tx.query.payments.findFirst({
        where: eq(payments.id, paymentId),
        with: {
          credit: {
            with: {
              installments: {
                orderBy: [asc(installments.installmentNumber)],
              },
            },
          },
        },
      });

      if (!targetPayment || !targetPayment.credit) {
        return { success: false, error: "Pago no encontrado." };
      }

      const credit = targetPayment.credit;
      if (credit.status === "cancelado") {
        return {
          success: false,
          error: "No se puede anular un pago de un crédito cancelado.",
        };
      }

      const linkedMovements = await tx
        .select()
        .from(cashMovements)
        .where(eq(cashMovements.paymentId, paymentId));

      const isDownPayment =
        targetPayment.notes === "Entrega inicial / Seña" ||
        linkedMovements.some((m) => m.category === "entrega_inicial");

      if (isDownPayment) {
        return {
          success: false,
          error:
            "La entrega inicial no se puede anular por separado. Si hubo un error, cancelá el crédito completo.",
        };
      }

      // 1. Eliminar movimiento de caja asociado y el pago
      await tx.delete(cashMovements).where(eq(cashMovements.paymentId, paymentId));
      await tx.delete(payments).where(eq(payments.id, paymentId));

      // 2. Recalcular cuotas y saldo restante de forma determinística con los pagos restantes
      const remainingPayments = await tx
        .select()
        .from(payments)
        .where(eq(payments.creditId, credit.id))
        .orderBy(asc(payments.paymentDate), asc(payments.id));

      const remainingPaymentIds = remainingPayments.map((p) => p.id);
      const downPaymentIds = new Set<number>();

      if (remainingPaymentIds.length > 0) {
        const remainingCashMovs = await tx
          .select()
          .from(cashMovements)
          .where(inArray(cashMovements.paymentId, remainingPaymentIds));

        for (const m of remainingCashMovs) {
          if (m.paymentId && m.category === "entrega_inicial") {
            downPaymentIds.add(m.paymentId);
          }
        }
      }

      const remainingNonDownPayments = remainingPayments.filter(
        (p) => p.notes !== "Entrega inicial / Seña" && !downPaymentIds.has(p.id)
      );

      const paidMap = new Map<number, number>();
      for (const inst of credit.installments) {
        paidMap.set(inst.id, 0);
      }

      for (const p of remainingNonDownPayments) {
        const amt = parseFloat(p.amount || "0");
        if (amt <= 0) continue;

        if (p.installmentId && paidMap.has(p.installmentId)) {
          paidMap.set(p.installmentId, (paidMap.get(p.installmentId) ?? 0) + amt);
        } else {
          let remainingToApply = amt;
          for (const inst of credit.installments) {
            if (remainingToApply <= 0) break;
            const instAmount = parseFloat(inst.amount || "0");
            const currentPaid = paidMap.get(inst.id) ?? 0;
            const instDue = instAmount - currentPaid;
            if (instDue > 0) {
              const applied = Math.min(remainingToApply, instDue);
              paidMap.set(inst.id, currentPaid + applied);
              remainingToApply -= applied;
            }
          }
        }
      }

      for (const inst of credit.installments) {
        const paid = paidMap.get(inst.id) ?? 0;
        const instAmount = parseFloat(inst.amount || "0");
        const newStatus =
          paid >= instAmount ? "pagada" : paid > 0 ? "parcial" : "pendiente";

        await tx
          .update(installments)
          .set({
            paidAmount: paid.toString(),
            status: newStatus,
            paidAt: newStatus === "pagada" ? (inst.paidAt ?? new Date()) : null,
          })
          .where(eq(installments.id, inst.id));
      }

      const totalInstallmentPayments = remainingNonDownPayments.reduce(
        (acc, p) => acc + parseFloat(p.amount || "0"),
        0
      );
      const financedAmount = Math.max(
        0,
        parseFloat(credit.totalAmount || "0") - parseFloat(credit.downPayment || "0")
      );
      const newRemaining = Math.max(0, financedAmount - totalInstallmentPayments);

      await tx
        .update(credits)
        .set({
          remainingAmount: newRemaining.toString(),
          status: newRemaining <= 0 ? "finalizado" : "activo",
        })
        .where(eq(credits.id, credit.id));

      return { success: true };
    });

    if (!result.success) return result;

    revalidatePath("/admin");
    revalidatePath("/admin/creditos");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/clientes");

    return { success: true };
  } catch (error: any) {
    console.error("Error reverting payment:", error);
    return { success: false, error: error.message };
  }
}

export async function cancelCredit(
  creditId: number,
  options?: { restoreStock?: boolean; revertCash?: boolean }
) {
  try {
    await requireSession();

    const result = await db.transaction(async (tx) => {
      const [credit] = await tx
        .select()
        .from(credits)
        .where(eq(credits.id, creditId));

      if (!credit) {
        return { success: false, error: "Crédito no encontrado." };
      }
      if (credit.status === "cancelado") {
        return { success: false, error: "El crédito ya está cancelado." };
      }

      await tx
        .update(credits)
        .set({
          status: "cancelado",
          remainingAmount: "0",
        })
        .where(eq(credits.id, creditId));

      if (options?.revertCash !== false) {
        await tx.delete(cashMovements).where(eq(cashMovements.creditId, creditId));
      }

      if (options?.restoreStock !== false && credit.productId) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, credit.productId));

        if (product) {
          const newStock = (product.stock ?? 0) + 1;
          await tx
            .update(products)
            .set({
              stock: newStock,
              status: "disponible",
            })
            .where(eq(products.id, credit.productId));
        }
      }

      return { success: true };
    });

    if (!result.success) return result;

    revalidatePath("/admin");
    revalidatePath("/admin/creditos");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Error cancelling credit:", error);
    return { success: false, error: error.message };
  }
}
