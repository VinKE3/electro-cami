"use client";

import React, { useState } from "react";
import { Modal } from "./ui/modal";
import { Pagination } from "./ui/pagination";
import { createUser, deleteUser } from "@/actions/auth";
import {
  UserPlus,
  Trash2,
  CheckCircle2,
} from "lucide-react";

interface UsersViewProps {
  initialUsers: any[];
  currentUserId?: number;
}

export function UsersView({ initialUsers, currentUserId }: UsersViewProps) {
  const [users, setUsers] = useState(initialUsers);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "colaborador">("colaborador");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const openCreateModal = () => {
    setName("");
    setUsername("");
    setPassword("");
    setRole("colaborador");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const res = await createUser({
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        role,
      });

      if (res.success && res.data) {
        setUsers([res.data, ...users]);
        setIsModalOpen(false);
      } else {
        alert(res.error || "No se pudo crear el usuario.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Deseas eliminar el acceso para este usuario?")) return;
    const res = await deleteUser(id);
    if (res.success) {
      setUsers(users.filter((u) => u.id !== id));
    } else {
      alert(res.error || "Error al eliminar usuario.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC]">
            Control de Usuarios & Accesos
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Permite a tu papá crear un usuario para tu hermano o colaboradores del negocio.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          + Crear Usuario
        </button>
      </div>

      {/* LISTADO DE USUARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u) => {
          const isSelf = currentUserId === u.id;
          const isAdmin = u.role === "admin";

          return (
            <div
              key={u.id}
              className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#334155] shadow-xs flex flex-col justify-between gap-4 transition hover:border-blue-400/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1E293B] dark:text-[#F8FAFC] text-sm">
                        {u.name} {isSelf && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold">(Tú)</span>}
                      </h3>
                      <p className="text-xs text-[#94A3B8] font-mono">@{u.username}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isAdmin
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        : "bg-slate-100 text-slate-700 dark:bg-[#0F172A] dark:text-slate-300"
                    }`}
                  >
                    {isAdmin ? "Administrador" : "Colaborador"}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-[#334155] text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between">
                  <span>Acceso habilitado</span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                  </span>
                </div>
              </div>

              {!isSelf && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar acceso
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalItems={users.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 15, 25]}
        itemLabel="usuarios"
      />

      {/* MODAL CREAR USUARIO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Usuario"
        description="Genera credenciales de acceso para tu hermano o ayudante."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Nombre y Apellido *
            </label>
            <input
              type="text"
              placeholder="Ej: Lucas Benítez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Nombre de Usuario (para ingresar) *
            </label>
            <input
              type="text"
              placeholder="Ej: lucas"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              required
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[10px] text-[#94A3B8] mt-1">Sin espacios ni mayúsculas.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Contraseña *
            </label>
            <input
              type="password"
              placeholder="Mínimo 4 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Rol de Acceso
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "colaborador")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-sm font-medium outline-hidden"
            >
              <option value="colaborador">Colaborador (Cobranzas y registro)</option>
              <option value="admin">Administrador Total</option>
            </select>
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
              disabled={loading || !name.trim() || !username.trim() || !password.trim()}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
