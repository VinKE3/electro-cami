"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getArgentinaTodayStr,
  getArgentinaDateOffsetStr,
  getArgentinaDateStr,
} from "@/lib/utils";
import { Modal } from "./ui/modal";
import { Pagination } from "./ui/pagination";
import {
  createCashMovement,
  deleteCashMovement,
  exchangeDollarsToPesos,
  setInitialCashBalances,
} from "@/actions/cash";
import { getLiveDolarRates } from "@/actions/dolar";
import {
  Wallet,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeftRight,
  RefreshCw,
  Lock,
  Copy,
  Check,
  MessageCircle,
  AlertTriangle,
  FileText,
  Coins,
} from "lucide-react";

interface CashViewProps {
  initialData: {
    movements: any[];
    efectivoTotal: number;
    mercadoPagoTotal: number;
    totalBalance: number;
    totalIngresos: number;
    totalEgresos: number;
    dolaresEfectivoTotal?: number;
    dolaresIngresos?: number;
    dolaresEgresos?: number;
  };
  products?: any[];
}

export function CashView({ initialData, products = [] }: CashViewProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  // Filtros principales
  const [periodFilter, setPeriodFilter] = useState<"hoy" | "semana" | "mes" | "todos">("hoy");
  const [filterType, setFilterType] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // DolarApi en vivo
  const [dolarRate, setDolarRate] = useState<{ compra: number; venta: number } | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  // Modal para cambiar Dólares Físicos a Pesos
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [exchangeUsdAmount, setExchangeUsdAmount] = useState<number>(0);
  const [exchangeRateCustom, setExchangeRateCustom] = useState<number>(1520);
  const [exchangeTargetMethod, setExchangeTargetMethod] = useState<"efectivo" | "mercado_pago">("efectivo");
  const [exchangeNotes, setExchangeNotes] = useState("");
  const [exchangeLoading, setExchangeLoading] = useState(false);

  // Modal de Cierre de Caja Diario / Conteo de Bolsillo
  const [isCloseRegisterModalOpen, setIsCloseRegisterModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [countedMP, setCountedMP] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState("");
  const [copiedCloseSummary, setCopiedCloseSummary] = useState(false);

  // Modal de Ajuste de Saldos / Fondo Inicial de Caja
  const [isInitBalanceModalOpen, setIsInitBalanceModalOpen] = useState(false);
  const [initCashPesos, setInitCashPesos] = useState<number>(initialData.efectivoTotal);
  const [initMPPesos, setInitMPPesos] = useState<number>(initialData.mercadoPagoTotal);
  const [initUSD, setInitUSD] = useState<number>(initialData.dolaresEfectivoTotal || 0);
  const [initReason, setInitReason] = useState<string>("Capital Inicial / Fondo de Caja");
  const [initLoading, setInitLoading] = useState(false);

  // Form states
  const [movementType, setMovementType] = useState<"ingreso" | "egreso">("egreso");
  const [category, setCategory] = useState("flete");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "mercado_pago">("efectivo");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados específicos para Compra de Stock
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [unitsPurchased, setUnitsPurchased] = useState<number>(1);
  const [updateCostPrice, setUpdateCostPrice] = useState<boolean>(true);
  const [newCashPrice, setNewCashPrice] = useState<number>(0);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id.toString() === selectedProductId) || null;
  }, [selectedProductId, products]);

  // Cargar DolarApi en vivo
  const fetchLiveRate = React.useCallback(async () => {
    setLoadingRate(true);
    try {
      const res = await getLiveDolarRates();
      if (res.success && res.blue) {
        setDolarRate(res.blue);
        setExchangeRateCustom(res.blue.compra || res.blue.venta);
      }
    } catch (err) {
      console.warn("Error fetching live dollar rates in cash-view:", err);
    } finally {
      setLoadingRate(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLiveRate();
  }, [fetchLiveRate]);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Helpers de fechas en horario de Argentina
  const todayStr = useMemo(() => getArgentinaTodayStr(), []);
  const weekAgoStr = useMemo(() => getArgentinaDateOffsetStr(-7), []);

  // 1. Filtrar movimientos por período para el Arqueo
  const periodMovements = useMemo(() => {
    return data.movements.filter((m) => {
      const movDateStr = getArgentinaDateStr(m.date);
      if (periodFilter === "hoy") {
        return movDateStr === todayStr;
      }
      if (periodFilter === "semana") {
        return movDateStr >= weekAgoStr && movDateStr <= todayStr;
      }
      if (periodFilter === "mes") {
        return movDateStr.slice(0, 7) === todayStr.slice(0, 7);
      }
      return true; // "todos"
    });
  }, [data.movements, periodFilter, todayStr, weekAgoStr]);

  // 2. Cálculos del Arqueo para el período seleccionado (incluyendo USD)
  const periodStats = useMemo(() => {
    let efectivoIngresos = 0;
    let efectivoEgresos = 0;
    let digitalIngresos = 0;
    let digitalEgresos = 0;
    let dolaresIngresos = 0;
    let dolaresEgresos = 0;

    for (const m of periodMovements) {
      const num = parseFloat(m.amount || "0");
      const isUSD = m.currency === "USD";

      if (isUSD) {
        if (m.type === "ingreso") dolaresIngresos += num;
        else dolaresEgresos += num;
      } else {
        if (m.type === "ingreso") {
          if (m.paymentMethod === "efectivo") efectivoIngresos += num;
          else digitalIngresos += num;
        } else {
          if (m.paymentMethod === "efectivo") efectivoEgresos += num;
          else digitalEgresos += num;
        }
      }
    }

    const efectivoNeto = efectivoIngresos - efectivoEgresos;
    const digitalNeto = digitalIngresos - digitalEgresos;
    const dolaresNeto = dolaresIngresos - dolaresEgresos;
    const totalNeto = efectivoNeto + digitalNeto;

    let gastosStock = 0;
    let gastosOperativos = 0;

    for (const m of periodMovements) {
      const num = parseFloat(m.amount || "0");
      if (m.currency !== "USD" && m.type === "egreso") {
        if (m.category === "compra_mercaderia") {
          gastosStock += num;
        } else {
          gastosOperativos += num;
        }
      }
    }

    const totalCobrado = efectivoIngresos + digitalIngresos;
    const gananciaNetaReal = totalCobrado - gastosStock - gastosOperativos;

    return {
      efectivoIngresos,
      efectivoEgresos,
      efectivoNeto,
      digitalIngresos,
      digitalEgresos,
      digitalNeto,
      dolaresIngresos,
      dolaresEgresos,
      dolaresNeto,
      totalNeto,
      gastosStock,
      gastosOperativos,
      totalCobrado,
      gananciaNetaReal,
    };
  }, [periodMovements]);

  // 3. Filtrar movimientos por buscador y tipo (ingreso/egreso) para la tabla
  const displayedMovements = useMemo(() => {
    return periodMovements.filter((m) => {
      const matchesType = filterType === "todos" ? true : m.type === filterType;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.paymentMethod.toLowerCase().includes(q) ||
        (m.product && m.product.name.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [periodMovements, filterType, search]);

  const paginatedMovements = useMemo(() => {
    return displayedMovements.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [displayedMovements, currentPage, pageSize]);

  const openNewMovementModal = (type: "ingreso" | "egreso") => {
    setMovementType(type);
    if (type === "egreso") {
      setCategory("flete");
      setDescription("Flete para traslado");
    } else {
      setCategory("cobro_cuota");
      setDescription("Cobro de cuota");
    }
    setAmount(0);
    setCurrency("ARS");
    setSelectedProductId("");
    setUnitsPurchased(1);
    setUpdateCostPrice(true);
    setNewCashPrice(0);
    setPaymentMethod("efectivo");
    setIsModalOpen(true);
  };

  const handleSelectQuickCategory = (cat: string, defaultDesc: string) => {
    setCategory(cat);
    setDescription(defaultDesc);
    if (cat !== "compra_mercaderia") {
      setSelectedProductId("");
      setUnitsPurchased(1);
    }
  };

  const handleProductSelection = (prodIdStr: string) => {
    setSelectedProductId(prodIdStr);
    if (!prodIdStr) return;
    const prod = products.find((p) => p.id.toString() === prodIdStr);
    if (prod) {
      setCurrency((prod.currency as "ARS" | "USD") || "ARS");
      setDescription(`Compra de stock: ${unitsPurchased} u. de ${prod.name}`);
      setNewCashPrice(parseFloat(prod.cashPrice || "0"));
    }
  };

  const handleUnitsChange = (newUnits: number) => {
    const val = Math.max(1, newUnits);
    setUnitsPurchased(val);
    if (selectedProduct) {
      setDescription(`Compra de stock: ${val} u. de ${selectedProduct.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;

    setLoading(true);
    try {
      const res = await createCashMovement({
        type: movementType,
        category,
        amount: Number(amount),
        currency,
        paymentMethod,
        description,
        productId: selectedProductId ? Number(selectedProductId) : null,
        units: selectedProductId ? Number(unitsPurchased) : null,
        updateCostPrice: selectedProductId ? updateCostPrice : false,
        newCashPrice: selectedProductId && newCashPrice > 0 ? Number(newCashPrice) : null,
      });

      if (res.success && res.data) {
        setIsModalOpen(false);
      } else {
        alert(res.error || "Error al registrar movimiento.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Deseas anular este movimiento de caja?")) return;
    const res = await deleteCashMovement(id);
    if (!res.success) alert(res.error || "No se pudo anular.");
    else router.refresh();
  };

  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exchangeUsdAmount <= 0 || exchangeRateCustom <= 0) return;

    setExchangeLoading(true);
    try {
      const res = await exchangeDollarsToPesos({
        usdAmount: Number(exchangeUsdAmount),
        exchangeRate: Number(exchangeRateCustom),
        targetMethod: exchangeTargetMethod,
        notes: exchangeNotes.trim() || undefined,
      });

      if (res.success) {
        setIsExchangeModalOpen(false);
        setExchangeUsdAmount(0);
        setExchangeNotes("");
        router.refresh();
      } else {
        alert(res.error || "Error al realizar el canje de divisas.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setExchangeLoading(false);
    }
  };

  const openInitBalanceModal = () => {
    setInitCashPesos(data.efectivoTotal);
    setInitMPPesos(data.mercadoPagoTotal);
    setInitUSD(data.dolaresEfectivoTotal || 0);
    setInitReason("Capital Inicial / Fondo de Caja");
    setIsInitBalanceModalOpen(true);
  };

  const handleInitBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitLoading(true);
    try {
      const res = await setInitialCashBalances({
        targetCashPesos: Number(initCashPesos),
        targetMercadoPago: Number(initMPPesos),
        targetDolares: Number(initUSD),
        reason: initReason.trim() || undefined,
      });

      if (res.success) {
        setIsInitBalanceModalOpen(false);
        setData((prev) => ({
          ...prev,
          efectivoTotal: Number(initCashPesos),
          mercadoPagoTotal: Number(initMPPesos),
          totalBalance: Number(initCashPesos) + Number(initMPPesos),
          dolaresEfectivoTotal: Number(initUSD),
        }));
        router.refresh();
      } else {
        alert(res.error || "No se pudo actualizar los saldos de caja.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setInitLoading(false);
    }
  };

  // Helper para insignias de categorías
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case "flete":
        return { label: "Flete / Furgón", icon: "🚚", color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40" };
      case "combustible":
        return { label: "Combustible / Nafta", icon: "⛽", color: "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40" };
      case "compra_mercaderia":
        return { label: "Compra Stock", icon: "📦", color: "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40" };
      case "cobro_cuota":
        return { label: "Cobro Cuota", icon: "💰", color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40" };
      case "entrega_inicial":
        return { label: "Entrega Inicial", icon: "💵", color: "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40" };
      case "venta_contado":
        return { label: "Venta Contado", icon: "⚡", color: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40" };
      case "cambio_divisa":
        return { label: "Cambio Dólar/Pesos", icon: "🔄", color: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40" };
      case "fondo_inicial":
        return { label: "Fondo Inicial / Ajuste", icon: "🏦", color: "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40" };
      case "viatico":
      case "comida":
        return { label: "Comida / Viático", icon: "🍽️", color: "text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/40" };
      default:
        return { label: cat.replace("_", " "), icon: "📝", color: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800" };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Control de Caja Diaria & Gastos
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Diferenciación exacta entre efectivo en mano, Mercado Pago y dólares. Registra tus fondos, compras y movimientos.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openInitBalanceModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer text-center"
            title="Ajustar o cargar el capital inicial de tu caja total"
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className="truncate">Ajustar Caja</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCountedCash(data.efectivoTotal);
              setCountedMP(data.mercadoPagoTotal);
              setCloseNotes("");
              setCopiedCloseSummary(false);
              setIsCloseRegisterModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition cursor-pointer text-center"
            title="Realizar conteo físico de billetes y cierre de caja"
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span className="truncate">Cierre Bolsillo</span>
          </button>

          <button
            onClick={() => openNewMovementModal("egreso")}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer text-center"
          >
            <Minus className="w-4 h-4 shrink-0" />
            <span className="truncate">- Gasto</span>
          </button>

          <button
            onClick={() => openNewMovementModal("ingreso")}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer text-center"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">+ Ingreso</span>
          </button>
        </div>
      </div>

      {/* METRICAS GLOBALES ACUMULADAS (4 CAJAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Efectivo en Mano Acumulado */}
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs relative">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold">Efectivo Físico en Mano</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openInitBalanceModal}
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 px-2 py-0.5 rounded-md transition cursor-pointer"
                title="Ajustar saldo inicial de efectivo"
              >
                Editar
              </button>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.efectivoTotal)}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            Billetes físicos netos en bolsillo/caja
          </p>
        </div>

        {/* 2. Mercado Pago Acumulado */}
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs relative">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold">Mercado Pago / Banco</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openInitBalanceModal}
                className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 px-2 py-0.5 rounded-md transition cursor-pointer"
                title="Ajustar saldo inicial de Mercado Pago"
              >
                Editar
              </button>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
            {formatCurrency(data.mercadoPagoTotal)}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            Dinero acreditado en cuenta digital
          </p>
        </div>

        {/* 3. Dólares Billete Físicos Acumulados */}
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-xs relative bg-amber-50/20 dark:bg-amber-950/10">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold">Dólares Billete (USD)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openInitBalanceModal}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 hover:bg-amber-200/80 dark:hover:bg-amber-900/80 px-2 py-0.5 rounded-md transition cursor-pointer"
                title="Ajustar saldo inicial de dólares"
              >
                Editar
              </button>
              <div className="w-8 h-8 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <span className="text-sm font-bold">💵</span>
              </div>
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            US$ {(data.dolaresEfectivoTotal || 0).toLocaleString("es-AR")}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
            {dolarRate && (data.dolaresEfectivoTotal || 0) > 0 ? (
              <span>≈ {formatCurrency((data.dolaresEfectivoTotal || 0) * (dolarRate.compra || dolarRate.venta), "ARS")} (Blue)</span>
            ) : (
              <span>Billetes físicos de reserva</span>
            )}
          </p>
        </div>

        {/* 4. Total Disponible Acumulado (Pesos) */}
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs relative">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold">Total Disponible (Pesos)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openInitBalanceModal}
                className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-2 py-0.5 rounded-md transition cursor-pointer"
                title="Configurar fondos de caja"
              >
                Ajustar
              </button>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            {formatCurrency(data.totalBalance)}
          </div>
          <div className="flex items-center gap-2 text-[11px] mt-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              +{formatCurrency(data.totalIngresos)}
            </span>
            <span className="text-[#94A3B8]">•</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              -{formatCurrency(data.totalEgresos)}
            </span>
          </div>
        </div>
      </div>

      {/* PANEL DESTACADO: RESUMEN Y ARQUEO DE CAJA DIARIO */}
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-[#E5E7EB] dark:border-[#334155] p-5 sm:p-6 shadow-xs space-y-4">
        {/* Selector de Período de Arqueo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-base font-black text-[#1E293B] dark:text-[#F8FAFC]">
                Arqueo & Balance del Período
              </h3>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Controla exactamente cuánto dinero físico cobraste, gastaste y cuánto te quedó.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#F4F6F9] dark:bg-[#0F172A] p-1 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] text-xs font-bold self-start sm:self-auto overflow-x-auto max-w-full">
            {[
              { id: "hoy", label: "Hoy" },
              { id: "semana", label: "Esta Semana" },
              { id: "mes", label: "Este Mes" },
              { id: "todos", label: "Histórico" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriodFilter(p.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  periodFilter === p.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tarjetas de Métricas del Arqueo del Período */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Cobros Efectivo (+) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
              Efectivo Cobrado (+)
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(periodStats.efectivoIngresos)}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Entró en mano en este período
            </p>
          </div>

          {/* Gastos Efectivo (-) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-1">
              Efectivo Gastado (-)
            </span>
            <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
              -{formatCurrency(periodStats.efectivoEgresos)}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Fletes, nafta y compras
            </p>
          </div>

          {/* Efectivo Neto en Mano (=) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0F172A] border-2 border-blue-500/40 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                Balance Efectivo (=)
              </span>
              {periodStats.efectivoNeto !== 0 && (
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                    periodStats.efectivoNeto > 0
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                  }`}
                >
                  {periodStats.efectivoNeto > 0 ? "A favor" : "En contra"}
                </span>
              )}
            </div>
            <div
              className={`text-lg sm:text-xl font-black ${
                periodStats.efectivoNeto > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : periodStats.efectivoNeto < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-[#1E293B] dark:text-[#F8FAFC]"
              }`}
            >
              {periodStats.efectivoNeto > 0 ? "+" : ""}
              {formatCurrency(periodStats.efectivoNeto)}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Cobros menos gastos del período
            </p>
          </div>

          {/* Mercado Pago Neto */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 block mb-1">
              Mercado Pago Neto
            </span>
            <div
              className={`text-lg sm:text-xl font-black ${
                periodStats.digitalNeto > 0
                  ? "text-sky-600 dark:text-sky-400"
                  : periodStats.digitalNeto < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-[#1E293B] dark:text-[#F8FAFC]"
              }`}
            >
              {periodStats.digitalNeto > 0 ? "+" : ""}
              {formatCurrency(periodStats.digitalNeto)}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Cobrado por app en este período
            </p>
          </div>
        </div>

        {/* Tarjeta de Caja Dólares Físicos (USD) si hubo movimientos o saldo */}
        {(periodStats.dolaresIngresos > 0 ||
          periodStats.dolaresEgresos > 0 ||
          periodStats.dolaresNeto !== 0 ||
          (data.dolaresEfectivoTotal !== undefined && data.dolaresEfectivoTotal !== 0)) && (
          <div className="mt-3.5 p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-300/80 dark:border-amber-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in shadow-xs">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="text-3xl p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-2xl border border-amber-200 dark:border-amber-800 shrink-0">
                💵
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                    Caja Dólares Físicos (USD) • {periodFilter === "hoy" ? "Hoy" : periodFilter === "semana" ? "Esta Semana" : periodFilter === "mes" ? "Este Mes" : "Histórico"}
                  </span>
                  {/* Badge en vivo de DolarApi */}
                  {dolarRate && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Dólar Blue hoy: Compra ${dolarRate.compra} · Venta ${dolarRate.venta}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                  Cobros en billete: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">+US$ {periodStats.dolaresIngresos}</strong> • Salidas/Compras: <strong className="text-rose-600 dark:text-rose-400 font-bold">-US$ {periodStats.dolaresEgresos}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end md:self-center">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                  Balance Billetes USD
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-200 block">
                  {formatCurrency(periodStats.dolaresNeto, "USD")}
                </span>
                {dolarRate && periodStats.dolaresNeto > 0 && (
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Equivale a aprox. {formatCurrency(periodStats.dolaresNeto * dolarRate.venta, "ARS")}
                  </span>
                )}
              </div>

              {/* Botón para Cambiar Dólares a Pesos */}
              <button
                type="button"
                onClick={() => {
                  setExchangeUsdAmount(periodStats.dolaresNeto > 0 ? periodStats.dolaresNeto : 0);
                  if (dolarRate) setExchangeRateCustom(dolarRate.compra);
                  setIsExchangeModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Cambiar a Pesos</span>
              </button>
            </div>
          </div>
        )}

        {/* PANEL DE RENTABILIDAD REAL DEL NEGOCIO */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Rendimiento & Ganancia Neta Real ({periodFilter === "hoy" ? "Hoy" : periodFilter === "semana" ? "Esta Semana" : periodFilter === "mes" ? "Este Mes" : "Histórico"})
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Total cobrado menos gastos de nafta/fletes y compras de stock:
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs pt-1 text-slate-300 font-medium">
                <span>Cobrado: <strong className="text-emerald-400">+{formatCurrency(periodStats.totalCobrado)}</strong></span>
                <span>•</span>
                <span>Inversión Stock: <strong className="text-rose-400">-{formatCurrency(periodStats.gastosStock)}</strong></span>
                <span>•</span>
                <span>Gastos Operativos: <strong className="text-amber-400">-{formatCurrency(periodStats.gastosOperativos)}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-2xl border border-white/10 self-start md:self-auto">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">
                  Ganancia Neta Real
                </span>
                <span className={`text-xl sm:text-2xl font-black ${periodStats.gananciaNetaReal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {periodStats.gananciaNetaReal >= 0 ? "+" : ""}{formatCurrency(periodStats.gananciaNetaReal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIAL DETALLADO DE MOVIMIENTOS */}
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden shadow-xs">
        {/* Barra superior con Buscador y Filtro por Tipo */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] dark:border-[#334155] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1E293B] dark:text-[#F8FAFC]">
              Movimientos Registrados ({displayedMovements.length})
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Mostrando los registros de:{" "}
              <strong className="text-blue-600 dark:text-blue-400 capitalize">
                {periodFilter === "hoy"
                  ? "Hoy"
                  : periodFilter === "semana"
                  ? "Esta Semana"
                  : periodFilter === "mes"
                  ? "Este Mes"
                  : "Todo el Histórico"}
              </strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar detalle, persona, flete..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs outline-hidden focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
              />
            </div>

            {/* Pestañas Ingresos / Gastos */}
            <div className="flex gap-1 bg-[#F4F6F9] dark:bg-[#0F172A] p-1 rounded-xl text-xs font-bold border border-[#E5E7EB] dark:border-[#334155] self-start sm:self-auto">
              {[
                { id: "todos", label: "Todos" },
                { id: "ingreso", label: "Ingresos" },
                { id: "egreso", label: "Gastos" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterType(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs ${
                    filterType === tab.id
                      ? "bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] shadow-xs"
                      : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Movimientos */}
        <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
          {displayedMovements.length === 0 ? (
            <div className="p-12 text-center text-[#94A3B8] space-y-2">
              <Wallet className="w-10 h-10 mx-auto opacity-40 mb-2" />
              <p className="font-semibold text-sm text-[#1E293B] dark:text-[#F8FAFC]">
                No hay movimientos registrados para este período
              </p>
              <p className="text-xs">
                {periodFilter === "hoy"
                  ? "Aún no se han registrado cobros o gastos hoy. Puedes cambiar a 'Esta Semana' o 'Histórico'."
                  : "No se encontraron movimientos con los filtros seleccionados."}
              </p>
            </div>
          ) : (
            paginatedMovements.map((mov) => {
              const isIngreso = mov.type === "ingreso";
              const amountNum = parseFloat(mov.amount);
              const catDetails = getCategoryDetails(mov.category);

              return (
                <div
                  key={mov.id}
                  className="p-3.5 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#F4F6F9]/60 dark:hover:bg-[#283548]/40 transition min-w-0"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isIngreso
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                      }`}
                    >
                      {isIngreso ? (
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-[#1E293B] dark:text-[#F8FAFC] text-xs sm:text-sm truncate">
                        {mov.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                        <span
                          className={`font-semibold text-[10px] px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${catDetails.color}`}
                        >
                          <span>{catDetails.icon}</span>
                          <span>{catDetails.label}</span>
                        </span>
                        <span>•</span>
                        {mov.currency === "USD" ? (
                          <span className="font-black uppercase text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            💵 USD Billete
                          </span>
                        ) : (
                          <span
                            className={`font-bold uppercase text-[10px] px-1.5 py-0.2 rounded ${
                              mov.paymentMethod === "efectivo"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                : "bg-sky-50 text-sky-700 dark:bg-sky-950/40"
                            }`}
                          >
                            {mov.paymentMethod === "efectivo" ? "Efectivo" : "Mercado Pago"}
                          </span>
                        )}
                        {mov.units && mov.units > 1 && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                              {mov.units} u.
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDateTime(mov.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span
                      className={`text-sm sm:text-lg font-black whitespace-nowrap ${
                        isIngreso
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isIngreso ? "+" : "-"}
                      {formatCurrency(amountNum, mov.currency || "ARS")}
                    </span>

                    <button
                      onClick={() => handleDelete(mov.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Anular movimiento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
            totalItems={displayedMovements.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 15, 25]}
            itemLabel="movimientos"
          />
        </div>
      </div>

      {/* MODAL NUEVO MOVIMIENTO CON VINCULACIÓN A PRODUCTOS Y MONEDA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={movementType === "egreso" ? "Registrar Gasto / Salida" : "Registrar Ingreso Extra"}
        description="Lleva el control de cada movimiento y actualiza inventarios."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de Moneda */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Moneda del Movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurrency("ARS")}
                className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  currency === "ARS"
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                    : "border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC]"
                }`}
              >
                🇦🇷 Pesos ($)
              </button>

              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  currency === "USD"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC]"
                }`}
              >
                🇺🇸 Dólares (USD Billete)
              </button>
            </div>
          </div>

          {/* Botones de Categorías Frecuentes */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
              Categoría Rápida (1 toque)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {movementType === "egreso" ? (
                <>
                  {[
                    { cat: "flete", label: "🚚 Flete", desc: "Flete para traslado" },
                    { cat: "combustible", label: "⛽ Nafta / Combustible", desc: "Carga de combustible" },
                    { cat: "compra_mercaderia", label: "📦 Compra Stock", desc: "Compra de mercadería a proveedor" },
                    { cat: "viatico", label: "🍽️ Viático / Comida", desc: "Almuerzo de trabajo" },
                    { cat: "otro_gasto", label: "📝 Otro Gasto", desc: "Gasto general" },
                  ].map((btn) => (
                    <button
                      key={btn.cat}
                      type="button"
                      onClick={() => handleSelectQuickCategory(btn.cat, btn.desc)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        category === btn.cat
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-[#F4F6F9] dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { cat: "cobro_cuota", label: "💰 Cobro Cuota", desc: "Cobro manual de cuota" },
                    { cat: "entrega_inicial", label: "💵 Entrega Inicial", desc: "Entrega inicial / seña" },
                    { cat: "venta_contado", label: "⚡ Venta Contado", desc: "Venta directa de contado" },
                    { cat: "otro_ingreso", label: "➕ Otro Ingreso", desc: "Ingreso extraordinario" },
                  ].map((btn) => (
                    <button
                      key={btn.cat}
                      type="button"
                      onClick={() => handleSelectQuickCategory(btn.cat, btn.desc)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        category === btn.cat
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-[#F4F6F9] dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* SECCIÓN ESPECIAL: VINCULAR A PRODUCTO (Compra de Stock) */}
          {movementType === "egreso" && category === "compra_mercaderia" && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  📦 Vincular a Producto del Inventario
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                  Auto-suma stock
                </span>
              </div>

              <div>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]"
                >
                  <option value="">-- Sin vincular (Compra general de mercadería) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.currency === "USD" ? `US$ ${p.cashPrice}` : `$ ${p.cashPrice}`} • Stock actual: {p.stock ?? 1})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="space-y-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                      Cantidad comprada (a sumar):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUnitsChange(unitsPurchased - 1)}
                        className="p-1 rounded-lg bg-white dark:bg-[#1E293B] border border-blue-200 dark:border-blue-800 text-[#1E293B] dark:text-[#F8FAFC] cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-black text-sm text-blue-600 dark:text-blue-400">
                        {unitsPurchased} u.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnitsChange(unitsPurchased + 1)}
                        className="p-1 rounded-lg bg-white dark:bg-[#1E293B] border border-blue-200 dark:border-blue-800 text-[#1E293B] dark:text-[#F8FAFC] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Comparador de Costo / Inflación */}
                  {amount > 0 && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-blue-200/60 dark:border-blue-900/40 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Costo guardado anterior:</span>
                        <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                          {formatCurrency(selectedProduct.costPrice, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">Nuevo costo de reposición:</span>
                        <span className="font-black text-blue-600 dark:text-blue-400">
                          {formatCurrency(Math.round(amount / unitsPurchased), currency)} c/u
                        </span>
                      </div>

                      {/* Checkbox para actualizar costo */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <input
                          type="checkbox"
                          id="updateCostPrice"
                          checked={updateCostPrice}
                          onChange={(e) => setUpdateCostPrice(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <label htmlFor="updateCostPrice" className="text-[11px] font-semibold text-[#1E293B] dark:text-[#F8FAFC] cursor-pointer">
                          Actualizar costo del producto a este nuevo precio
                        </label>
                      </div>

                      {/* Input opcional para ajustar precio de venta al público */}
                      <div className="pt-1.5">
                        <label className="block text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] mb-0.5">
                          Precio venta contado actual: {formatCurrency(selectedProduct.cashPrice, currency)}. ¿Ajustar precio contado?
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={`Dejar en blanco para mantener (${selectedProduct.cashPrice})`}
                          value={newCashPrice || ""}
                          onChange={(e) => setNewCashPrice(Number(e.target.value))}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs font-bold text-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Monto Total ({currency === "USD" ? "US$" : "$"}) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">
                {currency === "USD" ? "US$" : "$"}
              </span>
              <input
                type="number"
                min="1"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                autoFocus
                placeholder="0"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] font-black text-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Medio de Pago */}
          {currency === "ARS" && (
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                Medio de pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("efectivo")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === "efectivo"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC]"
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Efectivo
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("mercado_pago")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === "mercado_pago"
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC]"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Mercado Pago
                </button>
              </div>
            </div>
          )}

          {/* Descripción / Detalle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
              Descripción / Detalle *
            </label>
            <input
              type="text"
              placeholder="Ej: Flete para traer colchón desde Lanús"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-6 sm:mt-8 px-4 sm:px-6 py-4 sm:py-5 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xs flex items-center justify-end gap-3 border-t border-[#E5E7EB] dark:border-[#334155] z-20">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#64748B] hover:bg-[#F4F6F9] dark:text-[#94A3B8] dark:hover:bg-[#0F172A] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0 || !description.trim()}
              className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md disabled:opacity-50 transition cursor-pointer ${
                movementType === "egreso"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-blue-500/20"
              }`}
            >
              {loading ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CAMBIO / CANJE DE DÓLARES A PESOS */}
      <Modal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        title="Cambiar / Vender Dólares a Pesos"
        description="Descuenta billetes de la caja de dólares e ingresa los pesos recibidos a la caja de efectivo o Mercado Pago."
        maxWidth="lg"
      >
        <form onSubmit={handleExchangeSubmit} className="space-y-4">
          {/* Banner de DolarApi en vivo */}
          {dolarRate && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Cotización Dólar Blue (DolarApi):</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="font-extrabold text-amber-950 dark:text-amber-100">
                  Compra: ${dolarRate.compra} · Venta: ${dolarRate.venta}
                </span>
                <button
                  type="button"
                  onClick={fetchLiveRate}
                  disabled={loadingRate}
                  className="p-1 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                  title="Actualizar API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRate ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          )}

          {/* Dólares a entregar */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Dólares Físicos a Cambiar (US$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                US$
              </span>
              <input
                type="number"
                min="1"
                value={exchangeUsdAmount || ""}
                onChange={(e) => setExchangeUsdAmount(Number(e.target.value))}
                placeholder="100"
                required
                className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
              />
            </div>
          </div>

          {/* Cotización acordada */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Cotización acordada ($ por cada Dólar) *
              </label>
              {dolarRate && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExchangeRateCustom(dolarRate.compra)}
                    className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    Usar Compra (${dolarRate.compra})
                  </button>
                  <span className="text-slate-400 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => setExchangeRateCustom(dolarRate.venta)}
                    className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    Usar Venta (${dolarRate.venta})
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                $
              </span>
              <input
                type="number"
                min="1"
                value={exchangeRateCustom || ""}
                onChange={(e) => setExchangeRateCustom(Number(e.target.value))}
                required
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-amber-400 dark:border-amber-500/80 bg-white dark:bg-slate-800 text-sm font-black text-amber-800 dark:text-amber-200"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Valor cargado desde DolarApi. Si tu papá acordó otro valor, puede modificarlo libremente.
            </p>
          </div>

          {/* Destino de los Pesos */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              ¿A dónde ingresan los Pesos recibidos?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExchangeTargetMethod("efectivo")}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  exchangeTargetMethod === "efectivo"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Banknote className="w-4 h-4" />
                Efectivo en Mano (Caja ARS)
              </button>
              <button
                type="button"
                onClick={() => setExchangeTargetMethod("mercado_pago")}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  exchangeTargetMethod === "mercado_pago"
                    ? "bg-sky-500 border-sky-500 text-white shadow-xs"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Mercado Pago / Banco
              </button>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Detalle u observación (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Canje en cueva Lanús para comprar mercadería"
              value={exchangeNotes}
              onChange={(e) => setExchangeNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          {/* Tarjeta de cálculo final en vivo */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-300 dark:border-emerald-700 flex justify-between items-center text-xs">
            <div>
              <span className="text-emerald-700 dark:text-emerald-300 font-bold block">
                Total de Pesos a Ingresar:
              </span>
              <span className="text-[10px] text-slate-500">
                US$ {exchangeUsdAmount} × ${exchangeRateCustom}
              </span>
            </div>
            <span className="text-lg font-black text-emerald-800 dark:text-emerald-200">
              {formatCurrency(Math.round(exchangeUsdAmount * exchangeRateCustom), "ARS")}
            </span>
          </div>

          {/* Footer buttons */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-6 sm:mt-8 px-4 sm:px-6 py-4 sm:py-5 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xs flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsExchangeModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={exchangeLoading || exchangeUsdAmount <= 0 || exchangeRateCustom <= 0}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 disabled:opacity-50 transition cursor-pointer"
            >
              {exchangeLoading ? "Registrando..." : "Confirmar Canje & Actualizar Cajas"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CIERRE DE CAJA DIARIO (ARQUEO DE BOLSILLO) */}
      <Modal
        isOpen={isCloseRegisterModalOpen}
        onClose={() => setIsCloseRegisterModalOpen(false)}
        title="🔒 Cierre de Caja Diario (Arqueo de Bolsillo)"
        description="Cuenta los billetes físicos en tu bolsillo y compáralos con el sistema."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  1. Efectivo Físico en Mano (Billetes en bolsillo)
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Esperado en sistema: <strong>{formatCurrency(data.efectivoTotal)}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={countedCash || ""}
                  onChange={(e) => setCountedCash(Number(e.target.value))}
                  placeholder="Ingresa los billetes contados"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-base text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Diferencia Efectivo */}
              {(() => {
                const diff = countedCash - data.efectivoTotal;
                return (
                  <div className="mt-1.5 flex items-center justify-between text-xs px-1">
                    <span className="text-slate-500 dark:text-slate-400">Diferencia Efectivo:</span>
                    {diff === 0 ? (
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ¡Caja Exacta! ($0)
                      </span>
                    ) : diff > 0 ? (
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        🟡 Sobran +{formatCurrency(diff)}
                      </span>
                    ) : (
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        🔴 Faltan -{formatCurrency(Math.abs(diff))}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  2. Saldo en Mercado Pago / Transferencias
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Esperado en sistema: <strong>{formatCurrency(data.mercadoPagoTotal)}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={countedMP || ""}
                  onChange={(e) => setCountedMP(Number(e.target.value))}
                  placeholder="Saldo actual en Mercado Pago"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-base text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Diferencia MP */}
              {(() => {
                const diffMP = countedMP - data.mercadoPagoTotal;
                return (
                  <div className="mt-1.5 flex items-center justify-between text-xs px-1">
                    <span className="text-slate-500 dark:text-slate-400">Diferencia Mercado Pago:</span>
                    {diffMP === 0 ? (
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Coincide con Mercado Pago
                      </span>
                    ) : diffMP > 0 ? (
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        🟡 Sobran +{formatCurrency(diffMP)}
                      </span>
                    ) : (
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        🔴 Faltan -{formatCurrency(Math.abs(diffMP))}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Comentario o nota del día (opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: Dejé $10.000 para cambio mañana"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Resumen para WhatsApp */}
          <div className="bg-[#EFEAE2] dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <FileText className="w-4 h-4 text-emerald-600" />
                Resumen de Cierre Diario:
              </span>
              <button
                type="button"
                onClick={() => {
                  const diffCash = countedCash - data.efectivoTotal;
                  const diffMP = countedMP - data.mercadoPagoTotal;
                  const text = `🔒 *CIERRE DIARIO DE CAJA - ELECTRO CAMI*\n📅 Fecha: ${formatDate(todayStr)}\n\n💵 *Efectivo en Bolsillo:*\n• Billetes contados: ${formatCurrency(countedCash)}\n• Esperado en sistema: ${formatCurrency(data.efectivoTotal)}\n• Diferencia: ${diffCash === 0 ? "Exacto (Coincide 100%)" : diffCash > 0 ? `Sobrante +${formatCurrency(diffCash)}` : `Faltante -${formatCurrency(Math.abs(diffCash))}`}\n\n💳 *Mercado Pago:*\n• Saldo en cuenta: ${formatCurrency(countedMP)}\n• Esperado en sistema: ${formatCurrency(data.mercadoPagoTotal)}\n• Diferencia: ${diffMP === 0 ? "Exacto" : diffMP > 0 ? `+${formatCurrency(diffMP)}` : `-${formatCurrency(Math.abs(diffMP))}`}\n\n📊 *Movimientos del Día:*\n• Total Cobrado: +${formatCurrency(periodStats.totalCobrado)}\n• Gastos Operativos: -${formatCurrency(periodStats.gastosOperativos)}\n• Inversión Stock: -${formatCurrency(periodStats.gastosStock)}\n• Ganancia Neta Real: ${formatCurrency(periodStats.gananciaNetaReal)}${closeNotes ? `\n\n💬 Nota: ${closeNotes}` : ""}`;
                  navigator.clipboard.writeText(text);
                  setCopiedCloseSummary(true);
                  setTimeout(() => setCopiedCloseSummary(false), 2000);
                }}
                className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
              >
                {copiedCloseSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCloseSummary ? "¡Copiado!" : "Copiar texto"}
              </button>
            </div>

            <div className="bg-white dark:bg-[#1E293B] p-3 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-line border border-slate-200 dark:border-slate-700">
              {`🔒 CIERRE DIARIO - ${todayStr}\n💵 Efectivo contado: ${formatCurrency(countedCash)} (${countedCash === data.efectivoTotal ? "Exacto" : countedCash > data.efectivoTotal ? `+${formatCurrency(countedCash - data.efectivoTotal)}` : `-${formatCurrency(data.efectivoTotal - countedCash)}`})\n💳 Mercado Pago: ${formatCurrency(countedMP)}\n📈 Ganancia Neta: ${formatCurrency(periodStats.gananciaNetaReal)}`}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCloseRegisterModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={() => {
                const diffCash = countedCash - data.efectivoTotal;
                const diffMP = countedMP - data.mercadoPagoTotal;
                const text = `🔒 *CIERRE DIARIO DE CAJA - ELECTRO CAMI*\n📅 Fecha: ${formatDate(todayStr)}\n\n💵 *Efectivo en Bolsillo:*\n• Billetes contados: ${formatCurrency(countedCash)}\n• Esperado en sistema: ${formatCurrency(data.efectivoTotal)}\n• Diferencia: ${diffCash === 0 ? "Exacto (Coincide 100%)" : diffCash > 0 ? `Sobrante +${formatCurrency(diffCash)}` : `Faltante -${formatCurrency(Math.abs(diffCash))}`}\n\n💳 *Mercado Pago:*\n• Saldo en cuenta: ${formatCurrency(countedMP)}\n• Esperado en sistema: ${formatCurrency(data.mercadoPagoTotal)}\n• Diferencia: ${diffMP === 0 ? "Exacto" : diffMP > 0 ? `+${formatCurrency(diffMP)}` : `-${formatCurrency(Math.abs(diffMP))}`}\n\n📊 *Movimientos del Día:*\n• Total Cobrado: +${formatCurrency(periodStats.totalCobrado)}\n• Gastos Operativos: -${formatCurrency(periodStats.gastosOperativos)}\n• Inversión Stock: -${formatCurrency(periodStats.gastosStock)}\n• Ganancia Neta Real: ${formatCurrency(periodStats.gananciaNetaReal)}${closeNotes ? `\n\n💬 Nota: ${closeNotes}` : ""}`;
                navigator.clipboard.writeText(text);
                setCopiedCloseSummary(true);
                setTimeout(() => setCopiedCloseSummary(false), 2000);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCloseSummary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCloseSummary ? "¡Resumen Copiado!" : "Copiar Resumen para WhatsApp"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE AJUSTE DE SALDOS / FONDO INICIAL DE CAJA */}
      <Modal
        isOpen={isInitBalanceModalOpen}
        onClose={() => setIsInitBalanceModalOpen(false)}
        title="🏦 Ajustar Capital Total / Fondo Inicial"
        description="Establecé cuánto dinero real tenés en este momento en cada caja para comenzar a operar y mover tu capital."
        maxWidth="xl"
      >
        <form onSubmit={handleInitBalanceSubmit} className="space-y-4">
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <span className="text-xl">💡</span>
            <div>
              <strong className="block font-bold mb-0.5">¿Cómo funciona este ajuste?</strong>
              Podés ingresar el total exacto que tenés hoy (ej: <strong>$1.000.000</strong> en efectivo, <strong>$5.000.000</strong> en Mercado Pago y <strong>US$ 1.000</strong> en dólares). El sistema calculará la diferencia y creará un registro de balance inicial sin borrar tu historial previo.
            </div>
          </div>

          <div className="space-y-3.5">
            {/* 1. Efectivo Físico en Mano */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" />
                  1. Efectivo Físico en Mano (Pesos ARS)
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Actual en sistema: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(data.efectivoTotal)}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={initCashPesos || ""}
                  onChange={(e) => setInitCashPesos(Number(e.target.value))}
                  placeholder="Ej: 1000000"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              {(() => {
                const diff = Number(initCashPesos) - data.efectivoTotal;
                return (
                  <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
                    <span>Ajuste resultante:</span>
                    {diff === 0 ? (
                      <span className="font-bold text-slate-500 dark:text-slate-400">Sin cambios</span>
                    ) : diff > 0 ? (
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(diff)} (Ingreso de fondo)
                      </span>
                    ) : (
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(Math.abs(diff))} (Descuento de ajuste)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 2. Mercado Pago / Banco */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  2. Saldo en Mercado Pago / Banco (Pesos ARS)
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Actual en sistema: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(data.mercadoPagoTotal)}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={initMPPesos || ""}
                  onChange={(e) => setInitMPPesos(Number(e.target.value))}
                  placeholder="Ej: 5000000"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 outline-none"
                  required
                />
              </div>
              {(() => {
                const diff = Number(initMPPesos) - data.mercadoPagoTotal;
                return (
                  <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
                    <span>Ajuste resultante:</span>
                    {diff === 0 ? (
                      <span className="font-bold text-slate-500 dark:text-slate-400">Sin cambios</span>
                    ) : diff > 0 ? (
                      <span className="font-extrabold text-sky-600 dark:text-sky-400">
                        +{formatCurrency(diff)} (Ingreso de fondo digital)
                      </span>
                    ) : (
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(Math.abs(diff))} (Descuento de ajuste)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 3. Dólares Billete Físicos (USD) */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span>💵</span>
                  3. Dólares Billete Físico (US$ USD)
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Actual en sistema: <strong className="text-slate-700 dark:text-slate-200">US$ {(data.dolaresEfectivoTotal || 0).toLocaleString("es-AR")}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">US$</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={initUSD || ""}
                  onChange={(e) => setInitUSD(Number(e.target.value))}
                  placeholder="Ej: 1000"
                  className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs px-1 text-slate-500 dark:text-slate-400">
                {(() => {
                  const diff = Number(initUSD) - (data.dolaresEfectivoTotal || 0);
                  return (
                    <div>
                      <span>Ajuste en dólares: </span>
                      {diff === 0 ? (
                        <span className="font-bold text-slate-500 dark:text-slate-400">Sin cambios</span>
                      ) : diff > 0 ? (
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">
                          +US$ {diff.toLocaleString("es-AR")} (Fondo billetes)
                        </span>
                      ) : (
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">
                          -US$ {Math.abs(diff).toLocaleString("es-AR")} (Descuento)
                        </span>
                      )}
                    </div>
                  );
                })()}

                {dolarRate && initUSD > 0 && (
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    ≈ {formatCurrency(initUSD * (dolarRate.venta || 1520), "ARS")} (Dólar Blue)
                  </span>
                )}
              </div>
            </div>

            {/* Motivo o Detalle */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo del Ajuste (Opcional):
              </label>
              <input
                type="text"
                value={initReason}
                onChange={(e) => setInitReason(e.target.value)}
                placeholder="Ej: Capital inicial de caja / Arranque del negocio"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Tarjeta Resumen Total Nuevo */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md border border-indigo-900/50 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 block">
              Nuevo Capital Total Configurado
            </span>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs text-slate-300 block">Total en Pesos ARS:</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {formatCurrency(Number(initCashPesos) + Number(initMPPesos))}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({formatCurrency(initCashPesos)} efec. + {formatCurrency(initMPPesos)} MP)
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-300 block">Total en Dólares USD:</span>
                <span className="text-xl sm:text-2xl font-black text-amber-300">
                  US$ {Number(initUSD).toLocaleString("es-AR")}
                </span>
                {dolarRate && initUSD > 0 && (
                  <span className="text-[10px] text-indigo-200 block mt-0.5">
                    Valor total aprox: {formatCurrency((Number(initCashPesos) + Number(initMPPesos)) + (Number(initUSD) * dolarRate.venta), "ARS")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-6 px-4 sm:px-6 py-4 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xs flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsInitBalanceModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={initLoading}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
            >
              {initLoading ? "Actualizando..." : "Guardar y Actualizar Caja Total"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
