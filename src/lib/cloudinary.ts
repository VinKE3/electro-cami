import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export async function uploadToCloudinary(
  fileBase64: string,
  folder: string = "electro-cami/productos"
): Promise<{ success: boolean; url?: string; error?: string }> {
  const cfg = cloudinary.config();
  const hasConfig = Boolean(
    (cfg.cloud_name && cfg.api_key && cfg.api_secret) ||
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );

  if (!hasConfig) {
    return {
      success: false,
      error:
        "Faltan configurar las credenciales de Cloudinary en el archivo .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).",
    };
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(fileBase64, {
      folder,
      resource_type: "image",
      transformation: [
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    return {
      success: true,
      url: uploadResult.secure_url,
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message || "Error al subir la imagen a Cloudinary",
    };
  }
}
