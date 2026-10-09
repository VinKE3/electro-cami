"use client";

import React, { useState, useRef, useEffect } from "react";
import { uploadImageAction, checkCloudinaryConfiguredAction } from "@/actions/upload";
import { UploadCloud, Image as ImageIcon, X, Loader2, Camera, Link as LinkIcon, CheckCircle2, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled = false }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [manualUrl, setManualUrl] = useState(value || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkCloudinaryConfiguredAction().then((res) => {
      setIsCloudinaryConfigured(res.configured);
      // Si no está configurado Cloudinary y no hay foto, pre-seleccionar modo URL para no bloquear
      if (!res.configured && !value) {
        setMode("url");
      }
    });
  }, [value]);

  useEffect(() => {
    setManualUrl(value || "");
  }, [value]);

  // Comprimir imagen en el navegador para que suba instantáneo desde el celular
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // Exportar como JPEG de alta calidad optimizado (~150-250kb)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      // 1. Comprimir en el cliente para velocidad extrema en móvil
      const compressedBase64 = await compressImage(file);

      // 2. Subir a Cloudinary mediante Server Action
      const res = await uploadImageAction(compressedBase64);

      if (res.success && res.url) {
        onChange(res.url);
        setManualUrl(res.url);
      } else {
        setUploadError(res.error || "No se pudo subir la foto.");
      }
    } catch (err: any) {
      console.error("Error al procesar imagen:", err);
      setUploadError(err.message || "Error al procesar la foto.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
    setManualUrl("");
    setUploadError(null);
  };

  const handleManualUrlApply = () => {
    onChange(manualUrl.trim());
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC]">
          Foto del Producto
        </label>
        <div className="flex items-center gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
              mode === "upload"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <Camera className="w-3 h-3" />
            <span>Subir / Cámara</span>
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
              mode === "url"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Enlace URL</span>
          </button>
        </div>
      </div>

      {/* Si ya hay imagen seleccionada, mostrar la vista previa */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#E5E7EB] dark:border-[#334155] bg-slate-50 dark:bg-[#0F172A] p-2 flex items-center gap-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 relative">
            <img
              src={value}
              alt="Vista previa"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Si la imagen falla en cargar, mostrar placeholder
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Foto cargada correctamente</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
              {value}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
              >
                Cambiar foto
              </button>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : mode === "upload" ? (
        <div>
          {/* Zona de subida interactiva */}
          <div
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
              isUploading
                ? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-slate-100/50 dark:hover:bg-[#0F172A]"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Subiendo y optimizando foto en Cloudinary...
                  </p>
                  <p className="text-[10px] text-slate-500">Espera un instante</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                    Toca para sacar foto o elegir de la galería
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    JPG, PNG, WebP • Se optimiza automáticamente en la nube
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Aviso si Cloudinary no tiene claves configuradas en .env */}
          {isCloudinaryConfigured === false && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-bold block">Falta configurar Cloudinary en .env</span>
                <span>
                  Para subir fotos a la nube, agrega tus credenciales en el archivo <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono">.env</code>. También puedes cambiar a <b>&quot;Enlace URL&quot;</b> arriba para usar un enlace directo.
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Modo URL Manual */
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/... o enlace de foto"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              disabled={disabled}
              className="flex-1 px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleManualUrlApply}
              disabled={disabled || !manualUrl.trim()}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer shrink-0"
            >
              Aplicar
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Pega el enlace web de cualquier imagen en Internet.
          </p>
        </div>
      )}

      {/* Mensaje de error de subida */}
      {uploadError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span className="font-bold block">Error al subir imagen:</span>
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
