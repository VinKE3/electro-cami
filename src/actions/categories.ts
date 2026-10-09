"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, isNull, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CategoryItem {
  id: number;
  name: string;
  parentId: number | null;
  order: number;
  subcategories: {
    id: number;
    name: string;
    parentId: number;
    order: number;
  }[];
}

export async function getCategories(): Promise<{
  success: boolean;
  data?: CategoryItem[];
  error?: string;
}> {
  try {
    const all = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.order), asc(categories.name));

    const mainCategories = all.filter((c) => c.parentId === null);
    const subCategories = all.filter((c) => c.parentId !== null);

    const structured: CategoryItem[] = mainCategories.map((main) => ({
      id: main.id,
      name: main.name,
      parentId: null,
      order: main.order,
      subcategories: subCategories
        .filter((sub) => sub.parentId === main.id)
        .map((sub) => ({
          id: sub.id,
          name: sub.name,
          parentId: main.id,
          order: sub.order,
        })),
    }));

    return { success: true, data: structured };
  } catch (err: any) {
    console.error("Error fetching categories:", err);
    return { success: false, error: err.message || "Error al cargar categorías" };
  }
}

export async function createCategory(data: {
  name: string;
  parentId?: number | null;
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "El nombre de la categoría no puede estar vacío." };
    }

    const [newCat] = await db
      .insert(categories)
      .values({
        name: trimmedName,
        parentId: data.parentId || null,
      })
      .returning();

    revalidatePath("/admin/productos");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, data: newCat };
  } catch (err: any) {
    console.error("Error creating category:", err);
    return { success: false, error: err.message || "Error al crear la categoría" };
  }
}

export async function updateCategory(
  id: number,
  name: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "El nombre no puede estar vacío." };
    }

    const [updated] = await db
      .update(categories)
      .set({ name: trimmedName })
      .where(eq(categories.id, id))
      .returning();

    revalidatePath("/admin/productos");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (err: any) {
    console.error("Error updating category:", err);
    return { success: false, error: err.message || "Error al actualizar la categoría" };
  }
}

export async function deleteCategory(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await db.delete(categories).where(eq(categories.id, id));

    revalidatePath("/admin/productos");
    revalidatePath("/catalogo");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    console.error("Error deleting category:", err);
    return { success: false, error: err.message || "Error al eliminar la categoría" };
  }
}
