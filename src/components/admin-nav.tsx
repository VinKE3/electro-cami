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

  const mobileNav = [
    { name: "Inicio", href: "/admin", icon: LayoutDashboard },
    { name: "Créditos", href: "/admin/creditos", icon: CreditCard },
    { name: "Caja", href: "/admin/caja", icon: Wallet },
    { name: "Clientes", href: "/admin/clientes", icon: Users },
    { name: "Usuarios", href: "/admin/usuarios", icon: ShieldCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#334155] px-1 py-1 flex items-center justify-between w-full max-w-full">
      {mobileNav.map((item) => {
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
    </nav>
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
