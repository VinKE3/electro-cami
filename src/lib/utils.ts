import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Zona horaria estándar de Argentina
export const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";

// Obtener la fecha de hoy en Argentina en formato YYYY-MM-DD
export function getArgentinaTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Obtener fecha desplazada por N días en horario de Argentina (YYYY-MM-DD)
export function getArgentinaDateOffsetStr(daysOffset: number): string {
  const todayStr = getArgentinaTodayStr();
  const [y, m, d] = todayStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + daysOffset);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Determinar el estado de una cuota según la fecha de vencimiento y zona horaria de Argentina
export function getInstallmentStatus(
  dueDateStr: string,
  isPaid: boolean,
  todayStr: string = getArgentinaTodayStr()
): "pagada" | "vencida" | "hoy" | "pendiente" {
  if (isPaid) return "pagada";
  if (dueDateStr < todayStr) return "vencida";
  if (dueDateStr === todayStr) return "hoy";
  return "pendiente";
}

// Formateador de moneda en Pesos ($) o Dólares (US$)
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "ARS"
): string {
  const isUSD = currency?.toUpperCase() === "USD";
  if (amount === null || amount === undefined) return isUSD ? "US$ 0" : "$0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return isUSD ? "US$ 0" : "$0";

  if (isUSD) {
    const formatted = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
    return formatted.replace("USD", "US$");
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(num);
}

// Formateador de fechas legible en Argentina sin desfase UTC
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";

  // Si viene en formato YYYY-MM-DD (fecha sin componente de hora)
  if (typeof dateString === "string") {
    const trimmed = dateString.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match && !trimmed.includes("T")) {
      const [_, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

// Obtener fecha en formato YYYY-MM-DD en Argentina a partir de Date o ISO string
export function getArgentinaDateStr(dateString: string | Date | null | undefined): string {
  if (!dateString) return "";
  // Si ya es un string YYYY-MM-DD puro sin T
  if (typeof dateString === "string" && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Formateador de fecha y hora legible (DD/MM/YYYY, HH:mm hs)
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "-";
  return (
    new Intl.DateTimeFormat("es-AR", {
      timeZone: ARGENTINA_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " hs"
  );
}

// Generador de enlaces para WhatsApp con mensaje pre-cargado
export function generateWhatsAppLink(phone: string | null | undefined, message: string): string {
  if (!phone) return "#";
  // Limpiar caracteres no numéricos
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}

