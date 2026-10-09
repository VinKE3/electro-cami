"use client";

import React, { useState } from "react";
import { Modal } from "./ui/modal";
import { Pagination } from "./ui/pagination";
import { createSupplier, updateSupplier, deleteSupplier } from "@/actions/suppliers";
import { formatCurrency, generateWhatsAppLink } from "@/lib/utils";
import {
  Truck,
  Plus,
  Search,
  MessageCircle,
  MapPin,
  Edit2,
  Trash2,
  Package,
} from "lucide-react";

interface SuppliersViewProps {
  initialSuppliers: any[];
}

export function SuppliersView({ initialSuppliers }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName("");
    setPhone("");
    setAddress("");
    setCategory("");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (sup: any) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setPhone(sup.phone || "");
    setAddress(sup.address || "");
    setCategory(sup.category || "");
    setNotes(sup.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, {
          name,
          phone,
          address,
          category,
          notes,
        });

        if (res.success && res.data) {
          setSuppliers(
            suppliers.map((s) => (s.id === editingSupplier.id ? { ...s, ...res.data } : s))
          );
          setIsModalOpen(false);
        } else {
          alert(res.error || "Error al actualizar");
        }
      } else {
        const res = await createSupplier({
          name,
          phone,
          address,
          category,
          notes,
        });

        if (res.success && res.data) {
          setSuppliers([{ ...res.data, productsCount: 0 }, ...suppliers]);
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
    if (!confirm("¿Deseas eliminar este proveedor?")) return;
    const res = await deleteSupplier(id);
    if (res.success) {
      setSuppliers(suppliers.filter((s) => s.id !== id));
    } else {
      alert(res.error || "Error al eliminar");
    }
  };

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Módulo de Proveedores
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Personas o distribuidoras a quienes les compras mercadería para revender.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Agregar Proveedor
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar proveedor por nombre o rubro..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </div>

      {/* LISTADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#1E293B] rounded-2xl p-12 text-center border border-[#E5E7EB] dark:border-[#334155] text-[#94A3B8]">
            <Truck className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="font-semibold text-sm text-[#1E293B] dark:text-[#F8FAFC]">No hay proveedores cargados</p>
            <p className="text-xs">Registra tus contactos de compra para recordar a quién le compraste cada artículo.</p>
          </div>
        ) : (
          paginated.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs flex flex-col justify-between gap-4 hover:border-blue-400/40 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-[#1E293B] dark:text-[#F8FAFC] text-base">
                      {s.name}
                    </h3>
                    {s.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mt-0.5 block">
                        Rubro: {s.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] rounded-lg hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {s.phone ? (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#1E293B] dark:text-[#F8FAFC] font-semibold">
                        {s.phone}
                      </span>
                      <a
                        href={generateWhatsAppLink(
                          s.phone,
                          `Hola ${s.name}! Te escribo de Electro Cami para consultar disponibilidad de mercadería.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  ) : (
                    <p className="text-[#94A3B8] italic text-[11px]">Sin teléfono</p>
                  )}

                  {s.address && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#94A3B8]" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}

                  {s.notes && (
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] bg-[#F4F6F9] dark:bg-[#0F172A] p-2 rounded-lg mt-2 border border-[#E5E7EB] dark:border-[#334155]">
                      📝 {s.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Sección de Productos provistos y costos */}
              <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#334155] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                  <span className="flex items-center gap-1 font-semibold">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    Artículos provistos:
                  </span>
                  <span className="font-extrabold text-[#1E293B] dark:text-[#F8FAFC]">
                    {s.productsCount || 0}
                  </span>
                </div>

                {s.products && s.products.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {s.products.map((p: any) => (
                      <div
                        key={p.id}
                        className="bg-[#F4F6F9] dark:bg-[#0F172A] p-2 rounded-xl text-[11px] flex justify-between items-center border border-slate-200/60 dark:border-slate-800"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC] block truncate">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                            Stock: {p.stock} u.
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-[#94A3B8] block">Costo de compra</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(parseFloat(p.costPrice || "0"), p.currency || "ARS")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#94A3B8] italic">
                    No tiene productos asignados aún.
                  </p>
                )}

                {s.phone && (
                  <a
                    href={generateWhatsAppLink(
                      s.phone,
                      `¡Hola ${s.name}! Te escribo de Electro Cami para consultar disponibilidad y precios de reposición de mercadería.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Pedir por WhatsApp</span>
                  </a>
                )}
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
        itemLabel="proveedores"
      />

      {/* MODAL PROVEEDOR */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
        description="Guarda los datos de quien te vende productos para reventa."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Nombre o Razón Social *
            </label>
            <input
              type="text"
              placeholder="Ej: Distribuidora Colchones Sur, Juan Mayorista..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-semibold outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                WhatsApp / Teléfono
              </label>
              <input
                type="text"
                placeholder="Ej: 1155443322"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Rubro o Categoría
              </label>
              <input
                type="text"
                placeholder="Ej: Colchones, Celulares..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Dirección o Local
            </label>
            <input
              type="text"
              placeholder="Ej: Av. Rivadavia 4500, Galería..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Notas u observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Hace precio llevando 3 unidades o más, entrega los miércoles..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-sm"
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
              {loading ? "Guardando..." : editingSupplier ? "Guardar Cambios" : "Guardar Proveedor"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
