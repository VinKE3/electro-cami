"use server";

import { db } from "@/db";
import { customers, credits, installments } from "@/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getArgentinaTodayStr } from "@/lib/utils";

export async function getCustomers() {
  try {
    const list = await db
      .select()
      .from(customers)
      .orderBy(desc(customers.createdAt));

    const todayStr = getArgentinaTodayStr();

    // Calculamos resumen de créditos y semáforo de confianza para cada cliente
    const customersWithStats = await Promise.all(
      list.map(async (c) => {
        const clientCredits = await db
          .select()
          .from(credits)
          .where(eq(credits.customerId, c.id));

        const activeCredits = clientCredits.filter((cr) => cr.status === "activo");
        const completedCredits = clientCredits.filter((cr) => cr.status === "finalizado");
        const totalDebt = activeCredits.reduce(
          (acc, cr) => acc + parseFloat(cr.remainingAmount || "0"),
          0
        );

        let overdueCount = 0;
        let paidCount = 0;
        const creditIds = clientCredits.map((cr) => cr.id);

        if (creditIds.length > 0) {
          const clientInstallments = await db
            .select()
            .from(installments)
            .where(inArray(installments.creditId, creditIds));

          for (const inst of clientInstallments) {
            if (inst.status === "pagada") {
              paidCount++;
            } else if (inst.status === "vencida" || inst.dueDate < todayStr) {
              overdueCount++;
            }
          }
        }

        let score: "confiable" | "moroso" | "regular" = "regular";
        let scoreLabel = "🟡 Al día / Nuevo";

        if (overdueCount > 0) {
          score = "moroso";
          scoreLabel = `🔴 Moroso (${overdueCount} ${overdueCount === 1 ? "cuota vencida" : "cuotas vencidas"})`;
        } else if (completedCredits.length > 0 || paidCount >= 3) {
          score = "confiable";
          scoreLabel = "🟢 Confiable (Buen pagador)";
        } else {
          score = "regular";
          scoreLabel = "🟡 Al día / Nuevo";
        }

        return {
          ...c,
          activeCreditsCount: activeCredits.length,
          completedCreditsCount: completedCredits.length,
          totalDebt,
          overdueCount,
          paidCount,
          score,
          scoreLabel,
        };
      })
    );

    return { success: true, data: customersWithStats };
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerById(id: number) {
  try {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        credits: {
          with: {
            installments: true,
            payments: true,
            product: true,
          },
          orderBy: [desc(credits.createdAt)],
        },
      },
    });

    return { success: true, data: customer };
  } catch (error: any) {
    console.error("Error fetching customer:", error);
    return { success: false, error: error.message };
  }
}

export async function createCustomer(formData: {
  name: string;
  lastName?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  try {
    const [newCustomer] = await db
      .insert(customers)
      .values({
        name: formData.name.trim(),
        lastName: formData.lastName?.trim() || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        notes: formData.notes?.trim() || null,
        status: "al_dia",
      })
      .returning();

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/creditos");
    return { success: true, data: newCustomer };
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(
  id: number,
  formData: {
    name: string;
    lastName?: string;
    phone?: string;
    address?: string;
    notes?: string;
    status?: string;
  }
) {
  try {
    const [updated] = await db
      .update(customers)
      .set({
        name: formData.name.trim(),
        lastName: formData.lastName?.trim() || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        notes: formData.notes?.trim() || null,
        status: formData.status || "al_dia",
      })
      .where(eq(customers.id, id))
      .returning();

    revalidatePath("/admin/clientes");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: number) {
  try {
    // Verificar si tiene créditos activos
    const activeCredits = await db
      .select()
      .from(credits)
      .where(eq(credits.customerId, id));

    if (activeCredits.length > 0) {
      return {
        success: false,
        error: "No se puede eliminar un cliente con historial o créditos asociados.",
      };
    }

    await db.delete(customers).where(eq(customers.id, id));
    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return { success: false, error: error.message };
  }
}
