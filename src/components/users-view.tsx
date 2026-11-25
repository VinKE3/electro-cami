"use client";

import React, { useState } from "react";
import { Modal } from "./ui/modal";
import { Pagination } from "./ui/pagination";
import {
  createUser,
  deleteUser,
  updateUserPassword,
  toggleUserActive,
} from "@/actions/auth";
import {
  UserPlus,
  Trash2,
  CheckCircle2,
  Ban,
  KeyRound,
  Power,
} from "lucide-react";

interface UsersViewProps {
  initialUsers: any[];
  currentUserId?: number;
  currentUserRole?: string;
}

export function UsersView({
  initialUsers,
  currentUserId,
  currentUserRole,
}: UsersViewProps) {
  const isCurrentUserAdmin = currentUserRole === "admin";
  const [users, setUsers] = useState(initialUsers);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "colaborador">("colaborador");
  const [loading, setLoading] = useState(false);

  // Password modal states
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

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

  const openPasswordModal = (user: any) => {
    setPasswordModalUser(user);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
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
        setUsers([{ ...res.data, isActive: true }, ...users]);
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (newPassword.trim().length < 4) {
      alert("La nueva contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await updateUserPassword({
        userId: passwordModalUser.id,
        newPassword: newPassword.trim(),
        currentPassword: !isCurrentUserAdmin ? currentPassword.trim() : undefined,
      });

      if (res.success) {
        setPasswordModalUser(null);
        alert("Contraseña actualizada correctamente.");
      } else {
        alert(res.error || "No se pudo actualizar la contraseña.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggleActive = async (user: any) => {
    const actionLabel = user.isActive ? "desactivar" : "activar";
    if (!confirm(`¿Deseas ${actionLabel} el acceso de ${user.name}?`)) return;

    setTogglingUserId(user.id);
    try {
      const res = await toggleUserActive(user.id);
      if (res.success && res.data) {
        setUsers(
          users.map((u) =>
            u.id === user.id ? { ...u, isActive: res.data!.isActive } : u
          )
        );
      } else {
        alert(res.error || "No se pudo cambiar el estado del usuario.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setTogglingUserId(null);
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
            Administra usuarios, contraseñas y accesos habilitados al panel.
          </p>
        </div>

        {isCurrentUserAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Crear Usuario
          </button>
        )}
      </div>

      {/* LISTADO DE USUARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users
          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
          .map((u) => {
            const isSelf = currentUserId === u.id;
            const isAdmin = u.role === "admin";
            const isActive = u.isActive !== false;
            const canChangePassword = isCurrentUserAdmin || isSelf;

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
                          {u.name}{" "}
                          {isSelf && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold">
                              (Tú)
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-[#94A3B8] font-mono">
                          @{u.username}
                        </p>
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
                    <span>{isActive ? "Acceso habilitado" : "Acceso suspendido"}</span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                        <Ban className="w-3.5 h-3.5" /> Inactivo
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                  {canChangePassword && (
                    <button
                      type="button"
                      onClick={() => openPasswordModal(u)}
                      className="p-1.5 text-[#64748B] hover:text-blue-600 dark:text-[#94A3B8] dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Cambiar contraseña
                    </button>
                  )}

                  {isCurrentUserAdmin && !isSelf && (
                    <>
                      <button
                        type="button"
                        disabled={togglingUserId === u.id}
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                          isActive
                            ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                            : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {isActive ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
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
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
              }
              required
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Sin espacios ni mayúsculas.
            </p>
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
              onChange={(e) =>
                setRole(e.target.value as "admin" | "colaborador")
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-sm font-medium outline-hidden"
            >
              <option value="colaborador">
                Colaborador (Cobranzas y registro)
              </option>
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
              disabled={
                loading || !name.trim() || !username.trim() || !password.trim()
              }
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CAMBIAR CONTRASEÑA */}
      <Modal
        isOpen={Boolean(passwordModalUser)}
        onClose={() => !passwordLoading && setPasswordModalUser(null)}
        title="Cambiar Contraseña"
        description={
          passwordModalUser
            ? `Actualizando clave de ${passwordModalUser.name} (@${passwordModalUser.username})`
            : undefined
        }
        maxWidth="md"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {!isCurrentUserAdmin && (
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Contraseña actual *
              </label>
              <input
                type="password"
                placeholder="Tu contraseña actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Nueva contraseña *
            </label>
            <input
              type="password"
              placeholder="Mínimo 4 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={4}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Confirmar nueva contraseña *
            </label>
            <input
              type="password"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={4}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={passwordLoading}
              onClick={() => setPasswordModalUser(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F4F6F9] dark:text-[#94A3B8] dark:hover:bg-[#0F172A] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                passwordLoading ||
                !newPassword.trim() ||
                !confirmPassword.trim() ||
                (!isCurrentUserAdmin && !currentPassword.trim())
              }
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {passwordLoading ? "Guardando..." : "Guardar Contraseña"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
