"use client";

import React, { useState } from "react";
import { Modal } from "./ui/modal";
import { CategoryItem, createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onCategoriesChange: (updated: CategoryItem[]) => void;
}

export function CategoriesModal({
  isOpen,
  onClose,
  categories,
  onCategoriesChange,
}: CategoriesModalProps) {
  // Nueva categoría principal
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Subcategoría en creación (guardamos el parentId)
  const [activeSubParentId, setActiveSubParentId] = useState<number | null>(null);
  const [newSubName, setNewSubName] = useState("");

  // Edición de nombre
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  // Categorías expandidas en acordeón
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpandedCats((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsCreatingCat(true);
    try {
      const res = await createCategory({ name: newCatName.trim() });
      if (res.success && res.data) {
        const newCat: CategoryItem = {
          id: res.data.id,
          name: res.data.name,
          parentId: null,
          order: res.data.order || 0,
          subcategories: [],
        };
        const updated = [...categories, newCat];
        onCategoriesChange(updated);
        setNewCatName("");
        // Auto-expandir la nueva categoría
        setExpandedCats((prev) => ({ ...prev, [newCat.id]: true }));
      } else {
        alert(res.error || "No se pudo crear la categoría");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleCreateSubcategory = async (parentId: number) => {
    if (!newSubName.trim()) return;

    try {
      const res = await createCategory({
        name: newSubName.trim(),
        parentId,
      });

      if (res.success && res.data) {
        const updated = categories.map((cat) => {
          if (cat.id === parentId) {
            return {
              ...cat,
              subcategories: [
                ...cat.subcategories,
                {
                  id: res.data.id,
                  name: res.data.name,
                  parentId,
                  order: res.data.order || 0,
                },
              ],
            };
          }
          return cat;
        });
        onCategoriesChange(updated);
        setNewSubName("");
        setActiveSubParentId(null);
      } else {
        alert(res.error || "No se pudo crear la subcategoría");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleStartEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (id: number, isSub: boolean, parentId?: number) => {
    if (!editingName.trim()) return;

    try {
      const res = await updateCategory(id, editingName.trim());
      if (res.success) {
        const updated = categories.map((cat) => {
          if (!isSub && cat.id === id) {
            return { ...cat, name: editingName.trim() };
          }
          if (isSub && cat.id === parentId) {
            return {
              ...cat,
              subcategories: cat.subcategories.map((sub) =>
                sub.id === id ? { ...sub, name: editingName.trim() } : sub
              ),
            };
          }
          return cat;
        });
        onCategoriesChange(updated);
        setEditingId(null);
        setEditingName("");
      } else {
        alert(res.error || "No se pudo actualizar");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id: number, isSub: boolean, parentId?: number) => {
    const msg = isSub
      ? "¿Eliminar esta subcategoría?"
      : "¿Eliminar esta categoría principal y todas sus subcategorías?";
    if (!confirm(msg)) return;

    try {
      const res = await deleteCategory(id);
      if (res.success) {
        let updated: CategoryItem[];
        if (!isSub) {
          updated = categories.filter((c) => c.id !== id);
        } else {
          updated = categories.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                subcategories: c.subcategories.filter((s) => s.id !== id),
              };
            }
            return c;
          });
        }
        onCategoriesChange(updated);
      } else {
        alert(res.error || "No se pudo eliminar");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Categorías y Subcategorías"
      description="Organiza tus productos por rubro y tipo para encontrarlos rápido en la web y el inventario."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* FORMULARIO AGREGAR CATEGORÍA PRINCIPAL */}
        <form
          onSubmit={handleCreateCategory}
          className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row gap-2"
        >
          <div className="flex-1 relative">
            <Tag className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nueva Categoría (Ej: Motos, Indumentaria, Rodados...)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#1E293B] text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] placeholder:font-normal outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingCat || !newCatName.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Categoría</span>
          </button>
        </form>

        {/* LISTADO DE CATEGORÍAS */}
        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No hay categorías creadas aún.</p>
            </div>
          ) : (
            categories.map((cat) => {
              const isExpanded = expandedCats[cat.id] ?? true;
              const isEditingThis = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] overflow-hidden shadow-2xs"
                >
                  {/* Encabezado Categoría Principal */}
                  <div className="p-3 bg-slate-50/70 dark:bg-[#0F172A]/40 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(cat.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={isExpanded ? "Ocultar subcategorías" : "Ver subcategorías"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {isEditingThis ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2 py-1 rounded-lg border border-blue-400 bg-white dark:bg-[#1E293B] text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] flex-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id, false)}
                            className="p-1 rounded-md bg-emerald-600 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-extrabold text-xs text-[#1E293B] dark:text-[#F8FAFC] truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {cat.subcategories.length}{" "}
                            {cat.subcategories.length === 1 ? "tipo" : "tipos"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones de Categoría Principal */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isEditingThis && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat.id, cat.name)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Renombrar categoría"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id, false)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo: Subcategorías */}
                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {cat.subcategories.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Sin subcategorías específicas (puedes agregar abajo).
                          </span>
                        ) : (
                          cat.subcategories.map((sub) => {
                            const isEditingSub = editingId === sub.id;

                            if (isEditingSub) {
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 p-1 rounded-xl border border-blue-300"
                                >
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="px-2 py-0.5 rounded-md border border-blue-400 bg-white dark:bg-[#1E293B] text-[11px] font-bold text-[#1E293B] dark:text-[#F8FAFC] w-28"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(sub.id, true, cat.id)}
                                    className="p-0.5 rounded bg-emerald-600 text-white"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="p-0.5 rounded bg-slate-200 text-slate-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={sub.id}
                                className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-600"
                              >
                                <span>{sub.name}</span>
                                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(sub.id, sub.name)}
                                    className="p-0.5 hover:text-blue-600 cursor-pointer"
                                    title="Editar subcategoría"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(sub.id, true, cat.id)}
                                    className="p-0.5 hover:text-rose-600 cursor-pointer"
                                    title="Eliminar subcategoría"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Botón o Formulario Inline para agregar subcategoría */}
                      {activeSubParentId === cat.id ? (
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={`Nueva subcategoría para ${cat.name}...`}
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateSubcategory(cat.id);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 rounded-xl border border-blue-400 bg-white dark:bg-[#1E293B] text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] outline-hidden focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateSubcategory(cat.id)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                          >
                            Agregar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubParentId(null);
                              setNewSubName("");
                            }}
                            className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSubParentId(cat.id);
                            setNewSubName("");
                          }}
                          className="pt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Agregar subcategoría en {cat.name}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
