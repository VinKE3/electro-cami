import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: "No se envió ningún archivo" }, { status: 400 });
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

      if (!image) {
        return NextResponse.json({ success: false, error: "No se proporcionó imagen" }, { status: 400 });
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
