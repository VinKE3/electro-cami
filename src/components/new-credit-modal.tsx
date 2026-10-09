"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "./ui/modal";
import { createCredit } from "@/actions/credits";
import { createCustomer } from "@/actions/customers";
import { formatCurrency, getArgentinaTodayStr } from "@/lib/utils";
import { Calculator, Plus, Check, Calendar, UserPlus, AlertTriangle, AlertCircle } from "lucide-react";

interface CustomerOption {
  id: number;
  name: string;
  lastName: string | null;
  phone: string | null;
  score?: "confiable" | "moroso" | "regular";
  scoreLabel?: string;
  overdueCount?: number;
  totalDebt?: number;
}

interface ProductOption {
  id: number;
  name: string;
  category: string;
  costPrice: string;
  cashPrice: string;
  status: string;
  stock?: number;
  currency?: "ARS" | "USD";
}

interface NewCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerOption[];
  products: ProductOption[];
  onSuccess?: () => void;
}

export function NewCreditModal({
  isOpen,
  onClose,
  customers: initialCustomers,
  products,
  onSuccess,
}: NewCreditModalProps) {
  const [customersList, setCustomersList] = useState<CustomerOption[]>(initialCustomers);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustLastName, setNewCustLastName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [concept, setConcept] = useState("");
  const [costAmount, setCostAmount] = useState<number>(0);
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(20);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [downPaymentMethod, setDownPaymentMethod] = useState<"efectivo" | "mercado_pago">("efectivo");
  const [installmentCount, setInstallmentCount] = useState<number>(6);
  const [frequency, setFrequency] = useState<"semanal" | "quincenal" | "mensual" | "dias">("semanal");
  const [frequencyDays, setFrequencyDays] = useState<number>(7);
  const [startDate, setStartDate] = useState<string>(() => getArgentinaTodayStr());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync customers when prop updates
  React.useEffect(() => {
    setCustomersList(initialCustomers);
  }, [initialCustomers]);

  // When product is selected, auto-fill concept, cost, and cash price
  const handleProductSelect = (prodIdStr: string) => {
    setSelectedProductId(prodIdStr);
    if (!prodIdStr) return;
    const prod = products.find((p) => p.id.toString() === prodIdStr);
    if (prod) {
      setConcept(prod.name);
      setCostAmount(parseFloat(prod.costPrice || "0"));
      setBaseAmount(parseFloat(prod.cashPrice || "0"));
      if (prod.currency === "USD" || prod.currency === "ARS") {
        setCurrency(prod.currency);
      }
    }
  };

  // Quick Customer Creation
  const handleQuickCustomerCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const res = await createCustomer({
        name: newCustName.trim(),
        lastName: newCustLastName.trim() || undefined,
        phone: newCustPhone.trim() || undefined,
      });

      if (res.success && res.data) {
        const created = res.data;
        const formatted: CustomerOption = {
          id: created.id,
          name: created.name,
          lastName: created.lastName,
          phone: created.phone,
        };
        setCustomersList([formatted, ...customersList]);
        setSelectedCustomerId(created.id.toString());
        setIsCreatingCustomer(false);
        setNewCustName("");
        setNewCustLastName("");
        setNewCustPhone("");
      }
    } catch (err: any) {
      alert("Error al crear cliente: " + err.message);
    }
  };

  // Live calculations
  const calculations = useMemo(() => {
    const base = Number(baseAmount) || 0;
    const interest = Number(interestRate) || 0;
    const initial = Number(downPayment) || 0;
    const count = Number(installmentCount) || 1;
    const cost = Number(costAmount) || 0;

    const totalFinanced = Math.round(base * (1 + interest / 100));
    const remainingToFinance = Math.max(0, totalFinanced - initial);
    const installmentValue = Math.round(remainingToFinance / count);
    const totalRevenue = totalFinanced;
    const totalProfit = totalRevenue - cost;

    return {
      totalFinanced,
      remainingToFinance,
      installmentValue,
      totalProfit,
    };
  }, [baseAmount, interestRate, downPayment, installmentCount, costAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    if (!concept.trim()) {
      alert("Por favor indica el producto o concepto.");
      return;
    }
    if (baseAmount <= 0) {
      alert("El precio de venta debe ser mayor a 0.");
      return;
    }
    if (installmentCount <= 0) {
      alert("Debes indicar al menos 1 cuota.");
      return;
    }

    setLoading(true);
    try {
      const res = await createCredit({
        customerId: Number(selectedCustomerId),
        productId: selectedProductId ? Number(selectedProductId) : null,
        concept,
        currency,
        costAmount: Number(costAmount),
        baseAmount: Number(baseAmount),
        interestRate: Number(interestRate),
        downPayment: Number(downPayment),
        downPaymentMethod,
        installmentCount: Number(installmentCount),
        frequency,
        frequencyDays: frequency === "dias" ? Number(frequencyDays) : undefined,
        startDate,
        notes,
      });

      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        alert(res.error || "Error al crear el crédito");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id.toString() === selectedProductId);
  const selectedCustomer = customersList.find((c) => c.id.toString() === selectedCustomerId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Crédito / Venta en Cuotas"
      description="Calcula intereses, genera las cuotas semanales y registra la operación en un solo paso."
      maxWidth="6xl"
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* COLUMNA IZQUIERDA: CAMPOS DE CARGA (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. SELECCIÓN DE COMPRADOR */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                1. Comprador / Cliente *
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {isCreatingCustomer ? "Elegir de lista" : "+ Crear nuevo cliente"}
              </button>
            </div>

            {isCreatingCustomer ? (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nombre *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={newCustLastName}
                    onChange={(e) => setNewCustLastName(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="WhatsApp (ej: 1123456789)"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCustomerCreate}
                    disabled={!newCustName.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar cliente registrado --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.score === "moroso" ? "🔴 " : c.score === "confiable" ? "🟢 " : "🟡 "}
                      {c.name} {c.lastName || ""} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>

                {/* Semáforo de Riesgo / Confianza del Cliente */}
                {selectedCustomer && (
                  <div className="mt-2.5">
                    {selectedCustomer.score === "moroso" ? (
                      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 p-2.5 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold block">⚠️ ATENCIÓN: Cliente con cuotas vencidas</span>
                          <span>Este cliente registra cuotas atrasadas impagas. Verifica con cuidado antes de autorizar una nueva financiación.</span>
                        </div>
                      </div>
                    ) : selectedCustomer.score === "confiable" ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-2.5 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold">🟢 Cliente Confiable: Buen historial de pagos y cumplimiento.</span>
                      </div>
                    ) : (
                      <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-2 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <span>🟡 Cliente sin antecedentes de mora o nuevo comprador.</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 2. PRODUCTO, STOCK Y MONEDA */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                2. Producto, Stock & Moneda
              </label>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrency("ARS")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    currency === "ARS"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  🇦🇷 Pesos ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    currency === "USD"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  🇺🇸 Dólares (US$)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Seleccionar del Inventario
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                >
                  <option value="">-- Cargar manualmente o elegir producto --</option>
                  {products.map((p) => {
                    const stockNum = p.stock ?? 1;
                    const isAgotado = stockNum <= 0;
                    const isLastOne = stockNum === 1;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.cashPrice, p.currency || "ARS")}) - {isAgotado ? "🔴 Agotado" : isLastOne ? "⚠️ 1 u. disponible" : `Stock: ${stockNum}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre / Concepto de la Venta *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Colchón Suavestar 2 Plazas, iPhone 13 Pro..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                />
              </div>
            </div>

            {/* Banner de Stock Inteligente */}
            {selectedProduct && (
              <div className="animate-fade-in pt-1">
                {(selectedProduct.stock ?? 1) === 1 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-amber-800 dark:text-amber-300">
                        ⚠️ ¡Atención! Es la última unidad en inventario (Stock: 1).
                      </span>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                        Si confirmas este crédito a este cliente, el producto se actualizará automáticamente a <strong>Agotado (0 u.)</strong> para que estés atento y no se lo prometas a otro comprador.
                      </p>
                    </div>
                  </div>
                ) : (selectedProduct.stock ?? 1) <= 0 ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-rose-800 dark:text-rose-300">
                        🔴 Este producto figura como AGOTADO (Stock: 0).
                      </span>
                      <p className="text-[11px] text-rose-800/90 dark:text-rose-300/80 mt-0.5 leading-relaxed">
                        Podés registrar el crédito igual si ya coordinaste la entrega, o podés registrar el gasto de compra en la sección de Caja para sumar unidades y actualizar el costo.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Stock disponible: <strong>{selectedProduct.stock} unidades</strong>.
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Quedarán {(selectedProduct.stock ?? 1) - 1} u. tras la venta.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. COSTOS Y PRECIO DE VENTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Costo de Compra ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  {currency === "USD" ? "US$" : "$"}
                </span>
                <input
                  type="number"
                  min="0"
                  value={costAmount || ""}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  placeholder="0"
                  className={`w-full ${currency === "USD" ? "pl-12" : "pl-8"} pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold`}
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Para calcular tu ganancia neta estimada</p>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>PRECIO DE VENTA ({currency}) *</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 lowercase">(contado / lista)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  {currency === "USD" ? "US$" : "$"}
                </span>
                <input
                  type="number"
                  min="1"
                  value={baseAmount || ""}
                  onChange={(e) => setBaseAmount(Number(e.target.value))}
                  placeholder="0"
                  required
                  className={`w-full ${currency === "USD" ? "pl-12" : "pl-8"} pr-3.5 py-2.5 rounded-xl border-2 border-blue-400 dark:border-blue-500/80 bg-white dark:bg-slate-800 text-sm font-black shadow-xs ${
                    currency === "USD" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 4. INTERÉS Y ENTREGA INICIAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Interés */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Interés Agregado (%)
                </label>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{interestRate}%</span>
              </div>
              {/* Quick chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[0, 15, 20, 25, 30, 40].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setInterestRate(rate)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      interestRate === rate
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                max="200"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            {/* Entrega Inicial / Seña */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Entrega Inicial / Seña ({currency === "USD" ? "US$" : "$"})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  {currency === "USD" ? "US$" : "$"}
                </span>
                <input
                  type="number"
                  min="0"
                  value={downPayment || ""}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  placeholder="0"
                  className={`w-full ${currency === "USD" ? "pl-12" : "pl-8"} pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold`}
                />
              </div>
              {downPayment > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-slate-500 font-medium">Cobrado en:</label>
                  {currency === "USD" ? (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      💵 Dólares Billete (Caja USD)
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setDownPaymentMethod("efectivo")}
                        className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          downPaymentMethod === "efectivo" ? "bg-emerald-600 text-white font-bold" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDownPaymentMethod("mercado_pago")}
                        className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          downPaymentMethod === "mercado_pago" ? "bg-sky-500 text-white font-bold" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Mercado Pago
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 5. CUOTAS Y FRECUENCIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cantidad de Cuotas
                </label>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {installmentCount} cuotas
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[2, 4, 6, 8, 10, 12, 16].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setInstallmentCount(count)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      installmentCount === count
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="52"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Frecuencia de Cobro
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {(["semanal", "quincenal", "mensual"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`py-2 text-xs font-bold rounded-xl capitalize transition cursor-pointer ${
                      frequency === f
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha primera cuota / inicio:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* 6. NOTAS */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
              Notas u observaciones (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Entregó seña, pasa a cobrar los sábados por la tarde"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1E293B] dark:text-[#F8FAFC] text-sm"
            />
          </div>
        </div>

        {/* COLUMNA DERECHA: RESUMEN FINANCIERO Y ACCIONES (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5 lg:sticky lg:top-0">
          {/* CAJA DE SIMULACIÓN EN VIVO (NORDIC TECH) */}
          <div className="bg-[#1E293B] border border-[#334155] text-white p-5 sm:p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2 text-blue-400 tracking-wider uppercase font-bold text-xs sm:text-sm">
                <Calculator className="w-4 h-4" />
                Resumen del Plan
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                currency === "USD" ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700" : "bg-blue-950 text-blue-300 border border-blue-800"
              }`}>
                {currency === "USD" ? "🇺🇸 En Dólares" : "🇦🇷 En Pesos"}
              </span>
            </div>

            {/* CUOTA DESTACADA */}
            <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/40 p-4 sm:p-5 rounded-2xl border border-blue-500/50 text-center">
              <span className="text-xs text-blue-300 font-bold block uppercase tracking-wider">
                Cada Cuota ({frequency})
              </span>
              <span className="text-3xl sm:text-4xl font-black text-blue-400 block mt-1">
                {formatCurrency(calculations.installmentValue, currency)}
              </span>
              <span className="text-xs text-[#94A3B8] mt-1 block">
                {installmentCount} cuotas {frequency}es
              </span>
            </div>

            {/* GRID 2x2 METRICAS */}
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155]">
                <span className="text-xs text-[#94A3B8] block">Total con Interés</span>
                <span className="text-sm sm:text-base font-extrabold text-white">
                  {formatCurrency(calculations.totalFinanced, currency)}
                </span>
              </div>

              <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155]">
                <span className="text-xs text-[#94A3B8] block">Entrega Inicial</span>
                <span className="text-sm sm:text-base font-extrabold text-white">
                  {formatCurrency(downPayment, currency)}
                </span>
              </div>

              <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155]">
                <span className="text-xs text-[#94A3B8] block">Saldo a Financiar</span>
                <span className="text-sm sm:text-base font-extrabold text-white">
                  {formatCurrency(calculations.remainingToFinance, currency)}
                </span>
              </div>

              <div className="bg-[#0F172A] p-3 rounded-xl border border-[#334155]">
                <span className="text-xs text-[#94A3B8] block">Ganancia Neta Est.</span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                  {formatCurrency(calculations.totalProfit, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN DIRECTOS */}
          <div className="space-y-2.5 pt-2 border-t lg:border-t-0 border-[#E5E7EB] dark:border-[#334155]">
            <button
              type="submit"
              disabled={loading || !selectedCustomerId || !concept || baseAmount <= 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 active:scale-98 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Creando..." : "Crear Crédito & Cuotas"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#64748B] hover:bg-slate-100 dark:text-[#94A3B8] dark:hover:bg-[#0F172A] transition cursor-pointer text-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
