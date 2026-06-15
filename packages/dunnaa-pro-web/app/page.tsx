"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCookie } from "cookies-next";
import { LogIn, UserPlus, Calendar, BarChart3, Users, Sparkles } from "lucide-react";
import { ProBrandLockup } from "@/components/ProBrandLockup";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getCookie("pro_token");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0e14]">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e14] via-[#0d1520] to-[#0a0e14]" />
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-[#005f73]/20 blur-[120px] land-animate-float" />
        <div className="absolute top-1/2 -right-1/2 w-full h-full rounded-full bg-[#0a9396]/15 blur-[100px] land-animate-float-delay-1" />
        <div className="absolute -bottom-1/2 left-1/3 w-96 h-96 rounded-full bg-[#005f73]/10 blur-[80px] land-animate-float-delay-2" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16">
        {/* Logo & hero */}
        <div className="text-center mb-16 land-fade-up w-full max-w-lg mx-auto px-4">
          <div className="mx-auto mb-8 max-w-md">
            <ProBrandLockup href="/" onDark className="justify-center [&_span:first-child]:h-12 sm:[&_span:first-child]:h-14" />
          </div>
          <p className="mt-2 text-lg text-slate-400 max-w-md mx-auto">
            Gestão completa para barbearias, salões e clínicas. Agenda, equipe, fila e financeiro em um só lugar.
          </p>
        </div>

        {/* CTA cards */}
        <div className="grid sm:grid-cols-2 gap-6 w-full max-w-xl mb-20 land-fade-up-1">
          <Link
            href="/login"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 transition-all duration-300 hover:border-[#005f73]/50 hover:bg-white/10 hover:shadow-xl hover:shadow-[#005f73]/10 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#005f73]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-xl bg-[#005f73]/20 flex items-center justify-center mb-4 group-hover:bg-[#005f73]/30 transition-colors">
                <LogIn className="h-7 w-7 text-[#0a9396]" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Entrar</h2>
              <p className="text-sm text-slate-400">
                Já tem conta? Acesse seu painel
              </p>
            </div>
          </Link>

          <Link
            href="/register"
            className="group relative overflow-hidden rounded-2xl border-2 border-[#005f73]/50 bg-gradient-to-br from-[#005f73]/20 to-[#0a9396]/10 backdrop-blur-xl p-8 transition-all duration-300 hover:border-[#0a9396] hover:shadow-xl hover:shadow-[#005f73]/20 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#005f73]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-xl bg-[#0a9396]/30 flex items-center justify-center mb-4 group-hover:bg-[#0a9396]/40 transition-colors">
                <UserPlus className="h-7 w-7 text-[#94d2bd]" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Cadastre-se</h2>
              <p className="text-sm text-slate-400">
                Crie sua conta e comece de graça
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#0a9396]">
                <Sparkles className="h-3.5 w-3.5" />
                Gratuito para começar
              </span>
            </div>
          </Link>
        </div>

        {/* Features preview */}
        <div className="flex flex-wrap justify-center gap-8 text-slate-500 land-fade-up-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#005f73]" />
            <span className="text-sm">Agenda digital</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#005f73]" />
            <span className="text-sm">Equipe e profissionais</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#005f73]" />
            <span className="text-sm">Financeiro</span>
          </div>
        </div>
      </div>
    </div>
  );
}
