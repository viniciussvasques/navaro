"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Calendar, Users, ListOrdered, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const GUIDE_KEY = "pro_guide_done";

const STEPS = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao Dunnaa Pro!",
    description:
      "Este é o seu painel de controle. Aqui você acompanha agendamentos, fila e receita do dia. Vamos mostrar os principais recursos em poucos passos.",
  },
  {
    icon: Calendar,
    title: "Agendamentos hoje",
    description:
      "Veja quantos agendamentos você tem para hoje. Clique em \"Ver agenda\" para gerenciar sua agenda e bloquear horários quando necessário.",
  },
  {
    icon: ListOrdered,
    title: "Fila de espera",
    description:
      "Clientes podem entrar na fila pelo app. Aqui você vê quem está esperando e pode chamar o próximo quando for a vez dele.",
  },
  {
    icon: Users,
    title: "Próximos passos",
    description:
      "Cadastre seus serviços e profissionais no menu \"Equipe\". Configure horários em \"Configurações\" e compartilhe seu link para clientes agendarem.",
  },
];

type DashboardGuideProps = {
  /** Se true, abre o guia imediatamente (ex: botão "Ver guia novamente") */
  forceOpen?: boolean;
};

export function DashboardGuide({ forceOpen = false }: DashboardGuideProps) {
  const [open, setOpen] = useState(forceOpen);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(GUIDE_KEY);
    if (!done) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = (dontShowAgain = false) => {
    setOpen(false);
    if (typeof window !== "undefined" && dontShowAgain) {
      localStorage.setItem(GUIDE_KEY, "true");
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose(true);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => handleClose(false)}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="guide-title"
      >
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/20">
            <Icon className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 id="guide-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
              {current.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
              {current.description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full w-6 transition-colors ${
                  i === step ? "bg-[var(--color-primary)]" : "bg-[var(--color-surface-elevated)]"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLast ? (
                "Concluir"
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={() => handleClose(true)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] underline"
          >
            Não mostrar novamente
          </button>
        </p>
      </div>
    </div>
  );
}
