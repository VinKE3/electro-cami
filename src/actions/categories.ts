"use server";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";

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
    await requireSession();
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
    await requireSession();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "El nombre no puede estar vacío." };
    }

    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!existing) {
        return null;
      }

      const [saved] = await tx
        .update(categories)
        .set({ name: trimmedName })
        .where(eq(categories.id, id))
        .returning();

      // Sincronizar productos existentes si cambió el nombre
      if (existing.name !== trimmedName) {
        if (existing.parentId === null) {
          await tx
            .update(products)
            .set({ category: trimmedName })
            .where(eq(products.category, existing.name));
        } else {
          const [parent] = await tx
            .select()
            .from(categories)
            .where(eq(categories.id, existing.parentId))
            .limit(1);

          if (parent) {
            await tx
              .update(products)
              .set({ subcategory: trimmedName })
              .where(
                and(
                  eq(products.category, parent.name),
                  eq(products.subcategory, existing.name)
                )
              );
          } else {
            await tx
              .update(products)
              .set({ subcategory: trimmedName })
              .where(eq(products.subcategory, existing.name));
          }
        }
      }

      return saved;
    });

    if (!updated) {
      return { success: false, error: "Categoría no encontrada." };
    }

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
    await requireSession();
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
