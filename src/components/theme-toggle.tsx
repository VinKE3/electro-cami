"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-8 w-8 sm:w-18 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`group relative inline-flex items-center justify-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 ${
        isDark
          ? "bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:border-blue-400/50 hover:bg-[#283548]"
          : "bg-white border-[#E5E7EB] text-[#1E293B] hover:border-blue-500/50 hover:bg-slate-50 shadow-xs"
      } ${className}`}
      aria-label="Cambiar tema de color"
      title={isDark ? "Cambiar a Modo Claro (Blanco Hielo)" : "Cambiar a Modo Oscuro (Azul Pizarra)"}
    >
      {isDark ? (
        <>
          <Moon className="w-4 h-4 text-blue-400 stroke-[2.5]" />
          <span className="hidden sm:inline text-[11px] font-bold text-slate-200 select-none">Oscuro</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-500 stroke-[2.5]" />
          <span className="hidden sm:inline text-[11px] font-bold text-slate-700 select-none">Claro</span>
        </>
      )}
    </button>
  );
}
