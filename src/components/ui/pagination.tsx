"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string; // e.g. "productos", "clientes", "cuotas", "movimientos"
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25],
  itemLabel = "elementos",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with intelligent ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];
    if (safeCurrentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (safeCurrentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#334155] text-xs">
      {/* Información de cantidad y selector de 10 en 10 o 15 en 15 */}
      <div className="flex flex-wrap items-center gap-3 text-[#64748B] dark:text-[#94A3B8]">
        <span>
          Mostrando <strong className="text-[#1E293B] dark:text-[#F8FAFC]">{startItem}</strong> -{" "}
          <strong className="text-[#1E293B] dark:text-[#F8FAFC]">{endItem}</strong> de{" "}
          <strong className="text-[#1E293B] dark:text-[#F8FAFC]">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-1.5 pl-2 sm:border-l border-[#E5E7EB] dark:border-[#334155]">
            <span className="text-[11px] font-medium">Ver de a:</span>
            <div className="inline-flex rounded-lg bg-[#E5E7EB]/60 dark:bg-[#0F172A] p-0.5 border border-[#E5E7EB] dark:border-[#334155]">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(opt);
                    onPageChange(1);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    pageSize === opt
                      ? "bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botones de navegación de páginas (si hay más de 1 página) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-center sm:self-auto">
          {/* Botón Anterior */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] font-semibold text-xs hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Números de página */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="px-1 text-[#94A3B8]">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p as number)}
                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                    safeCurrentPage === p
                      ? "bg-blue-600 dark:bg-blue-500 text-white shadow-xs"
                      : "border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A]"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Botón Siguiente */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] font-semibold text-xs hover:bg-[#F4F6F9] dark:hover:bg-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
