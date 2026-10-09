"use client";

import React, { useState } from "react";
import { Modal } from "./ui/modal";
import { WhatsAppModal } from "./whatsapp-modal";
import { registerPayment } from "@/actions/credits";
import { getLiveDolarRates } from "@/actions/dolar";
import { formatCurrency, generateWhatsAppLink } from "@/lib/utils";
import { CheckCircle2, MessageSquare, Banknote, CreditCard, ArrowRight, Sparkles, RefreshCw } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditId: number;
  customerName: string;
  customerPhone?: string | null;
  concept: string;
  currency?: "ARS" | "USD";
  suggestedAmount: number;
  remainingAmount: number;
  installmentId?: number | null;
  installmentNumber?: number | null;
  onSuccess?: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  creditId,
  customerName,
  customerPhone,
  concept,
  currency = "ARS",
  suggestedAmount,
  remainingAmount,
  installmentId,
  installmentNumber,
  onSuccess,
}: PaymentModalProps) {
  const isUSD = currency === "USD";
  const [amount, setAmount] = useState(suggestedAmount > 0 ? suggestedAmount : remainingAmount);
  const [payModeUSD, setPayModeUSD] = useState<"USD" | "ARS">("USD");
  const [exchangeRate, setExchangeRate] = useState<number>(1540);
  const [dolarRate, setDolarRate] = useState<{ compra: number; venta: number } | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [method, setMethod] = useState<"efectivo" | "mercado_pago" | "transferencia">("efectivo");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Cargar cotización en vivo desde DolarApi cuando se abre para crédito en USD
  const fetchLiveRate = React.useCallback(async () => {
    setLoadingRate(true);
    try {
      const res = await getLiveDolarRates();
      if (res.success && res.blue) {
        setDolarRate(res.blue);
        setExchangeRate(res.blue.venta);
      }
    } catch (err) {
      console.warn("Error loading dollar rate:", err);
    } finally {
      setLoadingRate(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setAmount(suggestedAmount > 0 ? suggestedAmount : remainingAmount);
      setReceiptData(null);
      setNotes("");
      setPayModeUSD("USD");
      if (isUSD) {
        fetchLiveRate();
      }
    }
  }, [isOpen, suggestedAmount, remainingAmount, isUSD, fetchLiveRate]);

  const amountInPesos = Math.round(Number(amount) * (Number(exchangeRate) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setLoading(true);
    try {
      const isPayingInPesos = isUSD && payModeUSD === "ARS";
      const res = await registerPayment({
        creditId,
        installmentId: installmentId || null,
        amount: Number(amount),
        paymentMethod: isUSD && payModeUSD === "USD" ? "efectivo" : method,
        notes,
        payInCurrency: isPayingInPesos ? "ARS" : isUSD ? "USD" : "ARS",
        exchangeRate: isPayingInPesos ? Number(exchangeRate) : undefined,
        amountInArs: isPayingInPesos ? amountInPesos : undefined,
      });

      if (res.success && res.data) {
        setReceiptData(res.data);
        if (onSuccess) onSuccess();
      } else {
        alert(res.error || "Ocurrió un error al registrar el pago.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReceiptData(null);
    onClose();
  };

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={receiptData ? "¡Pago Registrado con Éxito!" : "Registrar Pago / Cobranza"}
      description={
        receiptData
          ? "El pago ha sido acreditado en la caja y descontado de la deuda."
          : `Cliente: ${customerName} • ${concept}`
      }
      maxWidth="md"
    >
      {receiptData ? (
        <div className="space-y-5 text-center py-2 animate-fade-in">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-[#1E293B] dark:text-[#F8FAFC]">
              {formatCurrency(receiptData.amount, receiptData.currency)}
            </h4>
            {receiptData.currency === "USD" && receiptData.amountInArs ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                Abonado en Pesos: {formatCurrency(receiptData.amountInArs, "ARS")} (Cambio: ${receiptData.exchangeRate})
              </p>
            ) : null}
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 uppercase font-semibold tracking-wider">
              Caja Destino:{" "}
              {receiptData.currency === "USD" && !receiptData.amountInArs
                ? "Caja Dólares Físicos (USD)"
                : receiptData.paymentMethod === "efectivo"
                ? "Caja Pesos Efectivo"
                : "Mercado Pago (Pesos)"}
            </p>
          </div>

          <div className="bg-[#F4F6F9] dark:bg-[#0F172A] p-4 rounded-xl text-left border border-[#E5E7EB] dark:border-[#334155] text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Nuevo Saldo Pendiente:</span>
              <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                {formatCurrency(receiptData.newRemaining, receiptData.currency)}
              </span>
            </div>
            {receiptData.isCompleted && (
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 p-2 rounded text-center mt-2 border border-blue-200 dark:border-blue-800">
                🎉 ¡Este crédito ha quedado totalmente cancelado!
              </p>
            )}
          </div>

          {/* Botón para enviar comprobante por WhatsApp */}
          {customerPhone ? (
            <div className="space-y-2">
              <a
                href={generateWhatsAppLink(
                  customerPhone,
                  receiptData.currency === "USD" && receiptData.amountInArs
                    ? `¡Hola ${receiptData.customerName}! Te confirmamos el cobro de ${formatCurrency(
                        receiptData.amount,
                        "USD"
                      )} abonados en pesos (${formatCurrency(
                        receiptData.amountInArs,
                        "ARS"
                      )} al cambio $${receiptData.exchangeRate}) por "${receiptData.concept}".\n\nTu saldo restante actual es de: ${formatCurrency(
                        receiptData.newRemaining,
                        "USD"
                      )}.\n\n¡Muchas gracias por tu pago! 🤝`
                    : `¡Hola ${receiptData.customerName}! Te confirmamos el cobro de ${formatCurrency(
                        receiptData.amount,
                        receiptData.currency
                      )} por "${receiptData.concept}" mediante ${
                        receiptData.paymentMethod === "efectivo" ? "Efectivo" : "Mercado Pago"
                      }.\n\nTu saldo restante actual es de: ${formatCurrency(
                        receiptData.newRemaining,
                        receiptData.currency
                      )}.\n\n¡Muchas gracias por tu pago! 🤝`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar Comprobante por WhatsApp
              </a>

              <button
                type="button"
                onClick={() => setIsWhatsAppOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer"
              >
                Personalizar texto o nota del comprobante
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8]">
              (El cliente no tiene teléfono de WhatsApp registrado)
            </p>
          )}

          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] text-xs font-semibold transition cursor-pointer"
          >
            Listo, volver al panel
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info resumen */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {installmentNumber ? `Cuota #${installmentNumber}` : "Saldo Pendiente"}
              </span>
              <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">
                {concept}
              </p>
            </div>
            <div className="text-right">
              <span className="text-blue-700 dark:text-blue-300">Deuda Restante</span>
              <p className="font-bold text-blue-900 dark:text-blue-100 text-sm">
                {formatCurrency(remainingAmount, currency)}
              </p>
            </div>
          </div>

          {/* Si el crédito es en USD, opción de pagar en Dólares Billete o Pesos al Cambio */}
          {isUSD && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Moneda de Cobro del Cliente:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayModeUSD("USD")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    payModeUSD === "USD"
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  💵 Dólares Billete
                </button>
                <button
                  type="button"
                  onClick={() => setPayModeUSD("ARS")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    payModeUSD === "ARS"
                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  🇦🇷 Pesos al Cambio
                </button>
              </div>

              {payModeUSD === "ARS" && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2.5 animate-fade-in">
                  {/* Banner DolarApi en Vivo */}
                  <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>Dólar Blue hoy (DolarApi):</span>
                      {dolarRate && (
                        <span className="text-slate-800 dark:text-slate-200 font-black">
                          ${dolarRate.venta}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {dolarRate && exchangeRate !== dolarRate.venta && (
                        <button
                          type="button"
                          onClick={() => setExchangeRate(dolarRate.venta)}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Usar ${dolarRate.venta}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={fetchLiveRate}
                        disabled={loadingRate}
                        className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                        title="Actualizar cotización desde la API"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingRate ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Input de Cotización Editable */}
                  <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Cotización Dólar a aplicar ($):
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Cargada automáticamente. Puedes modificarla si acordaste otro valor.
                      </span>
                    </div>
                    <div className="relative w-36 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(Number(e.target.value))}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg border-2 border-blue-400 dark:border-blue-500/80 bg-slate-50 dark:bg-slate-900 text-sm font-black text-blue-700 dark:text-blue-300"
                      />
                    </div>
                  </div>

                  {/* Cálculo en Pesos */}
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl border border-blue-200 dark:border-blue-900 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-blue-700 dark:text-blue-300 font-bold block">
                        Total a recibir en Pesos:
                      </span>
                      <span className="text-[10px] text-slate-500">
                        US$ {amount} × ${exchangeRate} (Cotización)
                      </span>
                    </div>
                    <span className="text-base font-black text-blue-900 dark:text-blue-100">
                      {formatCurrency(amountInPesos, "ARS")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monto a Cobrar */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Monto a descontar ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-xs">
                {currency === "USD" ? "US$" : "$"}
              </span>
              <input
                type="number"
                min="1"
                max={remainingAmount}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className={`w-full ${currency === "USD" ? "pl-11" : "pl-8"} pr-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] font-bold text-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            {suggestedAmount > 0 && suggestedAmount !== remainingAmount && (
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setAmount(suggestedAmount)}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Cobrar cuota justa ({formatCurrency(suggestedAmount, currency)})
                </button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setAmount(remainingAmount)}
                  className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] hover:underline cursor-pointer"
                >
                  Liquidar todo ({formatCurrency(remainingAmount, currency)})
                </button>
              </div>
            )}
          </div>

          {/* Método de Pago (si es Pesos o USD al cambio) */}
          {(!isUSD || payModeUSD === "ARS") && (
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                ¿Cómo te pagó el cliente?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("efectivo")}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    method === "efectivo"
                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                      : "bg-[#F4F6F9] dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#1E293B] dark:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#283548]"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Efectivo en mano
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("mercado_pago")}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    method === "mercado_pago"
                      ? "bg-sky-500 border-sky-500 text-white shadow-xs"
                      : "bg-[#F4F6F9] dark:bg-[#0F172A] border-[#E5E7EB] dark:border-[#334155] text-[#1E293B] dark:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#283548]"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Mercado Pago / Transf.
                </button>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
              Nota u observación (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Pago adelantado, billetes chicos, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-6 sm:mt-8 px-4 sm:px-6 py-4 sm:py-5 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xs flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#334155] z-20">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Procesando..." : "Confirmar Cobro"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </Modal>

    {receiptData && (
      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        customerName={receiptData.customerName || customerName}
        customerPhone={customerPhone}
        concept={receiptData.concept || concept}
        amount={receiptData.amount}
        installmentNumber={installmentNumber}
        currency={receiptData.currency || currency}
        remainingAmount={receiptData.newRemaining}
        paymentMethod={receiptData.paymentMethod === "efectivo" ? "Efectivo" : "Mercado Pago"}
        defaultType="comprobante"
      />
    )}
  </>
  );
}
