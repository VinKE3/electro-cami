"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "./ui/modal";
import { formatCurrency } from "@/lib/utils";
import { getLiveDolarRates } from "@/actions/dolar";
import {
  Calculator,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  Percent,
  Calendar,
  Banknote,
  DollarSign,
} from "lucide-react";

interface QuotaCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuotaCalculatorModal({ isOpen, onClose }: QuotaCalculatorModalProps) {
  const [concept, setConcept] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [cashPrice, setCashPrice] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(20);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [installmentCount, setInstallmentCount] = useState<number>(6);
  const [frequency, setFrequency] = useState<"semanal" | "quincenal" | "mensual">("semanal");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Cotización DolarApi en vivo
  const [dolarRate, setDolarRate] = useState<{ compra: number; venta: number } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      getLiveDolarRates().then((res) => {
        if (res.success && res.blue) setDolarRate(res.blue);
      });
    }
  }, [isOpen]);

  // Cálculos en vivo
  const calculations = useMemo(() => {
    const base = Number(cashPrice) || 0;
    const interest = Number(interestRate) || 0;
    const initial = Number(downPayment) || 0;
    const count = Number(installmentCount) || 1;
    const cost = Number(costPrice) || 0;

    const totalFinanced = Math.round(base * (1 + interest / 100));
    const remainingToFinance = Math.max(0, totalFinanced - initial);
    const installmentValue = Math.round(remainingToFinance / count);
    const totalProfit = cost > 0 ? totalFinanced - cost : 0;

    return {
      totalFinanced,
      remainingToFinance,
      installmentValue,
      totalProfit,
    };
  }, [cashPrice, interestRate, downPayment, installmentCount, costPrice]);

  const proposalText = useMemo(() => {
    const prodName = concept.trim() || "el producto consultado";
    const initialText = downPayment > 0 ? `\n💰 *Entrega inicial / Seña:* ${formatCurrency(downPayment, currency)}` : "";
    return `👋 ¡Hola! Te comparto la simulación en cuotas para *${prodName}*:\n\n💵 *Precio Contado:* ${formatCurrency(cashPrice, currency)}${initialText}\n💳 *Financiación:* ${installmentCount} cuotas ${frequency}es de *${formatCurrency(calculations.installmentValue, currency)}*\n📊 *Total a devolver:* ${formatCurrency(calculations.totalFinanced, currency)}\n\n¿Querés coordinar la entrega o reservarlo? ¡Avisanos y te lo guardamos! 🙏`;
  }, [concept, cashPrice, downPayment, installmentCount, frequency, currency, calculations]);

  const handleCopyProposal = () => {
    navigator.clipboard.writeText(proposalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calculadora Rápida de Cuotas & Financiación"
      description="Simula cuotas en segundos y copia una propuesta lista para enviar al cliente por WhatsApp."
      maxWidth="3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* COLUMNA IZQUIERDA: INPUTS (7 COLS) */}
        <div className="md:col-span-7 space-y-3.5">
          {/* Moneda y Producto */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Concepto / Producto (opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: Smart TV 43, Colchón 2 Plazas..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Moneda:
              </label>
              <div className="flex p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrency("ARS")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currency === "ARS" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  ARS ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currency === "USD" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  USD (US$)
                </button>
              </div>
            </div>
          </div>

          {/* Banner cotización si es USD */}
          {currency === "USD" && dolarRate && (
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Dólar Blue hoy: ${dolarRate.venta}
              </span>
              <span>100 USD = {formatCurrency(100 * dolarRate.venta, "ARS")}</span>
            </div>
          )}

          {/* Precio Contado y Anticipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Precio Contado ({currency}) *
              </label>
              <input
                type="number"
                min="1"
                value={cashPrice || ""}
                onChange={(e) => setCashPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Entrega Inicial / Seña ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={downPayment || ""}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
              />
            </div>
          </div>

          {/* Interés Agregado */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Interés Agregado: <span className="text-emerald-600">{interestRate}%</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {[0, 15, 20, 25, 30, 40].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInterestRate(r)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    interestRate === r
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              max="200"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          {/* Cuotas y Frecuencia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Cuotas: <span className="text-blue-600">{installmentCount}</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[2, 4, 6, 8, 10, 12, 16].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setInstallmentCount(c)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      installmentCount === c
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="52"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Frecuencia
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["semanal", "quincenal", "mensual"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer ${
                      frequency === f
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Costo opcional para calcular ganancia */}
              <div className="mt-2">
                <label className="text-[10px] text-slate-500 font-medium">Costo de compra (opcional):</label>
                <input
                  type="number"
                  min="0"
                  value={costPrice || ""}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  placeholder="0 (para ver ganancia)"
                  className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESULTADO EN VIVO & COPIAR (5 COLS) */}
        <div className="md:col-span-5 space-y-3.5">
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3.5">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
              Resultado de Financiación
            </span>

            {/* Valor de la Cuota */}
            <div className="bg-blue-600/20 border border-blue-500/40 p-3.5 rounded-xl text-center">
              <span className="text-[11px] text-blue-300 font-bold uppercase tracking-wider block">
                Cada Cuota ({frequency})
              </span>
              <span className="text-3xl font-black text-blue-400 block mt-0.5">
                {formatCurrency(calculations.installmentValue, currency)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {installmentCount} cuotas {frequency}es
              </span>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total con Interés</span>
                <span className="font-extrabold text-white">
                  {formatCurrency(calculations.totalFinanced, currency)}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Saldo a Financiar</span>
                <span className="font-extrabold text-white">
                  {formatCurrency(calculations.remainingToFinance, currency)}
                </span>
              </div>
            </div>

            {calculations.totalProfit > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-center text-xs">
                <span className="text-[10px] text-emerald-400 block">Ganancia Neta Estimada:</span>
                <span className="text-sm font-black text-emerald-300">
                  +{formatCurrency(calculations.totalProfit, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Botón para Copiar Propuesta de WhatsApp */}
          <button
            type="button"
            onClick={handleCopyProposal}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "¡Propuesta Copiada!" : "Copiar Plan para WhatsApp"}</span>
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            Pega el texto copiado directamente en WhatsApp para responderle al cliente.
          </p>
        </div>
      </div>
    </Modal>
  );
}
