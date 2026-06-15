"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronRight, Scissors, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const GUIDE_KEY = "pro_services_guide_done";

type ServicesGuideProps = {
  forceOpen?: boolean;
  hasServices?: boolean;
};

export function ServicesGuide({ forceOpen = false, hasServices = false }: ServicesGuideProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(GUIDE_KEY);
    if (!done && !hasServices) {
      setOpen(true);
    }
  }, [forceOpen, hasServices]);

  const handleClose = (dontShowAgain = false) => {
    setOpen(false);
    if (typeof window !== "undefined" && dontShowAgain) {
      localStorage.setItem(GUIDE_KEY, "true");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => handleClose(false)} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="services-guide-title"
      >
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/20">
            <Scissors className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 id="services-guide-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
              Cadastre seu primeiro serviço
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
              Serviços são o que seus clientes podem agendar: corte, barba, manicure, massagem... Você pode adicionar
              modelos prontos ou criar do zero. Depois, monte combos com preço especial.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button size="sm" onClick={() => handleClose(true)}>
            Entendi
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <button
            type="button"
            onClick={() => handleClose(true)}
            className="text-xs text-[var(--color-text-muted)] hover:underline"
          >
            Não mostrar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
