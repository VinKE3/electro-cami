"use client";

import React, { useState } from "react";
import {
  formatCurrency,
  formatDate,
  generateWhatsAppLink,
  getInstallmentStatus,
  getArgentinaTodayStr,
} from "@/lib/utils";
import { PaymentModal } from "./payment-modal";
import { WhatsAppModal } from "./whatsapp-modal";
import { NewCreditModal } from "./new-credit-modal";
import { Pagination } from "./ui/pagination";
import {
  CreditCard,
  Plus,
  Search,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CreditsViewProps {
  initialCredits: any[];
  customers: any[];
  products: any[];
}

export function CreditsView({
  initialCredits,
  customers,
  products,
}: CreditsViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("activo");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedCreditId, setExpandedCreditId] = useState<number | null>(null);
  const [isNewCreditOpen, setIsNewCreditOpen] = useState(false);

  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    creditId: number;
    customerName: string;
    customerPhone?: string | null;
    concept: string;
    currency?: "ARS" | "USD";
    suggestedAmount: number;
    remainingAmount: number;
    installmentId?: number | null;
    installmentNumber?: number | null;
  }>({
    isOpen: false,
    creditId: 0,
    customerName: "",
    concept: "",
    currency: "ARS",
    suggestedAmount: 0,
    remainingAmount: 0,
  });

  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone?: string | null;
    concept: string;
    amount: number;
    installmentNumber?: number | null;
    totalInstallments?: number | null;
    dueDate?: string | null;
    currency?: string;
    remainingAmount?: number;
    defaultType?: "recordatorio" | "datos_pago" | "mora" | "comprobante";
  }>({
    isOpen: false,
    customerName: "",
    concept: "",
    amount: 0,
  });

  const customerMap = React.useMemo(() => {
    return new Map(customers.map((c: any) => [c.id, c]));
  }, [customers]);

  const openWhatsAppModal = (cred: any, inst?: any) => {
    const cust = cred.customer;
    const credCurrency = cred.currency || "ARS";
    const remainingDebt = parseFloat(cred.remainingAmount || "0");
    let amount = parseFloat(cred.installmentAmount || "0");
    let instNum = null;
    let dueDate = null;
    let defaultType: "recordatorio" | "datos_pago" | "mora" | "comprobante" = "recordatorio";

    if (inst) {
      instNum = inst.installmentNumber;
      dueDate = inst.dueDate;
      const due = parseFloat(inst.amount) - parseFloat(inst.paidAmount || "0");
      amount = due > 0 ? due : parseFloat(inst.amount);
      const todayStr = getArgentinaTodayStr();
      if (inst.dueDate < todayStr && inst.status !== "pagada") {
        defaultType = "mora";
      }
    }

    setWhatsAppModalState({
      isOpen: true,
      customerName: `${cust.name} ${cust.lastName || ""}`.trim(),
      customerPhone: cust.phone,
      concept: cred.concept,
      amount,
      installmentNumber: instNum,
      totalInstallments: cred.installmentCount,
      dueDate,
      currency: credCurrency,
      remainingAmount: remainingDebt,
      defaultType,
    });
  };

  const filteredCredits = initialCredits.filter((cred) => {
    const matchesStatus =
      filterStatus === "todos" ? true : cred.status === filterStatus;
    const custFullName = `${cred.customer.name} ${cred.customer.lastName || ""}`.toLowerCase();
    const conceptLower = cred.concept.toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !q || custFullName.includes(q) || conceptLower.includes(q);
    return matchesStatus && matchesSearch;
  });

  const paginatedCredits = filteredCredits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const openPaymentModal = (cred: any, inst?: any) => {
    const cust = cred.customer;
    let suggested = parseFloat(cred.installmentAmount || "0");
    let instId = null;
    let instNum = null;

    if (inst) {
      instId = inst.id;
      instNum = inst.installmentNumber;
      const due = parseFloat(inst.amount) - parseFloat(inst.paidAmount || "0");
      suggested = due > 0 ? due : parseFloat(inst.amount);
    }

    setPaymentModalState({
      isOpen: true,
      creditId: cred.id,
      customerName: `${cust.name} ${cust.lastName || ""}`.trim(),
      customerPhone: cust.phone,
      concept: cred.concept,
      currency: cred.currency || "ARS",
      suggestedAmount: suggested,
      remainingAmount: parseFloat(cred.remainingAmount || "0"),
      installmentId: instId,
      installmentNumber: instNum,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Ventas en Cuotas & Créditos
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Seguimiento de financiamientos, cuotas cobradas y saldos restantes.
          </p>
        </div>

        <button
          onClick={() => setIsNewCreditOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Nueva Venta en Cuotas
        </button>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por comprador o producto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        <div className="flex gap-1.5 bg-[#E5E7EB]/60 dark:bg-[#0F172A] p-1 rounded-xl self-start border border-[#E5E7EB] dark:border-[#334155]">
          {[
            { id: "activo", label: "Activos" },
            { id: "finalizado", label: "Finalizados" },
            { id: "todos", label: "Todos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterStatus(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] shadow-xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTADO DE CRÉDITOS */}
      <div className="space-y-3.5">
        {filteredCredits.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-12 text-center border border-[#E5E7EB] dark:border-[#334155] text-[#94A3B8]">
            <CreditCard className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="font-semibold text-sm text-[#1E293B] dark:text-[#F8FAFC]">No se encontraron créditos registrados</p>
            <p className="text-xs">Crea una nueva venta en cuotas para comenzar.</p>
          </div>
        ) : (
          paginatedCredits.map((cred) => {
            const cust = cred.customer;
            const customerData = customerMap.get(cust.id);
            const custScore = customerData?.score;
            const total = parseFloat(cred.totalAmount);
            const remaining = parseFloat(cred.remainingAmount);
            const paid = total - remaining;
            const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            const isExpanded = expandedCreditId === cred.id;

            const paidInstCount = cred.installments.filter(
              (i: any) => i.status === "pagada"
            ).length;

            return (
              <div
                key={cred.id}
                className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden shadow-xs hover:border-blue-400/40 transition"
              >
                {/* Header Card */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-[#1E293B] dark:text-[#F8FAFC] text-base">
                        {cust.name} {cust.lastName || ""}
                      </span>

                      {/* Semáforo de Confianza */}
                      {custScore === "moroso" ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          🔴 Moroso
                        </span>
                      ) : custScore === "confiable" ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          🟢 Confiable
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          🟡 Regular
                        </span>
                      )}

                      {cust.phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsAppModal(cred)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition"
                          title="Escribir por WhatsApp con opciones"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          cred.status === "activo"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-slate-100 text-slate-600 dark:bg-[#0F172A] dark:text-slate-400"
                        }`}
                      >
                        {cred.status}
                      </span>

                      {cred.currency === "USD" && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          🇺🇸 Dólares (USD)
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                      {cred.concept}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      <span>Inicio: {formatDate(cred.startDate)}</span>
                      <span>•</span>
                      <span>
                        Plan: {cred.installmentCount} cuotas {cred.frequency}es de{" "}
                        {formatCurrency(cred.installmentAmount, cred.currency || "ARS")}
                      </span>
                      <span>•</span>
                      <span>Interés: {cred.interestRate}%</span>
                    </div>
                  </div>

                  {/* Resumen Deuda & Progreso */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#E5E7EB] dark:border-[#334155]">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] block">
                        Saldo Pendiente
                      </span>
                      <span className="text-lg font-black text-[#1E293B] dark:text-[#F8FAFC]">
                        {formatCurrency(remaining, cred.currency || "ARS")}
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">
                        de {formatCurrency(total, cred.currency || "ARS")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {cred.status === "activo" && (
                        <button
                          onClick={() => openPaymentModal(cred)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          Cobrar
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setExpandedCreditId(isExpanded ? null : cred.id)
                        }
                        className="p-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <span className="text-[11px]">
                          {paidInstCount}/{cred.installmentCount}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-[#E5E7EB] dark:bg-[#0F172A] h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* DETALLE DESPLEGABLE DE CUOTAS */}
                {isExpanded && (
                  <div className="bg-[#F4F6F9] dark:bg-[#0F172A] p-4 sm:p-5 border-t border-[#E5E7EB] dark:border-[#334155] animate-fade-in space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] uppercase tracking-wider">
                        Calendario de Cuotas
                      </h4>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        Progreso: {progressPercent}% pagado
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {cred.installments.map((inst: any) => {
                        const isPaid = inst.status === "pagada";
                        const instStatus = getInstallmentStatus(
                          inst.dueDate,
                          isPaid,
                          getArgentinaTodayStr()
                        );

                        return (
                          <div
                            key={inst.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-2 transition ${
                              instStatus === "pagada"
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                                : instStatus === "vencida"
                                ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                                : instStatus === "hoy"
                                ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                                : "bg-white dark:bg-[#1E293B] border-[#E5E7EB] dark:border-[#334155]"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-[#1E293B] dark:text-[#F8FAFC]">
                                  Cuota #{inst.installmentNumber}
                                </span>
                                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                                  Vence: {formatDate(inst.dueDate)}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  instStatus === "pagada"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                                    : instStatus === "vencida"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                                    : instStatus === "hoy"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                    : "bg-slate-100 text-slate-600 dark:bg-[#0F172A] dark:text-slate-400"
                                }`}
                              >
                                {instStatus === "pagada"
                                  ? "Pagada"
                                  : instStatus === "vencida"
                                  ? "Vencida"
                                  : instStatus === "hoy"
                                  ? "Vence Hoy"
                                  : "Pendiente"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#334155]">
                              <span className="font-black text-[#1E293B] dark:text-[#F8FAFC]">
                                {formatCurrency(inst.amount, cred.currency || "ARS")}
                              </span>
                              {!isPaid && (
                                <div className="flex items-center gap-1.5">
                                  {cust.phone && (
                                    <button
                                      type="button"
                                      onClick={() => openWhatsAppModal(cred, inst)}
                                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition"
                                      title="Avisar esta cuota por WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openPaymentModal(cred, inst)}
                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    Cobrar esta
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Historial de Pagos Registrados */}
                    {cred.payments && cred.payments.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-2">
                          Historial de Pagos Realizados
                        </span>
                        <div className="space-y-1.5">
                          {cred.payments.map((p: any) => (
                            <div
                              key={p.id}
                              className="text-xs bg-white dark:bg-[#1E293B] p-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] flex justify-between items-center text-[#1E293B] dark:text-[#F8FAFC]"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                <span>
                                  Abonó {formatCurrency(p.amount, p.currency || cred.currency || "ARS")} vía{" "}
                                  <strong className="capitalize">{p.paymentMethod}</strong>
                                </span>
                              </div>
                              <span className="text-[#64748B] dark:text-[#94A3B8] text-[10px]">
                                {formatDate(p.paymentDate)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredCredits.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 15, 25]}
        itemLabel="ventas / créditos"
      />

      {/* MODALES */}
      <NewCreditModal
        isOpen={isNewCreditOpen}
        onClose={() => setIsNewCreditOpen(false)}
        customers={customers}
        products={products}
      />

      <PaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() =>
          setPaymentModalState((prev) => ({ ...prev, isOpen: false }))
        }
        creditId={paymentModalState.creditId}
        customerName={paymentModalState.customerName}
        customerPhone={paymentModalState.customerPhone}
        concept={paymentModalState.concept}
        currency={paymentModalState.currency}
        suggestedAmount={paymentModalState.suggestedAmount}
        remainingAmount={paymentModalState.remainingAmount}
        installmentId={paymentModalState.installmentId}
        installmentNumber={paymentModalState.installmentNumber}
      />

      <WhatsAppModal
        isOpen={whatsAppModalState.isOpen}
        onClose={() => setWhatsAppModalState((prev) => ({ ...prev, isOpen: false }))}
        customerName={whatsAppModalState.customerName}
        customerPhone={whatsAppModalState.customerPhone}
        concept={whatsAppModalState.concept}
        amount={whatsAppModalState.amount}
        installmentNumber={whatsAppModalState.installmentNumber}
        totalInstallments={whatsAppModalState.totalInstallments}
        dueDate={whatsAppModalState.dueDate}
        currency={whatsAppModalState.currency}
        remainingAmount={whatsAppModalState.remainingAmount}
        defaultType={whatsAppModalState.defaultType}
      />
    </div>
  );
}
