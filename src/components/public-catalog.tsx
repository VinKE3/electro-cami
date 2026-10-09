"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency, generateWhatsAppLink } from "@/lib/utils";
import {
  Package,
  Search,
  MessageCircle,
  ShieldCheck,
  Truck,
  CreditCard,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Pagination } from "./ui/pagination";

interface PublicCatalogProps {
  products: any[];
  businessPhone?: string;
}

export function PublicCatalog({
  products,
  businessPhone = "5491100000000",
}: PublicCatalogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const categories = [
    "todas",
    "Colchones",
    "Celulares & Tecnología",
    "Electrodomésticos",
    "Muebles & Hogar",
    "Varios",
  ];

  const filtered = products.filter((p) => {
    if (!p.isPublished) return false;
    const matchesCat =
      selectedCategory === "todas" ? true : p.category === selectedCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] flex flex-col transition-colors duration-200">
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-xl">
              ⚡
            </div>
            <div>
              <span className="font-black text-lg sm:text-xl tracking-tight block text-[#1E293B] dark:text-[#F8FAFC]">
                Electro Cami
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block -mt-1">
                Ventas de Contado & en Cuotas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#283548] text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Panel</span> Dueño
            </Link>
          </div>
        </div>
      </header>

      {/* HERO BANNER - Paleta Nórdica Azul Pizarra & Eléctrico */}
      <section className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white py-12 px-4 sm:px-6 border-b border-[#334155]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
            ¡Comprá hoy y pagalo en cómodas cuotas!
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-[#F8FAFC]">
            Todo lo que buscás para tu hogar y tecnología
          </h1>
          <p className="text-sm sm:text-base text-[#94A3B8] max-w-2xl mx-auto font-medium">
            Colchones, celulares, televisores y electrodomésticos. Pagos semanales en efectivo o Mercado Pago.
          </p>

          {/* VENTAJAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 max-w-2xl mx-auto text-left">
            <div className="bg-white/10 dark:bg-[#1E293B]/60 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 dark:border-[#334155] flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-[#F8FAFC]">Cuotas Semanales</span>
                <span className="text-[10px] text-[#94A3B8]">Planes a tu medida</span>
              </div>
            </div>

            <div className="bg-white/10 dark:bg-[#1E293B]/60 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 dark:border-[#334155] flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-[#F8FAFC]">Atención Directa</span>
                <span className="text-[10px] text-[#94A3B8]">Trato personalizado</span>
              </div>
            </div>

            <div className="bg-white/10 dark:bg-[#1E293B]/60 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 dark:border-[#334155] flex items-center gap-3">
              <Truck className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-[#F8FAFC]">Entrega Rápida</span>
                <span className="text-[10px] text-[#94A3B8]">Envíos a convenir</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BUSCADOR Y CATEGORIAS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 w-full -mt-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 shadow-xl border border-[#E5E7EB] dark:border-[#334155] space-y-4">
          {/* Input de búsqueda */}
          <div className="relative">
            <Search className="w-5 h-5 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="¿Qué estás buscando? (Ej: Colchón 2 plazas, iPhone, Smart TV...)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden transition"
            />
          </div>

          {/* Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition capitalize cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-[#F4F6F9] dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#283548] border border-[#E5E7EB] dark:border-[#334155]"
                }`}
              >
                {cat === "todas" ? "Todos los productos" : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CATÁLOGO DE PRODUCTOS */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Catálogo Disponible ({filtered.length})
          </h2>
          <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
            Precios actualizados
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-16 text-center border border-[#E5E7EB] dark:border-[#334155] text-[#94A3B8]">
            <Package className="w-12 h-12 mx-auto opacity-40 mb-3" />
            <h3 className="font-bold text-base text-[#1E293B] dark:text-[#F8FAFC]">
              No encontramos productos en esta búsqueda
            </h3>
            <p className="text-xs mt-1">Prueba con otra palabra clave o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {paginated.map((prod) => {
              const cash = parseFloat(prod.cashPrice || "0");
              const currency = prod.currency || "ARS";
              const estimatedWeekly = Math.round((cash * 1.2) / 6);
              const stock = prod.stock ?? 1;
              const isAgotado = stock <= 0 || prod.status === "agotado";
              const isLastOne = stock === 1 && !isAgotado;

              const whatsappMessage = isAgotado
                ? `¡Hola Electro Cami! Vi en tu catálogo el producto: "${prod.name}" (${formatCurrency(
                    cash,
                    currency
                  )}). Vi que figura agotado, ¿tienen fecha estimada de reposición? ¡Gracias!`
                : `¡Hola Electro Cami! Vi en tu catálogo el producto: "${prod.name}" (${formatCurrency(
                    cash,
                    currency
                  )} contado). ¿Sigue disponible? Me gustaría consultar los planes de pago en cuotas. ¡Gracias!`;

              return (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-[#1E293B] rounded-3xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-400/50 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Imagen */}
                    <div className="h-52 bg-[#F4F6F9] dark:bg-[#0F172A] relative overflow-hidden flex items-center justify-center">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-[#94A3B8] flex flex-col items-center">
                          <Package className="w-12 h-12 mb-1" />
                          <span className="text-xs font-semibold">{prod.category}</span>
                        </div>
                      )}

                      {/* Badges de Disponibilidad y Moneda */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-xs ${
                            isAgotado
                              ? "bg-rose-600 text-white"
                              : isLastOne
                              ? "bg-amber-400 text-amber-950 font-black shadow-md ring-2 ring-amber-300"
                              : "bg-emerald-500 text-white"
                          }`}
                        >
                          {isAgotado
                            ? "🔴 Agotado"
                            : isLastOne
                            ? "⚠️ ¡Última unidad!"
                            : "🟢 Disponible"}
                        </span>

                        {currency === "USD" && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 backdrop-blur-xs">
                            💵 USD
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Información */}
                    <div className="p-4 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {prod.category}
                      </span>
                      <h3 className="font-bold text-[#1E293B] dark:text-[#F8FAFC] text-base leading-snug">
                        {prod.name}
                      </h3>
                      {prod.description && (
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2">
                          {prod.description}
                        </p>
                      )}

                      {/* Caja de Precios */}
                      <div className="bg-[#F4F6F9] dark:bg-[#0F172A] p-3 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] space-y-1 mt-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">
                            Precio Contado:
                          </span>
                          <span className="text-lg font-black text-[#1E293B] dark:text-[#F8FAFC]">
                            {formatCurrency(cash, currency)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-[#E5E7EB] dark:border-[#334155] text-xs">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                            O en cuotas:
                          </span>
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            Desde 6x {formatCurrency(estimatedWeekly, currency)}/sem.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción WhatsApp */}
                  <div className="p-4 pt-0 space-y-2">
                    {isAgotado ? (
                      <a
                        href={generateWhatsAppLink(businessPhone, whatsappMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white font-bold text-xs bg-slate-700 hover:bg-slate-800 shadow-md shadow-slate-700/20 active:scale-95 transition"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        Consultar próxima llegada
                      </a>
                    ) : (
                      <>
                        <a
                          href={generateWhatsAppLink(
                            businessPhone,
                            `¡Hola Electro Cami! 👋 Estoy interesado/a en financiar en cuotas: *${prod.name}* (${formatCurrency(
                              cash,
                              currency
                            )} contado).\n\n¿Qué planes de cuotas semanales o quincenales tienen disponibles? ¡Muchas gracias!`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition"
                        >
                          <MessageCircle className="w-4 h-4 fill-white" />
                          Consultar Financiación en Cuotas
                        </a>

                        <a
                          href={generateWhatsAppLink(
                            businessPhone,
                            `¡Hola Electro Cami! 👋 Quisiera consultar para comprar de contado: *${prod.name}* por ${formatCurrency(
                              cash,
                              currency
                            )}. ¿Tienen entrega inmediata? ¡Gracias!`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition"
                        >
                          <span>Consultar Compra de Contado</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 15, 25]}
            itemLabel="productos"
          />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-[#1E293B] border-t border-[#E5E7EB] dark:border-[#334155] py-8 px-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8] space-y-2">
        <p className="font-bold text-[#1E293B] dark:text-[#F8FAFC]">
          Electro Cami • Tu negocio de confianza en compras y cuotas
        </p>
        <p>Aceptamos Efectivo en mano y Mercado Pago / Transferencias.</p>
      </footer>
    </div>
  );
}
