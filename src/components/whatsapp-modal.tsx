"use client";

import React, { useState } from "react";
import { Modal } from "./ui/modal";
import { formatCurrency, formatDate, generateWhatsAppLink } from "@/lib/utils";
import {
  MessageCircle,
  Copy,
  Check,
  Send,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  Receipt,
  User,
} from "lucide-react";

export type WhatsAppTemplateType = "recordatorio" | "datos_pago" | "mora" | "comprobante";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone?: string | null;
  concept: string;
  amount: number;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  dueDate?: string | null;
  currency?: string;
  remainingAmount?: number;
  paymentMethod?: string;
  defaultType?: WhatsAppTemplateType;
}

export function WhatsAppModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  concept,
  amount,
  installmentNumber,
  totalInstallments,
  dueDate,
  currency = "ARS",
  remainingAmount,
  paymentMethod,
  defaultType = "recordatorio",
}: WhatsAppModalProps) {
  const [template, setTemplate] = useState<WhatsAppTemplateType>(defaultType);
  const [copied, setCopied] = useState(false);
  const [customNotes, setCustomNotes] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setTemplate(defaultType);
      setCopied(false);
      setCustomNotes("");
    }
  }, [isOpen, defaultType]);

  const firstName = customerName.split(" ")[0] || customerName;
  const formattedAmount = formatCurrency(amount, currency);
  const formattedDueDate = dueDate ? formatDate(dueDate) : "esta semana";
  const formattedRemaining = remainingAmount !== undefined ? formatCurrency(remainingAmount, currency) : null;

  // Generador de textos según plantilla
  const getMessageContent = (): string => {
    switch (template) {
      case "recordatorio":
        return `¡Hola ${firstName}! 👋 Te escribimos de Electro Cami para recordarte el cobro de tu cuota ${
          installmentNumber ? `#${installmentNumber}` : ""
        } de ${formattedAmount} por "${concept}".\n\nVencimiento: ${formattedDueDate}.\n¿Pasamos a verte hoy o preferís pagar por Mercado Pago? ¡Muchas gracias! 🙏`;

      case "datos_pago":
        return `¡Hola ${firstName}! 👋 Te compartimos los datos de Mercado Pago para abonar tu cuota de ${formattedAmount} por "${concept}":\n\n🔹 *Alias:* ELECTRO.CAMI.PAGOS\n🔹 *Titular:* Camila / Electro Cami\n🔹 *Monto a transferir:* ${formattedAmount}\n\nUna vez realizado el envío, avisanos por este medio para registrar tu pago al instante. ¡Muchas gracias! 💳`;

      case "mora":
        return `Estimado/a ${customerName}, nos comunicamos de Electro Cami con respecto a tu crédito por "${concept}".\n\n⚠️ Te recordamos que la cuota ${
          installmentNumber ? `#${installmentNumber}` : ""
        } de ${formattedAmount} se encuentra vencida (${formattedDueDate}).\n\nTe pedimos por favor coordinar el pago hoy para regularizar el estado de tu cuenta y evitar recargos. Aguardamos tu respuesta. Muchas gracias.`;

      case "comprobante":
        return `🧾 *COMPROBANTE DE COBRO - ELECTRO CAMI*\n\n¡Muchas gracias ${firstName}! Confirmamos la recepción de tu pago.\n\n✅ *Monto Cobrado:* ${formattedAmount}\n📦 *Concepto:* ${concept}${
          installmentNumber ? `\n💳 *Cuota:* #${installmentNumber}${totalInstallments ? ` de ${totalInstallments}` : ""}` : ""
        }${paymentMethod ? `\n💵 *Medio de pago:* ${paymentMethod}` : ""}${
          formattedRemaining ? `\n📊 *Saldo Restante:* ${formattedRemaining}` : ""
        }\n\n¡Gracias por tu compromiso y confianza! 🙏`;

      default:
        return "";
    }
  };

  const finalMessage = customNotes ? `${getMessageContent()}\n\n💬 Nota: ${customNotes}` : getMessageContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPhone = (customerPhone || "").replace(/[^0-9]/g, "");
  const waUrl = generateWhatsAppLink(cleanPhone, finalMessage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar Mensaje por WhatsApp"
      description={`Contacto directo con ${customerName} (${customerPhone || "Sin teléfono registrado"})`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Selector de Plantillas */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Elegir tipo de mensaje:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setTemplate("recordatorio")}
              className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                template === "recordatorio"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Recordatorio</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("datos_pago")}
              className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                template === "datos_pago"
                  ? "bg-sky-500 text-white border-sky-500 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Datos Alias</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("mora")}
              className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                template === "mora"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Aviso Mora</span>
            </button>

            <button
              type="button"
              onClick={() => setTemplate("comprobante")}
              className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                template === "comprobante"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Comprobante</span>
            </button>
          </div>
        </div>

        {/* Vista previa tipo WhatsApp */}
        <div className="bg-[#EFEAE2] dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="font-bold flex items-center gap-1">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Vista previa del mensaje:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "¡Copiado!" : "Copiar texto"}
            </button>
          </div>

          <div className="bg-white dark:bg-[#1E293B] p-3.5 rounded-2xl rounded-tl-xs shadow-xs text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line border border-slate-200/80 dark:border-slate-700/80">
            {finalMessage}
          </div>
        </div>

        {/* Agregar nota adicional si lo desea */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Agregar comentario extra (opcional):
          </label>
          <input
            type="text"
            placeholder="Ej: Pasamos después de las 17 hs."
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
          />
        </div>

        {/* Footer con acciones */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer text-center"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar"}
            </button>

            {customerPhone ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Abrir WhatsApp</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-300 text-slate-500 text-xs font-bold cursor-not-allowed"
                title="El cliente no tiene teléfono cargado"
              >
                Sin WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
