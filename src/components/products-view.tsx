"use client";

import React, { useState } from "react";
import { formatCurrency, generateWhatsAppLink } from "@/lib/utils";
import { Modal } from "./ui/modal";
import { Pagination } from "./ui/pagination";
import { ImageUpload } from "./ui/image-upload";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  adjustProductStock,
} from "@/actions/products";
import { createCashMovement } from "@/actions/cash";
import {
  Package,
  Plus,
  Minus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  MessageCircle,
  Copy,
  Banknote,
  CreditCard,
  ShoppingBag,
} from "lucide-react";

interface ProductsViewProps {
  initialProducts: any[];
  suppliers: any[];
}

export function ProductsView({ initialProducts, suppliers }: ProductsViewProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("todas");
  const [filterStock, setFilterStock] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Colchones");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [stock, setStock] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [cashPrice, setCashPrice] = useState<number>(0);
  const [installmentPrice, setInstallmentPrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("disponible");
  const [isPublished, setIsPublished] = useState(true);
  const [supplierId, setSupplierId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Estados para deducción de caja al crear producto nuevo
  const [deductFromCash, setDeductFromCash] = useState(false);
  const [cashPaymentMethod, setCashPaymentMethod] = useState<"efectivo" | "mercado_pago">("efectivo");

  // Estados para Modal de Comprar / Reponer Stock
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseProduct, setPurchaseProduct] = useState<any>(null);
  const [purchaseUnits, setPurchaseUnits] = useState<number>(1);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState<number>(0);
  const [purchaseMethod, setPurchaseMethod] = useState<"efectivo" | "mercado_pago" | "no_descontar">("efectivo");
  const [updateProductCostPrice, setUpdateProductCostPrice] = useState<boolean>(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  React.useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const categories = [
    "Colchones",
    "Celulares & Tecnología",
    "Electrodomésticos",
    "Muebles & Hogar",
    "Herramientas",
    "Varios",
  ];

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setCategory("Colchones");
    setCurrency("ARS");
    setStock(1);
    setCostPrice(0);
    setCashPrice(0);
    setInstallmentPrice(0);
    setImageUrl("");
    setStatus("disponible");
    setIsPublished(true);
    setSupplierId("");
    setDeductFromCash(false);
    setCashPaymentMethod("efectivo");
    setIsModalOpen(true);
  };

  const openEditModal = (prod: any) => {
    setEditingProduct(prod);
    setName(prod.name);
    setDescription(prod.description || "");
    setCategory(prod.category);
    setCurrency(prod.currency || "ARS");
    setStock(prod.stock !== undefined ? Number(prod.stock) : 1);
    setCostPrice(parseFloat(prod.costPrice || "0"));
    setCashPrice(parseFloat(prod.cashPrice || "0"));
    setInstallmentPrice(parseFloat(prod.installmentPrice || "0"));
    setImageUrl(prod.imageUrl || "");
    setStatus(prod.status);
    setIsPublished(prod.isPublished);
    setSupplierId(prod.supplierId ? prod.supplierId.toString() : "");
    setIsModalOpen(true);
  };

  const openPurchaseModal = (prod: any) => {
    setPurchaseProduct(prod);
    setPurchaseUnits(1);
    setPurchaseUnitCost(parseFloat(prod.costPrice || "0"));
    setPurchaseMethod("efectivo");
    setUpdateProductCostPrice(true);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseProduct || purchaseUnits <= 0) return;

    setPurchaseLoading(true);
    try {
      const totalAmount = Math.round(purchaseUnitCost * purchaseUnits);

      if (purchaseMethod === "no_descontar") {
        // Solo incrementa stock sin tocar caja
        const res = await adjustProductStock(purchaseProduct.id, purchaseUnits);
        if (res.success && res.data) {
          if (updateProductCostPrice && purchaseUnitCost > 0) {
            await updateProduct(purchaseProduct.id, {
              name: purchaseProduct.name,
              category: purchaseProduct.category,
              costPrice: purchaseUnitCost,
              cashPrice: parseFloat(purchaseProduct.cashPrice || "0"),
              stock: res.data.stock,
            });
          }
          setProducts((prev) =>
            prev.map((p) =>
              p.id === purchaseProduct.id
                ? {
                    ...p,
                    stock: res.data.stock,
                    status: res.data.status,
                    costPrice: updateProductCostPrice && purchaseUnitCost > 0 ? purchaseUnitCost.toString() : p.costPrice,
                  }
                : p
            )
          );
          setIsPurchaseModalOpen(false);
        } else {
          alert(res.error || "No se pudo actualizar el stock");
        }
      } else {
        // Descuenta de caja (efectivo o mercado_pago)
        const res = await createCashMovement({
          type: "egreso",
          category: "compra_mercaderia",
          amount: totalAmount,
          currency: (purchaseProduct.currency as "ARS" | "USD") || "ARS",
          paymentMethod: purchaseMethod,
          productId: purchaseProduct.id,
          units: purchaseUnits,
          updateCostPrice: updateProductCostPrice,
          description: `Compra de stock: ${purchaseUnits} u. de ${purchaseProduct.name}`,
        });

        if (res.success) {
          const newStock = (purchaseProduct.stock || 0) + purchaseUnits;
          setProducts((prev) =>
            prev.map((p) =>
              p.id === purchaseProduct.id
                ? {
                    ...p,
                    stock: newStock,
                    status: newStock > 0 ? "disponible" : p.status,
                    costPrice: updateProductCostPrice && purchaseUnitCost > 0 ? purchaseUnitCost.toString() : p.costPrice,
                  }
                : p
            )
          );
          setIsPurchaseModalOpen(false);
        } else {
          alert(res.error || "Error al registrar la compra en caja");
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, {
          name,
          description,
          category,
          currency,
          stock: Number(stock),
          costPrice: Number(costPrice),
          cashPrice: Number(cashPrice),
          installmentPrice: installmentPrice ? Number(installmentPrice) : undefined,
          imageUrl,
          status,
          isPublished,
          supplierId: supplierId ? Number(supplierId) : null,
        });

        if (res.success && res.data) {
          setProducts(
            products.map((p) => (p.id === editingProduct.id ? { ...p, ...res.data } : p))
          );
          setIsModalOpen(false);
        } else {
          alert(res.error || "Error al actualizar");
        }
      } else {
        const res = await createProduct({
          name,
          description,
          category,
          currency,
          stock: Number(stock),
          costPrice: Number(costPrice),
          cashPrice: Number(cashPrice),
          installmentPrice: installmentPrice ? Number(installmentPrice) : undefined,
          imageUrl,
          status,
          isPublished,
          supplierId: supplierId ? Number(supplierId) : null,
          deductFromCash,
          paymentMethod: cashPaymentMethod,
        });

        if (res.success && res.data) {
          setProducts([res.data, ...products]);
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
    if (!confirm("¿Deseas eliminar este producto?")) return;
    const res = await deleteProduct(id);
    if (res.success) {
      setProducts(products.filter((p) => p.id !== id));
    } else {
      alert(res.error || "Error al eliminar");
    }
  };

  const urgentCount = products.filter((p) => Number(p.stock) <= 1).length;
  const agotadosCount = products.filter((p) => Number(p.stock) <= 0).length;

  const filtered = products.filter((p) => {
    const matchesCat = filterCategory === "todas" ? true : p.category === filterCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const pStock = Number(p.stock);
    const matchesStock =
      filterStock === "todos"
        ? true
        : filterStock === "urgente"
        ? pStock <= 1
        : filterStock === "agotados"
        ? pStock <= 0
        : pStock > 1;
    return matchesCat && matchesSearch && matchesStock;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Inventario & Productos
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Administra los artículos en stock, costos de compra, precios de contado y en cuotas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Agregar Producto
        </button>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium self-start outline-hidden"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* PESTAÑAS DE NIVEL DE STOCK / REPOSICIÓN URGENTE */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs font-bold">
          {[
            { id: "todos", label: "Todos los productos" },
            { id: "urgente", label: `⚠️ Reposición Urgente (${urgentCount})`, highlight: urgentCount > 0 },
            { id: "agotados", label: `🔴 Agotados (${agotadosCount})` },
            { id: "con_stock", label: "🟢 En Stock" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilterStock(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                filterStock === tab.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                  : tab.highlight
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : "bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#1E293B] rounded-2xl p-12 text-center border border-[#E5E7EB] dark:border-[#334155] text-[#94A3B8]">
            <Package className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="font-semibold text-sm text-[#1E293B] dark:text-[#F8FAFC]">No se encontraron productos</p>
            <p className="text-xs">Comienza cargando un producto para tenerlo en stock.</p>
          </div>
        ) : (
          paginated.map((prod) => {
            const cost = parseFloat(prod.costPrice || "0");
            const cash = parseFloat(prod.cashPrice || "0");
            const profit = cash - cost;

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden shadow-xs hover:border-blue-400/40 transition flex flex-col justify-between"
              >
                <div>
                  {/* Imagen o Placeholder estilizado */}
                  <div className="h-44 bg-[#F4F6F9] dark:bg-[#0F172A] relative overflow-hidden flex items-center justify-center">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-[#94A3B8] flex flex-col items-center">
                        <Package className="w-10 h-10 mb-1" />
                        <span className="text-[11px] font-semibold">{prod.category}</span>
                      </div>
                    )}

                    {/* Badge Estado & Stock */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                      {prod.stock <= 0 ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-xs bg-rose-600 text-white flex items-center gap-1">
                          🔴 Agotado (0)
                        </span>
                      ) : prod.stock === 1 ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-xs bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          ¡Última Unidad! (1)
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-xs bg-emerald-600 text-white">
                          🟢 Stock: {prod.stock} u.
                        </span>
                      )}

                      {prod.currency === "USD" && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs bg-sky-600 text-white">
                          🇺🇸 Dólares (USD)
                        </span>
                      )}
                    </div>

                    {/* Badge Visible en Web */}
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-xs p-1.5 rounded-xl shadow-xs border border-[#E5E7EB] dark:border-[#334155]">
                      {prod.isPublished ? (
                        <span title="Visible en catálogo público">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                        </span>
                      ) : (
                        <span title="Oculto del catálogo público">
                          <EyeOff className="w-3.5 h-3.5 text-[#94A3B8]" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {prod.category}
                      </span>
                      <h3 className="font-bold text-[#1E293B] dark:text-[#F8FAFC] text-base leading-tight mt-0.5">
                        {prod.name}
                      </h3>
                      {prod.description && (
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 mt-1">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    {/* Precios */}
                    <div className="bg-[#F4F6F9] dark:bg-[#0F172A] p-2.5 rounded-xl space-y-1 text-xs border border-[#E5E7EB] dark:border-[#334155]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B] dark:text-[#94A3B8] text-[11px]">
                          Precio Contado {prod.currency === "USD" ? "(USD)" : "($)"}:
                        </span>
                        <span className="font-extrabold text-[#1E293B] dark:text-[#F8FAFC] text-sm">
                          {formatCurrency(cash, prod.currency || "ARS")}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#94A3B8]">Costo de compra:</span>
                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                          {formatCurrency(cost, prod.currency || "ARS")}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#E5E7EB] dark:border-[#334155]">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">Ganancia estimada:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          +{formatCurrency(profit, prod.currency || "ARS")}
                        </span>
                      </div>
                    </div>

                    {/* Alerta y Botón de Pedido a Proveedor si stock <= 1 */}
                    {prod.stock <= 1 && (
                      <div className="pt-2">
                        {prod.supplier && prod.supplier.phone ? (
                          <a
                            href={generateWhatsAppLink(
                              prod.supplier.phone,
                              `¡Hola ${prod.supplier.name}! Te escribo de Electro Cami para consultar disponibilidad y precio de reposición de: "${prod.name}". ¿Tenés stock para enviar? ¡Muchas gracias!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition"
                            title="Pedir reposición a proveedor vía WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Pedir a {prod.supplier.name}</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const text = `¡Hola! Te escribo de Electro Cami para consultar stock y precio de reposición de: "${prod.name}".`;
                              navigator.clipboard.writeText(text);
                              alert("¡Texto de pedido copiado al portapapeles!");
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar texto de reposición</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Acciones */}
                <div className="p-4 pt-0 flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#94A3B8]">
                      {prod.supplier ? `Prov: ${prod.supplier.name}` : "Sin prov."}
                    </span>
                    <button
                      type="button"
                      onClick={() => openPurchaseModal(prod)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      title="Registrar compra o reposición de stock para este producto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Comprar Stock</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-1.5 text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] rounded-lg hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] transition cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id)}
                      className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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
        itemLabel="productos"
      />

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        description="Ingresa los datos para inventario, stock y publicación."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Moneda y Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#F4F6F9] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                Moneda del Producto
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrency("ARS")}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    currency === "ARS"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8]"
                  }`}
                >
                  🇦🇷 Pesos ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    currency === "USD"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8]"
                  }`}
                >
                  🇺🇸 Dólares (USD)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                Stock / Unidades Disponibles *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStock(Math.max(0, Number(stock) - 1))}
                  className="p-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#1E293B] dark:text-[#F8FAFC] hover:bg-slate-100 transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
                  required
                  className="w-16 text-center py-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] font-black text-sm text-[#1E293B] dark:text-[#F8FAFC]"
                />
                <button
                  type="button"
                  onClick={() => setStock(Number(stock) + 1)}
                  className="p-1.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#1E293B] dark:text-[#F8FAFC] hover:bg-slate-100 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {stock === 1 ? "⚠️ Última u." : stock === 0 ? "🔴 Agotado" : "🟢 Disp."}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              placeholder={currency === "USD" ? "Ej: iPhone 15 Pro 128GB Titán" : "Ej: Colchón Sommier King 2x2"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-semibold outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Proveedor
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs"
              >
                <option value="">-- Sin proveedor asignado --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Costo de Compra ({currency === "USD" ? "US$" : "$"})
              </label>
              <input
                type="number"
                min="0"
                value={costPrice || ""}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Precio de Contado ({currency === "USD" ? "US$" : "$"}) *
              </label>
              <input
                type="number"
                min="0"
                value={cashPrice || ""}
                onChange={(e) => setCashPrice(Number(e.target.value))}
                required
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-bold text-blue-600 dark:text-blue-400"
              />
            </div>
          </div>

          <ImageUpload
            value={imageUrl}
            onChange={(url) => setImageUrl(url)}
          />

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Descripción detallada (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Estado del producto, características, garantía..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs"
            />
          </div>

          {/* Opciones de Estado y Visibilidad */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Estado de Stock
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-bold capitalize"
              >
                <option value="disponible">🟢 Disponible</option>
                <option value="reservado">🟡 Reservado</option>
                <option value="vendido">⚪ Vendido</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="isPublished" className="text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] cursor-pointer">
                Mostrar en catálogo público
              </label>
            </div>
          </div>

          {/* Deducción en caja si es un producto nuevo */}
          {!editingProduct && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏦</span>
                  <label htmlFor="deductFromCash" className="text-xs font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer">
                    ¿Esta compra se pagó con dinero de la caja de hoy?
                  </label>
                </div>
                <input
                  type="checkbox"
                  id="deductFromCash"
                  checked={deductFromCash}
                  onChange={(e) => setDeductFromCash(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {deductFromCash ? (
                <div className="pt-2 border-t border-indigo-200/80 dark:border-indigo-900/60 space-y-2 animate-fade-in">
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                    Se registrará automáticamente la salida de dinero en tu caja para que los billetes de tu bolsillo coincidan:
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Medio de pago:</span>
                      <select
                        value={cashPaymentMethod}
                        onChange={(e) => setCashPaymentMethod(e.target.value as "efectivo" | "mercado_pago")}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      >
                        <option value="efectivo">💵 Efectivo Físico</option>
                        <option value="mercado_pago">💳 Mercado Pago / Banco</option>
                      </select>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total a descontar:</span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                        -{formatCurrency(Number(costPrice) * Number(stock), currency || "ARS")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  💡 Dejar desmarcado si es mercadería que ya tenías guardada de antes o si la compraste a crédito del proveedor (no afectará la caja de hoy).
                </p>
              )}
            </div>
          )}

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
              {loading ? "Guardando..." : editingProduct ? "Guardar Cambios" : "Guardar Producto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE COMPRAR / REPONER STOCK */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title={purchaseProduct ? `📦 Comprar / Reponer Stock: ${purchaseProduct.name}` : "Comprar Stock"}
        description="Ingresa las unidades compradas y decide si la plata se descuenta de tu caja de hoy o si ya fue pagada."
        maxWidth="md"
      >
        {purchaseProduct && (
          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            {/* Resumen del producto */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                  Producto seleccionado
                </span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                  {purchaseProduct.name}
                </span>
                <span className="text-xs text-slate-500">
                  Stock actual: <strong className="text-blue-600 dark:text-blue-400">{purchaseProduct.stock} unidades</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Precio venta:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(parseFloat(purchaseProduct.cashPrice || "0"), purchaseProduct.currency || "ARS")}
                </span>
              </div>
            </div>

            {/* Unidades y Costo Unitario */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Unidades a Comprar *
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPurchaseUnits(Math.max(1, purchaseUnits - 1))}
                    className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={purchaseUnits}
                    onChange={(e) => setPurchaseUnits(Math.max(1, Number(e.target.value)))}
                    required
                    className="w-full text-center py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setPurchaseUnits(purchaseUnits + 1)}
                    className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Costo Unitario ({purchaseProduct.currency === "USD" ? "US$" : "$"})
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={purchaseUnitCost || ""}
                  onChange={(e) => setPurchaseUnitCost(Number(e.target.value))}
                  required
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Total a pagar */}
            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-950 dark:text-indigo-200">
                Inversión Total ({purchaseUnits} u. × {formatCurrency(purchaseUnitCost, purchaseProduct.currency || "ARS")}):
              </span>
              <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                {formatCurrency(purchaseUnits * purchaseUnitCost, purchaseProduct.currency || "ARS")}
              </span>
            </div>

            {/* ¿Cómo se pagó esta compra? */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                ¿Cómo pagaste esta mercadería?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPurchaseMethod("efectivo")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    purchaseMethod === "efectivo"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>💵 Efectivo en Mano</span>
                  <span className="text-[10px] font-normal opacity-80">(Resta billetes)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseMethod("mercado_pago")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    purchaseMethod === "mercado_pago"
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <span>💳 Mercado Pago</span>
                  <span className="text-[10px] font-normal opacity-80">(Resta digital)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseMethod("no_descontar")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    purchaseMethod === "no_descontar"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span className="text-base">🚫</span>
                  <span>No descontar hoy</span>
                  <span className="text-[10px] font-normal opacity-80">(Ya pagado / Fiado)</span>
                </button>
              </div>

              {purchaseMethod === "no_descontar" ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                  ℹ️ Solo se sumarán las {purchaseUnits} unidades al stock del producto. Tu caja de dinero no se modificará.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                  ✅ Se descontarán {formatCurrency(purchaseUnits * purchaseUnitCost, purchaseProduct.currency || "ARS")} de tu caja ({purchaseMethod === "efectivo" ? "Efectivo Físico" : "Mercado Pago"}) y se sumarán {purchaseUnits} unidades al stock.
                </p>
              )}
            </div>

            {/* Checkbox actualizar costo */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="updateCost"
                checked={updateProductCostPrice}
                onChange={(e) => setUpdateProductCostPrice(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="updateCost" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Actualizar precio de costo del producto a este nuevo valor ({formatCurrency(purchaseUnitCost, purchaseProduct.currency || "ARS")})
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-6 px-4 sm:px-6 py-4 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xs flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={purchaseLoading}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
              >
                {purchaseLoading ? "Guardando..." : "Confirmar Compra & Actualizar Stock"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
