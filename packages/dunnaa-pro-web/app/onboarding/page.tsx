"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Store, MapPin, Phone, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { AuthShell } from "@/components/AuthShell";
import { useTheme } from "@/components/ThemeProvider";
import {
  CATEGORY_LABELS,
  getThemeFromCategory,
  type EstablishmentCategory,
} from "@/lib/theme";

const STEPS = [
  { id: 1, title: "Nome e tipo", icon: Store },
  { id: 2, title: "Endereço", icon: MapPin },
  { id: 3, title: "Contato", icon: Phone },
  { id: 4, title: "Horários", icon: Clock },
];

const CATEGORIES: EstablishmentCategory[] = [
  "barbershop",
  "salon",
  "beauty_salon",
  "barber_salon",
  "esthetics",
  "clinic",
  "spa",
  "other",
];

const WEEKDAYS = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

type FormData = {
  name: string;
  category: EstablishmentCategory;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  whatsapp: string;
  business_hours: Record<string, { open: string; close: string } | "closed">;
};

const defaultHours: Record<string, { open: string; close: string }> = {};
WEEKDAYS.forEach(({ key }) => {
  defaultHours[key] =
    key === "sun" ? { open: "09:00", close: "13:00" } : { open: "09:00", close: "18:00" };
});

const INITIAL: FormData = {
  name: "",
  category: "barbershop",
  description: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  whatsapp: "",
  business_hours: defaultHours,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { setCategory } = useTheme();
  const [step, setStep] = useState(1);

  useEffect(() => {
    const initialCat = INITIAL.category;
    setCategory(initialCat);
    document.documentElement.setAttribute("data-theme", getThemeFromCategory(initialCat));
  }, [setCategory]);
  const [data, setData] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorySelect = (cat: EstablishmentCategory) => {
    setData((d) => ({ ...d, category: cat }));
    setCategory(cat);
    document.documentElement.setAttribute("data-theme", getThemeFromCategory(cat));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: data.name.trim(),
        category: data.category,
        description: data.description.trim() || undefined,
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state.trim().toUpperCase().slice(0, 2),
        zip_code: data.zip_code.trim() || undefined,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp.trim() || undefined,
        business_hours: (() => {
          const hours: Record<string, { open: string; close: string }> = {};
          for (const [k, v] of Object.entries(data.business_hours)) {
            if (v !== "closed" && v && typeof v === "object" && "open" in v && "close" in v) {
              hours[k] = v as { open: string; close: string };
            }
          }
          return hours;
        })(),
      };
      const { data: res } = await api.post("/establishments", payload);
      setCookie("pro_establishment_id", res.id, { maxAge: 60 * 60 * 24 * 365 });
      setCookie("pro_establishment_category", res.category, { maxAge: 60 * 60 * 24 * 365 });
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao cadastrar. Verifique os dados e tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return data.name.trim().length >= 2;
    if (step === 2) return data.address.trim().length >= 5 && data.city.trim() && data.state.trim();
    if (step === 3) return data.phone.trim().length >= 10;
    return true;
  };

  return (
    <AuthShell
      eyebrow="DUNNAA Pro"
      subtitle={`Passo ${step} de 4 — ${STEPS[step - 1].title}`}
      maxWidth="lg"
    >
          {/* Progress */}
          <div className="mb-6 flex gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s.id <= step ? "bg-[var(--color-primary)]" : "bg-[var(--color-surface-elevated)]"
                }`}
              />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(STEPS[step - 1].icon, { className: "h-5 w-5" })}
                {STEPS[step - 1].title}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Escolha o nome e o tipo do seu negócio. O tema da interface já muda conforme sua escolha."}
                {step === 2 && "Onde fica seu estabelecimento?"}
                {step === 3 && "Telefone e WhatsApp para contato dos clientes."}
                {step === 4 && "Horário de funcionamento (pode alterar depois)."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                      Nome do estabelecimento
                    </label>
                    <Input
                      placeholder="Ex: Barbearia do João"
                      value={data.name}
                      onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                      Tipo de estabelecimento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategorySelect(cat)}
                          className={`px-4 py-3 rounded-xl text-left text-sm font-medium transition border-2 ${
                            data.category === cat
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]"
                          }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                      Descrição (opcional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[80px]"
                      placeholder="Breve descrição do seu negócio"
                      value={data.description}
                      onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
                      maxLength={1000}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                      Endereço
                    </label>
                    <Input
                      placeholder="Rua, número, bairro"
                      value={data.address}
                      onChange={(e) => setData((d) => ({ ...d, address: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                        Cidade
                      </label>
                      <Input
                        placeholder="São Paulo"
                        value={data.city}
                        onChange={(e) => setData((d) => ({ ...d, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                        Estado (UF)
                      </label>
                      <Input
                        placeholder="SP"
                        value={data.state}
                        onChange={(e) =>
                          setData((d) => ({ ...d, state: e.target.value.toUpperCase().slice(0, 2) }))
                        }
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                      CEP (opcional)
                    </label>
                    <Input
                      placeholder="01310-100"
                      value={data.zip_code}
                      onChange={(e) => setData((d) => ({ ...d, zip_code: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                      Telefone *
                    </label>
                    <Input
                      type="tel"
                      placeholder="11999999999"
                      value={data.phone}
                      onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                      WhatsApp (opcional, para lembretes)
                    </label>
                    <Input
                      type="tel"
                      placeholder="11999999999"
                      value={data.whatsapp}
                      onChange={(e) => setData((d) => ({ ...d, whatsapp: e.target.value }))}
                    />
                    {!data.whatsapp && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Se não informar, usaremos o telefone principal
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  {WEEKDAYS.map(({ key, label }) => {
                    const val = data.business_hours[key];
                    const isClosed = val === "closed" || !val;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)]"
                      >
                        <span className="w-24 text-sm text-[var(--color-text-muted)]">{label}</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!isClosed}
                            onChange={(e) =>
                              setData((d) => ({
                                ...d,
                                business_hours: {
                                  ...d.business_hours,
                                  [key]: e.target.checked
                                    ? defaultHours[key] ?? { open: "09:00", close: "18:00" }
                                    : "closed",
                                },
                              }))
                            }
                            className="rounded"
                          />
                          <span className="text-sm">Aberto</span>
                        </label>
                        {!isClosed && (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="time"
                              value={(val as { open: string })?.open ?? "09:00"}
                              onChange={(e) =>
                                setData((d) => ({
                                  ...d,
                                  business_hours: {
                                    ...d.business_hours,
                                    [key]: {
                                      ...((d.business_hours[key] as object) || { open: "09:00", close: "18:00" }),
                                      open: e.target.value,
                                      close: (d.business_hours[key] as { close?: string })?.close ?? "18:00",
                                    },
                                  },
                                }))
                              }
                              className="w-28"
                            />
                            <span className="text-[var(--color-text-muted)]">até</span>
                            <Input
                              type="time"
                              value={(val as { close: string })?.close ?? "18:00"}
                              onChange={(e) =>
                                setData((d) => ({
                                  ...d,
                                  business_hours: {
                                    ...d.business_hours,
                                    [key]: {
                                      ...((d.business_hours[key] as object) || { open: "09:00", close: "18:00" }),
                                      open: (d.business_hours[key] as { open?: string })?.open ?? "09:00",
                                      close: e.target.value,
                                    },
                                  },
                                }))
                              }
                              className="w-28"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((s) => s - 1)}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                ) : (
                  <div />
                )}
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canProceed()}
                    className="flex-1"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !canProceed()}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      "Concluir cadastro"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
    </AuthShell>
  );
}
