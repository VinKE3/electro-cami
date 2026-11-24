import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_BASE64_LENGTH = 15 * 1024 * 1024; // ~15 MB en caracteres base64

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: "No se envió ningún archivo" }, { status: 400 });
      }

      if (file.type && !file.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, error: "Solo se permiten archivos de imagen" },
          { status: 400 }
        );
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { success: false, error: "La imagen supera el límite de 10 MB" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = file.type || "image/jpeg";
      const base64Data = `data:${mime};base64,${buffer.toString("base64")}`;

      const result = await uploadToCloudinary(base64Data, "electro-cami/productos");
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    } else {
      const body = await req.json();
      const { image } = body;

      if (typeof image !== "string" || !image.startsWith("data:image/")) {
        return NextResponse.json(
          { success: false, error: "Formato de imagen inválido" },
          { status: 400 }
        );
      }

      if (image.length > MAX_BASE64_LENGTH) {
        return NextResponse.json(
          { success: false, error: "La imagen supera el tamaño máximo permitido" },
          { status: 400 }
        );
      }

      const result = await uploadToCloudinary(image, "electro-cami/productos");
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error("API /api/upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la subida" },
      { status: 500 }
    );
  }
}
