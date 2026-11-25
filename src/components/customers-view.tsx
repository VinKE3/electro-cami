"use client";

import React, { useState } from "react";
import { formatCurrency, generateWhatsAppLink, getArgentinaTodayStr } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { Modal } from "./ui/modal";
import { Pagination } from "./ui/pagination";
import { CustomerHistoryModal } from "./customer-history-modal";
import { createCustomer, updateCustomer, deleteCustomer } from "@/actions/customers";
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  MapPin,
  Edit2,
  Trash2,
  Download,
  History,
} from "lucide-react";

interface CustomersViewProps {
  initialCustomers: any[];
}

export function CustomersView({ initialCustomers }: CustomersViewProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [filterScore, setFilterScore] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [historyCustomer, setHistoryCustomer] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName("");
    setLastName("");
    setPhone("");
    setAddress("");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (cust: any) => {
    setEditingCustomer(cust);
    setName(cust.name || "");
    setLastName(cust.lastName || "");
    setPhone(cust.phone || "");
    setAddress(cust.address || "");
    setNotes(cust.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, {
          name,
          lastName,
          phone,
          address,
          notes,
        });
        if (res.success && res.data) {
          setCustomers(
            customers.map((c) => (c.id === editingCustomer.id ? { ...c, ...res.data } : c))
          );
          setIsModalOpen(false);
        } else {
          alert(res.error || "Error al actualizar");
        }
      } else {
        const res = await createCustomer({
          name,
          lastName,
          phone,
          address,
          notes,
        });
        if (res.success && res.data) {
          setCustomers([
            { ...res.data, activeCreditsCount: 0, totalDebt: 0, totalDebtArs: 0, totalDebtUsd: 0 },
            ...customers,
          ]);
          setIsModalOpen(false);
        } else {
          alert(res.error || "Error al crear");
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este comprador?")) return;
    const res = await deleteCustomer(id);
    if (res.success) {
      setCustomers(customers.filter((c) => c.id !== id));
    } else {
      alert(res.error || "No se pudo eliminar el comprador.");
    }
  };

  const scoreCounts = React.useMemo(() => {
    let confiable = 0;
    let regular = 0;
    let moroso = 0;
    for (const c of customers) {
      if (c.score === "confiable") confiable++;
      else if (c.score === "moroso") moroso++;
      else regular++;
    }
    return {
      todos: customers.length,
      confiable,
      regular,
      moroso,
    };
  }, [customers]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const fullName = `${c.name} ${c.lastName || ""}`.toLowerCase();
    const phoneStr = (c.phone || "").toLowerCase();
    const matchesSearch = !q || fullName.includes(q) || phoneStr.includes(q);
    const matchesScore = filterScore === "todos" ? true : c.score === filterScore;
    return matchesSearch && matchesScore;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCsv = () => {
    const headers = [
      "Nombre",
      "Apellido",
      "Teléfono",
      "Dirección",
      "Estado",
      "Créditos Activos",
      "Deuda ARS",
      "Deuda USD",
      "Cuotas Vencidas",
    ];
    const rows = filtered.map((c) => [
      c.name,
      c.lastName || "",
      c.phone || "",
      c.address || "",
      c.scoreLabel || c.score || "",
      c.activeCreditsCount ?? 0,
      c.totalDebtArs ?? c.totalDebt ?? 0,
      c.totalDebtUsd ?? 0,
      c.overdueCount ?? 0,
    ]);
    downloadCsv(`clientes-${getArgentinaTodayStr()}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Directorio de Clientes / Compradores
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Administra tus clientes, consulta saldos y haz clic en cualquier fila para ver su historial completo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1E293B] hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#334155] font-bold text-xs shadow-xs disabled:opacity-50 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Agregar Comprador
          </button>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS POR CONFIANZA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar comprador por nombre o WhatsApp..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        {/* Semáforo de Pagador Pills */}
        <div className="flex items-center gap-1.5 bg-[#E5E7EB]/60 dark:bg-[#0F172A] p-1 rounded-xl self-start border border-[#E5E7EB] dark:border-[#334155] text-xs font-bold overflow-x-auto max-w-full scrollbar-none">
          {[
            { id: "todos", label: `Todos (${scoreCounts.todos})` },
            { id: "confiable", label: `🟢 Confiables (${scoreCounts.confiable})` },
            { id: "regular", label: `🟡 Al día / Nuevos (${scoreCounts.regular})` },
            { id: "moroso", label: `🔴 Morosos (${scoreCounts.moroso})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterScore(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                filterScore === tab.id
                  ? "bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] shadow-xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8]">
            <Users className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="font-semibold text-sm text-[#1E293B] dark:text-[#F8FAFC]">
              No se encontraron clientes
            </p>
            <p className="text-xs">
              Agrega a tus compradores para llevar un mejor control.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F6F9] dark:bg-[#0F172A] border-b border-[#E5E7EB] dark:border-[#334155]">
                <tr className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] tracking-wider">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">WhatsApp</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Créditos</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                {paginated.map((c) => {
                  const debtArs = c.totalDebtArs ?? c.totalDebt ?? 0;
                  const debtUsd = c.totalDebtUsd ?? 0;
                  const hasDebt = debtArs > 0 || debtUsd > 0;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setHistoryCustomer(c)}
                      className="hover:bg-[#F4F6F9]/70 dark:hover:bg-[#0F172A]/50 transition cursor-pointer"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <div className="font-bold text-sm text-[#1E293B] dark:text-[#F8FAFC]">
                          {c.name} {c.lastName || ""}
                        </div>
                        {c.address && (
                          <div className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-[#94A3B8]" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        )}
                        {c.notes && (
                          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                            📝 {c.notes}
                          </p>
                        )}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                              {c.phone}
                            </span>
                            <a
                              href={generateWhatsAppLink(
                                c.phone,
                                `Hola ${c.name}! Te escribo de Electro Cami.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              Chatear
                            </a>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] italic text-[11px]">
                            Sin WhatsApp
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.score === "moroso" ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              🔴 Moroso ({c.overdueCount}{" "}
                              {c.overdueCount === 1 ? "vencida" : "vencidas"})
                            </span>
                          ) : c.score === "confiable" ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              🟢 Confiable
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              🟡 Al día / Nuevo
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              hasDebt
                                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            }`}
                          >
                            {hasDebt ? "Con crédito" : "Sin deuda"}
                          </span>
                        </div>
                      </td>

                      {/* Créditos */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#64748B] dark:text-[#94A3B8]">
                        <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                          {c.activeCreditsCount ?? 0} activos
                        </span>
                        {(c.completedCreditsCount ?? 0) > 0 && (
                          <span className="block text-[10px]">
                            {c.completedCreditsCount} finalizados
                          </span>
                        )}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {debtArs > 0 && debtUsd > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-sm font-black text-[#1E293B] dark:text-[#F8FAFC] block">
                              {formatCurrency(debtArs, "ARS")}
                            </span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                              + {formatCurrency(debtUsd, "USD")}
                            </span>
                          </div>
                        ) : debtUsd > 0 ? (
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(debtUsd, "USD")}
                          </span>
                        ) : (
                          <span
                            className={`text-sm font-black ${
                              debtArs > 0
                                ? "text-[#1E293B] dark:text-[#F8FAFC]"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {formatCurrency(debtArs, "ARS")}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setHistoryCustomer(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                            title="Ver historial completo"
                          >
                            <History className="w-3.5 h-3.5" />
                            Historial
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] rounded-lg hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition cursor-pointer"
                            title="Editar datos"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 15, 25]}
        itemLabel="clientes"
      />

      {/* MODAL CREAR / EDITAR CLIENTE */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? "Editar Comprador" : "Nuevo Comprador / Cliente"}
        description="El nombre es obligatorio. Los demás campos como WhatsApp o dirección son opcionales."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Nombre *
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Apellido (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Gómez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              WhatsApp / Teléfono (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: 1123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Permite abrir conversaciones y enviar recordatorios de cuotas con 1 clic.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Dirección de entrega / domicilio (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Calle San Martín 1234, Barrio Norte"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Notas adicionales (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Paga puntual los sábados por la tarde, conocido de Juan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
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
              disabled={loading || !name.trim()}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Guardando..." : editingCustomer ? "Guardar Cambios" : "Crear Comprador"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL HISTORIAL COMPLETO DEL CLIENTE */}
      <CustomerHistoryModal
        isOpen={Boolean(historyCustomer)}
        onClose={() => setHistoryCustomer(null)}
        customerSummary={historyCustomer}
      />
    </div>
  );
}
