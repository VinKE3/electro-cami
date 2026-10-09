"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Package,
  Wallet,
  Truck,
  ShieldCheck,
  ExternalLink,
  Store,
  LogOut,
  Calculator,
  MoreHorizontal,
  X,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/actions/auth";
import { QuotaCalculatorModal } from "./quota-calculator-modal";

const navItems = [
  { name: "Inicio", href: "/admin", icon: LayoutDashboard },
  { name: "Créditos", href: "/admin/creditos", icon: CreditCard },
  { name: "Clientes", href: "/admin/clientes", icon: Users },
  { name: "Caja", href: "/admin/caja", icon: Wallet },
  { name: "Productos", href: "/admin/productos", icon: Package },
  { name: "Proveedores", href: "/admin/proveedores", icon: Truck },
  { name: "Usuarios", href: "/admin/usuarios", icon: ShieldCheck },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#1E293B] border-r border-[#E5E7EB] dark:border-[#334155] min-h-screen p-4 sticky top-0 h-screen transition-colors duration-200">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-xl">
          ⚡
        </div>
        <div>
          <h1 className="font-bold text-base text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
            Electro Cami
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">Gestión & Cuotas</p>
        </div>
      </div>

      {/* Nav list */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-xs border border-blue-200/50 dark:border-blue-900/50"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F4F6F9] dark:hover:bg-[#283548] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-[#94A3B8]"
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer links */}
      <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#334155] space-y-2">
        <Link
          href="/catalogo"
          target="_blank"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] bg-[#F4F6F9] dark:bg-[#0F172A] hover:bg-[#E5E7EB] dark:hover:bg-[#1E293B] transition border border-[#E5E7EB] dark:border-[#334155]"
        >
          <span className="flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Ver Catálogo Público
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);

  // Cerrar el menú al cambiar de ruta
  React.useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Bloquear scroll de fondo cuando el menú está abierto
  React.useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMoreOpen]);

  const mainMobileNav = [
    { name: "Inicio", href: "/admin", icon: LayoutDashboard },
    { name: "Productos", href: "/admin/productos", icon: Package },
    { name: "Créditos", href: "/admin/creditos", icon: CreditCard },
    { name: "Caja", href: "/admin/caja", icon: Wallet },
  ];

  const isMoreActive = [
    "/admin/clientes",
    "/admin/proveedores",
    "/admin/usuarios",
  ].includes(pathname);

  const moreItems = [
    {
      name: "Clientes",
      href: "/admin/clientes",
      icon: Users,
      desc: "Compradores, saldo y WhatsApp",
      badge: "Directorio",
    },
    {
      name: "Proveedores",
      href: "/admin/proveedores",
      icon: Truck,
      desc: "Mayoristas y reposición de stock",
      badge: "Compras",
    },
    {
      name: "Usuarios y Seguridad",
      href: "/admin/usuarios",
      icon: ShieldCheck,
      desc: "Administradores y accesos",
      badge: "Seguridad",
    },
  ];

  return (
    <>
      {/* BARRA INFERIOR PRINCIPAL (5 PESTAÑAS) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#334155] px-1 py-1 flex items-center justify-between w-full max-w-full">
        {mainMobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-[9px] font-medium transition text-center ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 shrink-0 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="truncate w-full leading-tight">{item.name}</span>
            </Link>
          );
        })}

        {/* BOTÓN MÁS */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-[9px] font-medium transition text-center cursor-pointer ${
            isMoreActive || isMoreOpen
              ? "text-blue-600 dark:text-blue-400 font-bold"
              : "text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
          }`}
        >
          <MoreHorizontal
            className={`w-4 h-4 mb-0.5 shrink-0 ${
              isMoreActive || isMoreOpen ? "stroke-[2.5]" : ""
            }`}
          />
          <span className="truncate w-full leading-tight">Más</span>
        </button>
      </nav>

      {/* DRAWER / BOTTOM SHEET "MÁS OPCIONES" */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop con desenfoque */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Contenido del Sheet */}
          <div className="relative z-10 bg-white dark:bg-[#1E293B] rounded-t-3xl border-t border-[#E5E7EB] dark:border-[#334155] p-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Tirador visual */}
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-3" />

            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  ⚡
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
                    Más Opciones
                  </h3>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Herramientas y accesos adicionales
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Secciones secundarias */}
            <div className="space-y-2 mb-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                        : "bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{item.name}</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>

            {/* Accesos rápidos extra */}
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] space-y-2">
              {/* Calculadora Express */}
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  setIsCalculatorOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-left transition hover:bg-amber-100 dark:hover:bg-amber-950/50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Calculadora de Cuotas</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">
                      Simular planes de pago al instante
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500 shrink-0 ml-2" />
              </button>

              {/* Ver Catálogo Público */}
              <Link
                href="/catalogo"
                target="_blank"
                onClick={() => setIsMoreOpen(false)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 transition hover:bg-blue-100 dark:hover:bg-blue-950/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Catálogo Público</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-300">
                      Ver cómo ven los clientes la tienda
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-500 shrink-0 ml-2" />
              </Link>

              {/* Cerrar Sesión */}
              <form action={logout} className="pt-1">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calculadora desde el menú móvil */}
      <QuotaCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </>
  );
}

export function AdminHeader() {
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);

  return (
    <header className="h-16 border-b border-[#E5E7EB] dark:border-[#334155] bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200 w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-2 md:hidden min-w-0 shrink">
        <div className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
          ⚡
        </div>
        <span className="font-extrabold text-sm text-[#1E293B] dark:text-[#F8FAFC] truncate">
          Electro Cami
        </span>
      </div>

      <div className="hidden md:block">
        <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
          Panel de Control y Cobranzas
        </p>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Botón Calculadora Express */}
        <button
          type="button"
          onClick={() => setIsCalculatorOpen(true)}
          className="inline-flex items-center justify-center gap-1 p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer shadow-2xs shrink-0"
          title="Simular cuotas al instante"
        >
          <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Cuotas</span>
        </button>

        <ThemeToggle />

        <Link
          href="/catalogo"
          className="inline-flex items-center justify-center gap-1 p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition shrink-0"
          title="Ver Catálogo Público"
        >
          <Store className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="hidden sm:inline">Pública</span>
        </Link>

        <form action={logout} className="md:hidden shrink-0">
          <button
            type="submit"
            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>

      <QuotaCalculatorModal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
    </header>
  );
}
