"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Asegurar usuario administrador inicial si la tabla está vacía
async function ensureInitialAdmin() {
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) {
    const hashed = await hashPassword("Camila2026++");
    await db.insert(users).values({
      name: "Jesús",
      username: "jesus",
      passwordHash: hashed,
      role: "admin",
      isActive: true,
    });
  }
}

export async function login(formData: { username: string; password: string }) {
  try {
    await ensureInitialAdmin();

    const username = formData.username.trim().toLowerCase();
    const password = formData.password.trim();

    if (!username || !password) {
      return { success: false, error: "Ingresa tu usuario y contraseña." };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    if (!user.isActive) {
      return { success: false, error: "Esta cuenta se encuentra inactiva." };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Usuario o contraseña incorrectos." };
    }

    // Guardar sesión segura en Cookie
    await setSessionCookie({
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error during login:", error);
    return { success: false, error: "Error al iniciar sesión: " + error.message };
  }
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}

export async function getCurrentUser() {
  return getSession();
}

export async function getUsers() {
  try {
    await ensureInitialAdmin();
    const list = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createUser(data: {
  name: string;
  username: string;
  password: string;
  role?: "admin" | "colaborador";
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Solo el administrador puede crear nuevos usuarios." };
    }

    const username = data.username.trim().toLowerCase();
    if (username.length < 3) {
      return { success: false, error: "El usuario debe tener al menos 3 caracteres." };
    }
    if (data.password.length < 4) {
      return { success: false, error: "La contraseña debe tener al menos 4 caracteres." };
    }

    // Verificar si ya existe el usuario
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing) {
      return { success: false, error: "Ya existe un usuario con ese nombre de usuario." };
    }

    const passwordHash = await hashPassword(data.password.trim());

    const [newUser] = await db
      .insert(users)
      .values({
        name: data.name.trim(),
        username,
        passwordHash,
        role: data.role || "colaborador",
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
      });

    revalidatePath("/admin/usuarios");
    return { success: true, data: newUser };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(id: number) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    if (session.userId === id) {
      return { success: false, error: "No puedes eliminar tu propia cuenta activa." };
    }

    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
