"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { PRO_URL } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { PremiumCta } from "@/components/PremiumCta";

const nav = [
  { label: "Para clientes", href: "/para-clientes" },
  { label: "Para estabelecimentos", href: "/para-estabelecimentos" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-header border-b border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
          : "border-b border-transparent bg-white/90"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLogo href="/" size="header" header priority className="block" />

        <nav className="hidden items-center gap-6 xl:gap-8 lg:flex shrink-0">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors duration-300 hover:text-[#005f73] whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={`${PRO_URL}/login`}
            className="text-sm font-medium text-slate-600 transition-colors duration-300 hover:text-[#005f73] whitespace-nowrap"
          >
            Entrar
          </a>
          <PremiumCta href={PRO_URL} variant="gold" size="md" external>
            Cadastrar estabelecimento
          </PremiumCta>
        </nav>

        <button
          type="button"
          className="lg:hidden self-center rounded-xl p-2 text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-6 animate-fade-up">
          <nav className="flex flex-col gap-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base font-medium text-slate-700 py-2"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a href={`${PRO_URL}/login`} className="text-base font-medium text-slate-700 py-2">
              Entrar
            </a>
            <PremiumCta href={PRO_URL} variant="gold" size="md" external className="w-full mt-2">
              Cadastrar estabelecimento
            </PremiumCta>
          </nav>
        </div>
      )}
    </header>
  );
}
