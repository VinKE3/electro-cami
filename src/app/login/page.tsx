"use client";

import React, { useState } from "react";
import { login } from "@/actions/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setError("");
    setLoading(true);
    try {
      const res = await login({ username, password });
      if (res.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(res.error || "Credenciales incorrectas.");
      }
    } catch (err: any) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top bar with back link & theme toggle */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-semibold text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] transition"
        >
          ← Volver a la Tienda Pública
        </Link>
        <ThemeToggle />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md mx-auto my-auto animate-fade-in">
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] dark:border-[#334155] shadow-xl space-y-6">
          {/* Logo y encabezado */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 dark:bg-blue-500 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
              ⚡
            </div>
            <h1 className="text-2xl font-black text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
              Electro Cami
            </h1>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
              Acceso exclusivo de administración y cobranzas
            </p>
          </div>

          {/* Alerta de Error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold text-center animate-fade-in">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-[#F4F6F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition active:scale-98 cursor-pointer"
            >
              {loading ? "Verificando..." : "Ingresar al Panel"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-[#94A3B8]">
        Electro Cami • Sistema seguro con cifrado de contraseñas
      </div>
    </div>
  );
}
