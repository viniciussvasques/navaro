"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, ListOrdered, DollarSign, Scissors,
  Users, Settings, LogOut, ScanLine, UserCheck, Star, Package,
  Bell, Megaphone, Crown, Zap, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getCookie, deleteCookie } from "cookies-next";
import { api } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";
import { EstablishmentProvider } from "@/contexts/EstablishmentContext";
import { ProBrandLockup } from "@/components/ProBrandLockup";

const navItems = [
  { href: "/dashboard",     label: "Início",         icon: LayoutDashboard },
  { href: "/agenda",        label: "Agenda",          icon: Calendar },
  { href: "/queue",         label: "Fila",            icon: ListOrdered },
  { href: "/check-in",      label: "Check-in",        icon: UserCheck },
  { href: "/qr-code",       label: "QR Code",         icon: ScanLine },
  { href: "/services",      label: "Serviços",        icon: Scissors },
  { href: "/promotions",    label: "Promoções",       icon: Megaphone },
  { href: "/destaque",      label: "Destaque",        icon: Zap },
  { href: "/subscriptions", label: "Assinaturas",     icon: Crown },
  { href: "/products",      label: "Produtos",        icon: Package },
  { href: "/reviews",       label: "Avaliações",      icon: Star },
  { href: "/finance",       label: "Financeiro",      icon: DollarSign },
  { href: "/notifications", label: "Notificações",    icon: Bell },
  { href: "/staff",         label: "Equipe",          icon: Users },
  { href: "/settings",      label: "Configurações",   icon: Settings },
];

function NavContent({
  pathname,
  userName,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  userName: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <nav className="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--color-border)]">
        <p className="px-3 py-2 text-xs text-[var(--color-text-muted)] truncate">{userName}</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setCategory } = useTheme();
  const [userName, setUserName] = useState("Estabelecimento");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const name = getCookie("pro_user_name");
    setUserName(typeof name === "string" ? name : "Estabelecimento");
  }, []);

  // fecha drawer ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    deleteCookie("pro_token");
    deleteCookie("pro_user_name");
    deleteCookie("pro_establishment_id");
    deleteCookie("pro_establishment_category");
    router.push("/login");
    router.refresh();
  };

  return (
    <EstablishmentProvider setCategory={setCategory}>
      <div className="flex min-h-screen bg-[var(--color-background)]">

        {/* ── Sidebar desktop ─────────────────────────────────────── */}
        <aside className="hidden lg:flex w-[16.5rem] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
          <div className="flex h-16 items-center border-b border-[var(--color-border)] px-4">
            <ProBrandLockup />
          </div>
          <NavContent
            pathname={pathname}
            userName={userName}
            onLogout={handleLogout}
          />
        </aside>

        {/* ── Drawer mobile (overlay) ──────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-in-out lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4">
            <ProBrandLockup href="/dashboard" />
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NavContent
            pathname={pathname}
            userName={userName}
            onNavigate={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />
        </aside>

        {/* ── Conteúdo principal ───────────────────────────────────── */}
        <div className="flex flex-1 min-w-0 flex-col">
          {/* Topbar mobile */}
          <header className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <ProBrandLockup href="/dashboard" />
          </header>

          <main className="flex-1 min-w-0 overflow-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>

      </div>
    </EstablishmentProvider>
  );
}
