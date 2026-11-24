"use server";

import { uploadToCloudinary, cloudinary } from "@/lib/cloudinary";
import { getSession, requireSession } from "@/lib/auth";

export async function uploadImageAction(
  base64Data: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireSession();
    if (!base64Data) {
      return { success: false, error: "No se proporcionó ninguna imagen." };
    }

    const res = await uploadToCloudinary(base64Data, "electro-cami/productos");
    return res;
  } catch (err: any) {
    console.error("Error in uploadImageAction:", err);
    return { success: false, error: err.message || "Error al subir la imagen" };
  }
}

export async function checkCloudinaryConfiguredAction() {
  const session = await getSession();
  if (!session) {
    return { configured: false };
  }

  const cfg = cloudinary.config();
  const isConfigured = Boolean(
    (cfg.cloud_name && cfg.api_key && cfg.api_secret) ||
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );
  return { configured: isConfigured };
}
