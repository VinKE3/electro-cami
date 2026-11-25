"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "./ui/modal";
import { getCustomerById } from "@/actions/customers";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  generateWhatsAppLink,
  getArgentinaTodayStr,
  getInstallmentStatus,
} from "@/lib/utils";
import {
  MessageCircle,
  MapPin,
  CreditCard,
  Receipt,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerSummary: any | null;
}

export function CustomerHistoryModal({
  isOpen,
  onClose,
  customerSummary,
}: CustomerHistoryModalProps) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"creditos" | "pagos">("creditos");
  const [expandedCreditId, setExpandedCreditId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !customerSummary?.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab("creditos");
    setExpandedCreditId(null);

    getCustomerById(customerSummary.id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setDetail(res.data);
          const firstActive = res.data.credits?.find((c: any) => c.status === "activo");
          if (firstActive) {
            setExpandedCreditId(firstActive.id);
          } else if (res.data.credits?.length > 0) {
            setExpandedCreditId(res.data.credits[0].id);
          }
        } else {
          setError(res.error || "No se pudo cargar el historial del cliente.");
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || "Error al cargar el historial.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, customerSummary?.id]);

  const creditsList: any[] = detail?.credits ?? [];

  const summaryStats = useMemo(() => {
    let pendingArs = 0;
    let pendingUsd = 0;
    let boughtArs = 0;
    let boughtUsd = 0;
    let paidArs = 0;
    let paidUsd = 0;
    let activeCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (const cr of creditsList) {
      if (cr.status === "cancelado") {
        cancelledCount++;
        continue;
      }
      if (cr.status === "activo") activeCount++;
      else if (cr.status === "finalizado") completedCount++;

      const isUsd = cr.currency === "USD";
      const total = parseFloat(cr.totalAmount || "0");
      const remaining = cr.status === "activo" ? parseFloat(cr.remainingAmount || "0") : 0;

      if (isUsd) {
        boughtUsd += total;
        pendingUsd += remaining;
      } else {
        boughtArs += total;
        pendingArs += remaining;
      }

      for (const p of cr.payments ?? []) {
        const pAmt = parseFloat(p.amount || "0");
        const pCurr = p.currency || cr.currency || "ARS";
        if (pCurr === "USD") paidUsd += pAmt;
        else paidArs += pAmt;
      }
    }

    return {
      pendingArs,
      pendingUsd,
      boughtArs,
      boughtUsd,
      paidArs,
      paidUsd,
      activeCount,
      completedCount,
      cancelledCount,
    };
  }, [creditsList]);

  const allPayments = useMemo(() => {
    const flat: any[] = [];
    for (const cr of creditsList) {
      for (const p of cr.payments ?? []) {
        flat.push({
          ...p,
          creditConcept: cr.concept,
          creditStatus: cr.status,
          creditCurrency: cr.currency || "ARS",
        });
      }
    }
    return flat.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  }, [creditsList]);

  const displayCustomer = detail || customerSummary;
  const fullName = displayCustomer
    ? `${displayCustomer.name} ${displayCustomer.lastName || ""}`.trim()
    : "Cliente";
  const todayStr = getArgentinaTodayStr();

  const renderDualCurrency = (ars: number, usd: number, arsClass = "") => {
    if (ars > 0 && usd > 0) {
      return (
        <div className="space-y-0.5">
          <span className={`block font-black ${arsClass}`}>
            {formatCurrency(ars, "ARS")}
          </span>
          <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
            + {formatCurrency(usd, "USD")}
          </span>
        </div>
      );
    }
    if (usd > 0) {
      return (
        <span className="font-black text-emerald-600 dark:text-emerald-400">
          {formatCurrency(usd, "USD")}
        </span>
      );
    }
    return (
      <span className={`font-black ${arsClass}`}>
        {formatCurrency(ars, "ARS")}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de ${fullName}`}
      description="Detalle completo de créditos, cuotas y pagos registrados."
      maxWidth="3xl"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#64748B] dark:text-[#94A3B8]">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-xs font-semibold">Cargando historial completo...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Datos rápidos del cliente */}
          {displayCustomer && (
            <div className="p-3.5 rounded-2xl bg-[#F4F6F9] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {customerSummary?.score === "moroso" ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      🔴 Moroso ({customerSummary.overdueCount}{" "}
                      {customerSummary.overdueCount === 1 ? "vencida" : "vencidas"})
                    </span>
                  ) : customerSummary?.score === "confiable" ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      🟢 Confiable
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      🟡 Al día / Nuevo
                    </span>
                  )}

                  {displayCustomer.phone && (
                    <span className="font-mono font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                      {displayCustomer.phone}
                    </span>
                  )}
                </div>

                {displayCustomer.address && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{displayCustomer.address}</span>
                  </p>
                )}

                {displayCustomer.notes && (
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    📝 {displayCustomer.notes}
                  </p>
                )}
              </div>

              {displayCustomer.phone && (
                <a
                  href={generateWhatsAppLink(
                    displayCustomer.phone,
                    `Hola ${displayCustomer.name}! Te escribo de Electro Cami.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chatear por WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Tarjetas Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
              <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block mb-1">
                Saldo Pendiente
              </span>
              <div className="text-sm sm:text-base">
                {renderDualCurrency(
                  summaryStats.pendingArs,
                  summaryStats.pendingUsd,
                  summaryStats.pendingArs > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-blue-600 dark:text-blue-400"
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
              <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block mb-1">
                Total Comprado
              </span>
              <div className="text-sm sm:text-base text-[#1E293B] dark:text-[#F8FAFC]">
                {renderDualCurrency(summaryStats.boughtArs, summaryStats.boughtUsd)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
              <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block mb-1">
                Total Abonado
              </span>
              <div className="text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                {renderDualCurrency(summaryStats.paidArs, summaryStats.paidUsd)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
              <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block mb-1">
                Créditos
              </span>
              <p className="text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                {summaryStats.activeCount} activos • {summaryStats.completedCount} fin.
              </p>
              {summaryStats.cancelledCount > 0 && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                  {summaryStats.cancelledCount} cancelados
                </p>
              )}
            </div>
          </div>

          {/* Pestañas internas */}
          <div className="flex items-center gap-1.5 bg-[#F4F6F9] dark:bg-[#0F172A] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#334155] w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("creditos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "creditos"
                  ? "bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] shadow-xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Créditos y Cuotas ({creditsList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pagos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "pagos"
                  ? "bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] shadow-xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Historial de Pagos ({allPayments.length})
            </button>
          </div>

          {/* Contenido Pestaña 1: Créditos y Cuotas */}
          {activeTab === "creditos" ? (
            creditsList.length === 0 ? (
              <div className="py-10 text-center text-[#94A3B8] border border-dashed border-[#E5E7EB] dark:border-[#334155] rounded-2xl">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                  Este cliente aún no tiene créditos registrados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {creditsList.map((cred) => {
                  const credCurr = cred.currency || "ARS";
                  const total = parseFloat(cred.totalAmount || "0");
                  const remaining = parseFloat(cred.remainingAmount || "0");
                  const paid = Math.max(0, total - remaining);
                  const progress =
                    cred.status === "cancelado"
                      ? 0
                      : total > 0
                        ? Math.min(100, Math.round((paid / total) * 100))
                        : 0;
                  const isExpanded = expandedCreditId === cred.id;

                  return (
                    <div
                      key={cred.id}
                      className="rounded-2xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCreditId(isExpanded ? null : cred.id)
                        }
                        className="w-full p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-[#F4F6F9]/60 dark:hover:bg-[#0F172A]/40 transition cursor-pointer"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#1E293B] dark:text-[#F8FAFC]">
                              {cred.concept}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                cred.status === "activo"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  : cred.status === "cancelado"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {cred.status}
                            </span>
                            {credCurr === "USD" && (
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                USD
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            Inicio: {formatDate(cred.startDate)} • {cred.installmentCount} cuotas{" "}
                            {cred.frequency === "dias"
                              ? `cada ${cred.frequencyDays || 7} días`
                              : `${cred.frequency}es`}{" "}
                            • Total: {formatCurrency(total, credCurr)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-[#94A3B8] block">
                              Saldo
                            </span>
                            <span className="text-sm font-black text-[#1E293B] dark:text-[#F8FAFC]">
                              {formatCurrency(remaining, credCurr)}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#64748B]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#64748B]" />
                          )}
                        </div>
                      </button>

                      <div className="w-full bg-[#E5E7EB] dark:bg-[#0F172A] h-1">
                        <div
                          className="bg-blue-500 h-1 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {isExpanded && (
                        <div className="p-3.5 sm:p-4 bg-[#F4F6F9] dark:bg-[#0F172A] border-t border-[#E5E7EB] dark:border-[#334155]">
                          {cred.installments && cred.installments.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] border-b border-[#E5E7EB] dark:border-[#334155]">
                                    <th className="py-1.5 pr-3">Cuota</th>
                                    <th className="py-1.5 px-3">Vencimiento</th>
                                    <th className="py-1.5 px-3 text-right">Monto</th>
                                    <th className="py-1.5 px-3 text-right">Pagado</th>
                                    <th className="py-1.5 pl-3 text-right">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                                  {cred.installments.map((inst: any) => {
                                    const isPaid = inst.status === "pagada";
                                    const st =
                                      cred.status === "cancelado"
                                        ? "cancelado"
                                        : getInstallmentStatus(inst.dueDate, isPaid, todayStr);

                                    return (
                                      <tr key={inst.id}>
                                        <td className="py-2 pr-3 font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                                          #{inst.installmentNumber}
                                        </td>
                                        <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                                          {formatDate(inst.dueDate)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                                          {formatCurrency(inst.amount, credCurr)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-[#64748B] dark:text-[#94A3B8]">
                                          {formatCurrency(inst.paidAmount || 0, credCurr)}
                                        </td>
                                        <td className="py-2 pl-3 text-right">
                                          <span
                                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                              st === "pagada"
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                                : st === "vencida"
                                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                                                  : st === "hoy"
                                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                                                    : "bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            }`}
                                          >
                                            {st === "pagada"
                                              ? "Pagada"
                                              : st === "vencida"
                                                ? "Vencida"
                                                : st === "hoy"
                                                  ? "Vence Hoy"
                                                  : st === "cancelado"
                                                    ? "Cancelado"
                                                    : inst.status === "parcial"
                                                      ? "Parcial"
                                                      : "Pendiente"}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                              Sin cuotas generadas.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : /* Contenido Pestaña 2: Historial Cronológico de Pagos */
          allPayments.length === 0 ? (
            <div className="py-10 text-center text-[#94A3B8] border border-dashed border-[#E5E7EB] dark:border-[#334155] rounded-2xl">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                No hay pagos registrados para este cliente todavía.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden bg-white dark:bg-[#1E293B]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F6F9] dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
                    <tr className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8]">
                      <th className="py-2.5 px-3.5">Fecha</th>
                      <th className="py-2.5 px-3.5">Crédito / Concepto</th>
                      <th className="py-2.5 px-3.5">Método</th>
                      <th className="py-2.5 px-3.5 text-right">Monto</th>
                      <th className="py-2.5 px-3.5">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                    {allPayments.map((p) => {
                      const pCurr = p.currency || p.creditCurrency || "ARS";
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-[#F4F6F9]/60 dark:hover:bg-[#0F172A]/40 transition"
                        >
                          <td className="py-2.5 px-3.5 whitespace-nowrap text-[#64748B] dark:text-[#94A3B8]">
                            {formatDateTime(p.paymentDate)}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{p.creditConcept}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 capitalize text-[#64748B] dark:text-[#94A3B8]">
                            {String(p.paymentMethod || "").replace("_", " ")}
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <span className="font-black text-[#1E293B] dark:text-[#F8FAFC] block">
                              {formatCurrency(p.amount, pCurr)}
                            </span>
                            {p.amountInArs && pCurr === "USD" && (
                              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">
                                ({formatCurrency(p.amountInArs, "ARS")} al cambio)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-[#64748B] dark:text-[#94A3B8]">
                            {p.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
