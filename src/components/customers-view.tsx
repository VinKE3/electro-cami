"use client";

import React, { useState } from "react";
import { formatCurrency, generateWhatsAppLink } from "@/lib/utils";
import { Modal } from "./ui/modal";
import { Pagination } from "./ui/pagination";
import { createCustomer, updateCustomer, deleteCustomer } from "@/actions/customers";
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  MapPin,
  Edit2,
  Trash2,
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
          setCustomers([{ ...res.data, activeCreditsCount: 0, totalDebt: 0 }, ...customers]);
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

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const fullName = `${c.name} ${c.lastName || ""}`.toLowerCase();
    const phoneStr = (c.phone || "").toLowerCase();
    const matchesSearch = !q || fullName.includes(q) || phoneStr.includes(q);
    const matchesScore = filterScore === "todos" ? true : c.score === filterScore;
    return matchesSearch && matchesScore;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Directorio de Clientes / Compradores
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Administra a tus clientes, números de WhatsApp y consulta sus saldos deudores.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          + Agregar Comprador
        </button>
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
        <div className="flex items-center gap-1.5 bg-[#E5E7EB]/60 dark:bg-[#0F172A] p-1 rounded-xl self-start border border-[#E5E7EB] dark:border-[#334155] text-xs font-bold overflow-x-auto max-w-full">
          {[
            { id: "todos", label: "Todos" },
            { id: "confiable", label: "🟢 Confiables" },
            { id: "regular", label: "🟡 Al día / Nuevos" },
            { id: "moroso", label: "🔴 Morosos" },
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

      {/* GRILLA DE CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#1E293B] rounded-2xl p-12 text-center border border-[#E5E7EB] dark:border-[#334155] text-[#94A3B8]">
            <Users className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="font-semibold text-sm text-[#1E293B] dark:text-[#F8FAFC]">No se encontraron clientes</p>
            <p className="text-xs">Agrega a tus compradores para llevar un mejor control.</p>
          </div>
        ) : (
          paginated.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs flex flex-col justify-between gap-4 hover:border-blue-400/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-[#1E293B] dark:text-[#F8FAFC] text-base">
                      {c.name} {c.lastName || ""}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {/* Semáforo de Confianza */}
                      {c.score === "moroso" ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                          🔴 Moroso ({c.overdueCount} {c.overdueCount === 1 ? "vencida" : "vencidas"})
                        </span>
                      ) : c.score === "confiable" ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          🟢 Confiable
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          🟡 Al día / Nuevo
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block ${
                          c.totalDebt > 0
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        }`}
                      >
                        {c.totalDebt > 0 ? "Con crédito activo" : "Sin deuda"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] rounded-lg hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition cursor-pointer"
                      title="Editar datos"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Detalles de contacto */}
                <div className="mt-4 space-y-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {c.phone ? (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#1E293B] dark:text-[#F8FAFC] font-semibold">
                        {c.phone}
                      </span>
                      <a
                        href={generateWhatsAppLink(
                          c.phone,
                          `Hola ${c.name}! Te escribo de Electro Cami.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chatear
                      </a>
                    </div>
                  ) : (
                    <p className="text-[#94A3B8] italic text-[11px]">Sin WhatsApp</p>
                  )}

                  {c.address && (
                    <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8] text-[11px]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#94A3B8]" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}

                  {c.notes && (
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] bg-[#F4F6F9] dark:bg-[#0F172A] p-2 rounded-lg mt-2 border border-[#E5E7EB] dark:border-[#334155]">
                      📝 {c.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Saldo Activo */}
              <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-[#94A3B8] block">
                    Saldo Pendiente
                  </span>
                  <span
                    className={`text-sm font-black ${
                      c.totalDebt > 0 ? "text-[#1E293B] dark:text-[#F8FAFC]" : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {formatCurrency(c.totalDebt)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Créditos</span>
                  <span className="text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                    {c.activeCreditsCount} activos
                  </span>
                </div>
              </div>
            </div>
          ))
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
    </div>
  );
}
