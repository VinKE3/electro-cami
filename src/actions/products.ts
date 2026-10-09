"use server";

import { db } from "@/db";
import { products, suppliers, cashMovements } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProducts(options?: { publishedOnly?: boolean; category?: string }) {
  try {
    const list = await db.query.products.findMany({
      where: (p, { eq, and }) => {
        const conditions = [];
        if (options?.publishedOnly) {
          conditions.push(eq(p.isPublished, true));
        }
        if (options?.category && options.category !== "todas") {
          conditions.push(eq(p.category, options.category));
        }
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      with: {
        supplier: true,
      },
      orderBy: [desc(products.createdAt)],
    });

    return { success: true, data: list };
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return { success: false, error: error.message };
  }
}

export async function createProduct(formData: {
  name: string;
  description?: string;
  category: string;
  costPrice: number;
  cashPrice: number;
  installmentPrice?: number;
  stock?: number;
  currency?: "ARS" | "USD";
  imageUrl?: string;
  status?: string;
  isPublished?: boolean;
  supplierId?: number | null;
  deductFromCash?: boolean;
  paymentMethod?: "efectivo" | "mercado_pago";
}) {
  try {
    const stockVal = formData.stock !== undefined ? Number(formData.stock) : 1;
    const computedStatus =
      formData.status || (stockVal > 0 ? "disponible" : "agotado");

    const [newProduct] = await db
      .insert(products)
      .values({
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category: formData.category.trim() || "Varios",
        costPrice: formData.costPrice.toString(),
        cashPrice: formData.cashPrice.toString(),
        installmentPrice: formData.installmentPrice ? formData.installmentPrice.toString() : null,
        stock: stockVal,
        currency: formData.currency || "ARS",
        imageUrl: formData.imageUrl?.trim() || null,
        status: computedStatus,
        isPublished: formData.isPublished ?? true,
        supplierId: formData.supplierId || null,
      })
      .returning();

    // Si se indicó descontar el costo de la caja de hoy:
    if (formData.deductFromCash && formData.costPrice > 0 && stockVal > 0) {
      const totalAmount = Math.round(Number(formData.costPrice) * stockVal);
      await db.insert(cashMovements).values({
        type: "egreso",
        category: "compra_mercaderia",
        amount: totalAmount.toString(),
        currency: formData.currency || "ARS",
        paymentMethod: formData.paymentMethod || "efectivo",
        productId: newProduct.id,
        units: stockVal,
        description: `Compra inicial de stock: ${stockVal} u. de ${newProduct.name}`,
      });
    }

    revalidatePath("/admin/productos");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/creditos");
    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/");
    return { success: true, data: newProduct };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProduct(
  id: number,
  formData: {
    name: string;
    description?: string;
    category: string;
    costPrice: number;
    cashPrice: number;
    installmentPrice?: number;
    stock?: number;
    currency?: "ARS" | "USD";
    imageUrl?: string;
    status?: string;
    isPublished?: boolean;
    supplierId?: number | null;
  }
) {
  try {
    const stockVal = formData.stock !== undefined ? Number(formData.stock) : 1;
    let computedStatus = formData.status || "disponible";
    if (stockVal <= 0 && computedStatus === "disponible") {
      computedStatus = "agotado";
    } else if (stockVal > 0 && computedStatus === "agotado") {
      computedStatus = "disponible";
    }

    const [updated] = await db
      .update(products)
      .set({
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category: formData.category.trim() || "Varios",
        costPrice: formData.costPrice.toString(),
        cashPrice: formData.cashPrice.toString(),
        installmentPrice: formData.installmentPrice ? formData.installmentPrice.toString() : null,
        stock: stockVal,
        currency: formData.currency || "ARS",
        imageUrl: formData.imageUrl?.trim() || null,
        status: computedStatus,
        isPublished: formData.isPublished ?? true,
        supplierId: formData.supplierId || null,
      })
      .where(eq(products.id, id))
      .returning();

    revalidatePath("/admin/productos");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/creditos");
    revalidatePath("/catalogo");
    revalidatePath("/");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating product:", error);
    return { success: false, error: error.message };
  }
}

export async function adjustProductStock(id: number, delta: number) {
  try {
    const [existing] = await db.select().from(products).where(eq(products.id, id));
    if (!existing) throw new Error("Producto no encontrado");

    const newStock = Math.max(0, (existing.stock ?? 0) + delta);
    const newStatus = newStock > 0 ? "disponible" : "agotado";

    const [updated] = await db
      .update(products)
      .set({
        stock: newStock,
        status: newStatus,
      })
      .where(eq(products.id, id))
      .returning();

    revalidatePath("/admin/productos");
    revalidatePath("/admin/caja");
    revalidatePath("/admin/creditos");
    revalidatePath("/catalogo");
    revalidatePath("/");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id: number) {
  try {
    await db.delete(products).where(eq(products.id, id));
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
}
