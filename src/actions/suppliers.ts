"use server";

import { db } from "@/db";
import { suppliers, products } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";

export async function getSuppliers() {
  try {
    await requireSession();
    const list = await db
      .select()
      .from(suppliers)
      .orderBy(desc(suppliers.createdAt));

    if (list.length === 0) {
      return { success: true, data: [] };
    }

    const supplierIds = list.map((s) => s.id);
    const allProducts = await db
      .select()
      .from(products)
      .where(inArray(products.supplierId, supplierIds));

    const productsBySupplier = new Map<number, typeof allProducts>();
    for (const p of allProducts) {
      if (p.supplierId == null) continue;
      const arr = productsBySupplier.get(p.supplierId) ?? [];
      arr.push(p);
      productsBySupplier.set(p.supplierId, arr);
    }

    const suppliersWithCount = list.map((s) => {
      const prodList = productsBySupplier.get(s.id) ?? [];
      return {
        ...s,
        productsCount: prodList.length,
        products: prodList,
      };
    });

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
    await requireSession();
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
    await requireSession();
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
    await requireSession();
    await db.delete(suppliers).where(eq(suppliers.id, id));
    revalidatePath("/admin/proveedores");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting supplier:", error);
    return { success: false, error: error.message };
  }
}
