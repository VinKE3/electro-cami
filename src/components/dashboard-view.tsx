"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, generateWhatsAppLink } from "@/lib/utils";
import { PaymentModal } from "./payment-modal";
import { WhatsAppModal } from "./whatsapp-modal";
import { NewCreditModal } from "./new-credit-modal";
import { Pagination } from "./ui/pagination";
import {
  Banknote,
  CreditCard,
  AlertTriangle,
  Clock,
  TrendingUp,
  MessageCircle,
  Plus,
  ShieldAlert,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";

interface DashboardViewProps {
  overview: {
    activeCreditsCount: number;
    totalInTheStreet: number;
    cashInHand: number;
    mercadoPagoBalance: number;
    dolaresEfectivoTotal?: number;
    overdue: any[];
    dueToday: any[];
    upcomingThisWeek: any[];
  };
  customers: any[];
  products: any[];
}

export function DashboardView({
  overview,
  customers,
  products,
}: DashboardViewProps) {
  // Modal states
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

  const [activeTab, setActiveTab] = useState<"vencidas" | "hoy" | "semana">("vencidas");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const openWhatsAppForInstallment = (inst: any) => {
    const cust = inst.credit.customer;
    const dueAmount = parseFloat(inst.amount) - parseFloat(inst.paidAmount || "0");
    const remainingCreditDebt = parseFloat(inst.credit.remainingAmount || "0");
    const credCurrency = inst.credit?.currency || "ARS";

    setWhatsAppModalState({
      isOpen: true,
      customerName: `${cust.name} ${cust.lastName || ""}`.trim(),
      customerPhone: cust.phone,
      concept: inst.credit.concept,
      amount: dueAmount,
      installmentNumber: inst.installmentNumber,
      totalInstallments: inst.credit.installmentCount,
      dueDate: inst.dueDate,
      currency: credCurrency,
      remainingAmount: remainingCreditDebt,
      defaultType: activeTab === "vencidas" ? "mora" : "recordatorio",
    });
  };

  const openPaymentForInstallment = (inst: any) => {
    const cred = inst.credit;
    const cust = cred?.customer;
    const instAmount = parseFloat(inst.amount);
    const instPaid = parseFloat(inst.paidAmount || "0");
    const suggested = instAmount - instPaid;

    setPaymentModalState({
      isOpen: true,
      creditId: cred.id,
      customerName: `${cust.name} ${cust.lastName || ""}`.trim(),
      customerPhone: cust.phone,
      concept: cred.concept,
      currency: cred.currency || "ARS",
      suggestedAmount: suggested > 0 ? suggested : instAmount,
      remainingAmount: parseFloat(cred.remainingAmount || "0"),
      installmentId: inst.id,
      installmentNumber: inst.installmentNumber,
    });
  };

  const currentList =
    activeTab === "vencidas"
      ? overview.overdue
      : activeTab === "hoy"
        ? overview.dueToday
        : overview.upcomingThisWeek;

  const paginatedList = currentList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER PRINCIPAL CON BOTÓN DESTACADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold mb-2">
            Panel de Cobranzas • Electro Cami
          </span>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
            Gestión de Cuotas & Negocio
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            Revisa los cobros del día, envía recordatorios por WhatsApp y registra pagos en efectivo.
          </p>
        </div>

        <button
          onClick={() => setIsNewCreditOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nueva Venta en Cuotas
        </button>
      </div>

      {/* METRICAS FINANCIERAS CLAVE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total en la Calle */}
        <div className="bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold">Dinero pendiente</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            {formatCurrency(overview.totalInTheStreet)}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            {overview.activeCreditsCount} créditos activos por cobrar
          </p>
        </div>

        {/* Efectivo en Mano */}
        <div className="bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold">Efectivo en Mano</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(overview.cashInHand)}
          </div>
          {overview.dolaresEfectivoTotal && overview.dolaresEfectivoTotal > 0 ? (
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
              💵 + {formatCurrency(overview.dolaresEfectivoTotal, "USD")} billetes
            </div>
          ) : (
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
              Billetes físicos en caja
            </p>
          )}
          <Link
            href="/admin/caja"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 w-full"
          >
            Ajustar o ver caja &rarr;
          </Link>
        </div>

        {/* Mercado Pago */}
        <div className="bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold">Mercado Pago / Transf.</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">
            {formatCurrency(overview.mercadoPagoBalance)}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            Cobrado digitalmente
          </p>
          <Link
            href="/admin/caja"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 w-full"
          >
            Ajustar o ver caja &rarr;
          </Link>
        </div>

        {/* Alertas de Cobro (Vencidas) */}
        <div className="bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold">Cuotas Atrasadas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {overview.overdue.length} cuotas
          </div>
          <p className="text-[11px] text-rose-500/80 mt-1">
            Requieren aviso o cobranza
          </p>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL DE COBRANZAS: PESTAÑAS Y LISTADO */}
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden shadow-xs">
        {/* Barra de pestañas */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1E293B] dark:text-[#F8FAFC]">
              Centro de Cobranzas
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Personas que tienen cuotas por abonar. Presiona el botón verde para hablarles por WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F4F6F9] dark:bg-[#0F172A] p-1 rounded-xl text-xs font-bold border border-[#E5E7EB] dark:border-[#334155]">
            <button
              onClick={() => {
                setActiveTab("vencidas");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${activeTab === "vencidas"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
                }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Atrasadas ({overview.overdue.length})
            </button>

            <button
              onClick={() => {
                setActiveTab("hoy");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${activeTab === "hoy"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Vencen Hoy ({overview.dueToday.length})
            </button>

            <button
              onClick={() => {
                setActiveTab("semana");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${activeTab === "semana"
                  ? "bg-blue-600 dark:bg-blue-500 text-white shadow-xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
                }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Esta Semana ({overview.upcomingThisWeek.length})
            </button>
          </div>
        </div>

        {/* LISTADO DE CUOTAS */}
        <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
          {currentList.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] dark:text-[#94A3B8] space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto text-blue-500 opacity-60" />
              <p className="font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                ¡No hay cuotas en este estado!
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Todos tus clientes de este grupo están al día.
              </p>
            </div>
          ) : (
            paginatedList.map((inst: any) => {
              const cust = inst.credit.customer;
              const dueAmount = parseFloat(inst.amount) - parseFloat(inst.paidAmount || "0");
              const remainingCreditDebt = parseFloat(inst.credit.remainingAmount || "0");
              const credCurrency = inst.credit?.currency || "ARS";

              // Mensaje inteligente para WhatsApp
              const waMessage =
                activeTab === "vencidas"
                  ? `Hola ${cust.name}! Te escribo de Electro Cami para recordarte la cuota #${inst.installmentNumber} de ${formatCurrency(
                    dueAmount,
                    credCurrency
                  )} por "${inst.credit.concept}" que se encuentra vencida (${formatDate(
                    inst.dueDate
                  )}).\n\nSaldo restante: ${formatCurrency(
                    remainingCreditDebt,
                    credCurrency
                  )}.\n\n¿Pasás a abonar o preferís pagar por Mercado Pago/Transferencia? ¡Saludos!`
                  : activeTab === "hoy"
                    ? `Hola ${cust.name}! Te escribo de Electro Cami para avisarte que hoy vence tu cuota #${inst.installmentNumber} por ${formatCurrency(
                      dueAmount,
                      credCurrency
                    )} de "${inst.credit.concept}".\n\nQuedamos a tu disposición para recibir el pago en efectivo o Mercado Pago. ¡Que tengas un buen día!`
                    : `Hola ${cust.name}! Te escribo de Electro Cami para recordarte que el próximo ${formatDate(
                      inst.dueDate
                    )} vence tu cuota #${inst.installmentNumber} por ${formatCurrency(
                      dueAmount,
                      credCurrency
                    )} de "${inst.credit.concept}". ¡Que tengas un buen día!`;

              return (
                <div
                  key={inst.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F4F6F9]/60 dark:hover:bg-[#283548]/40 transition"
                >
                  {/* Datos del Cliente y Producto */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${activeTab === "vencidas"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          : activeTab === "hoy"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                    >
                      #{inst.installmentNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#1E293B] dark:text-[#F8FAFC] text-sm">
                          {cust.name} {cust.lastName || ""}
                        </h4>
                        {cust.phone && (
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                            {cust.phone}
                          </span>
                        )}
                        {credCurrency === "USD" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            USD
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium mt-0.5">
                        {inst.credit.concept}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                        <span>Vencimiento: {formatDate(inst.dueDate)}</span>
                        <span>•</span>
                        <span>Saldo crédito: {formatCurrency(remainingCreditDebt, credCurrency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Monto y Botones de Acción Inmediata */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E7EB] dark:border-[#334155]">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] block">
                        Monto Cuota
                      </span>
                      <span className="text-base sm:text-lg font-black text-[#1E293B] dark:text-[#F8FAFC]">
                        {formatCurrency(dueAmount, credCurrency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botón WhatsApp */}
                      {cust.phone ? (
                        <button
                          type="button"
                          onClick={() => openWhatsAppForInstallment(inst)}
                          title="Enviar aviso por WhatsApp"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                          <span className="hidden sm:inline">Avisar por</span> WhatsApp
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] italic">Sin tel.</span>
                      )}

                      {/* Botón Cobrar */}
                      <button
                        onClick={() => openPaymentForInstallment(inst)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Paginación */}
        <div className="px-4 sm:px-5 pb-4">
          <Pagination
            currentPage={currentPage}
            totalItems={currentList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 15, 25]}
            itemLabel="cuotas"
          />
        </div>
      </div>

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
