"use server";

import { db } from "@/db";
import { suppliers, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
  try {
    const list = await db
      .select()
      .from(suppliers)
      .orderBy(desc(suppliers.createdAt));

    // Contar productos provistos
    const suppliersWithCount = await Promise.all(
      list.map(async (s) => {
        const prodList = await db
          .select()
          .from(products)
          .where(eq(products.supplierId, s.id));

        return {
          ...s,
          productsCount: prodList.length,
          products: prodList,
        };
      })
    );

    return { success: true, data: suppliersWithCount };
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return { success: false, error: error.message };
  }
}

export async function createSupplier(formData: {
  name: string;
  phone?: string;
  address?: string;
  category?: string;
  notes?: string;
}) {
  try {
    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: formData.name.trim(),
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        category: formData.category?.trim() || null,
        notes: formData.notes?.trim() || null,
      })
      .returning();

    revalidatePath("/admin/proveedores");
    revalidatePath("/admin/productos");
    return { success: true, data: newSupplier };
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSupplier(
  id: number,
  formData: {
    name: string;
    phone?: string;
    address?: string;
    category?: string;
    notes?: string;
  }
) {
  try {
    const [updated] = await db
      .update(suppliers)
      .set({
        name: formData.name.trim(),
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        category: formData.category?.trim() || null,
        notes: formData.notes?.trim() || null,
      })
      .where(eq(suppliers.id, id))
      .returning();

    revalidatePath("/admin/proveedores");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating supplier:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSupplier(id: number) {
  try {
    await db.delete(suppliers).where(eq(suppliers.id, id));
    revalidatePath("/admin/proveedores");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting supplier:", error);
    return { success: false, error: error.message };
  }
}
