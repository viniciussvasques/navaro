"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/errors";

const SEGMENTS = [
  { value: "chemicals", label: "Insumos Químicos" },
  { value: "equipment", label: "Equipamentos" },
  { value: "disposables", label: "Descartáveis" },
  { value: "cosmetics", label: "Cosméticos" },
  { value: "furniture", label: "Mobiliário" },
  { value: "technology", label: "Tecnologia" },
  { value: "other", label: "Outros" },
];

const STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function SupplierRegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    description: "",
    segment: "other",
    phone: "",
    whatsapp: "",
    email: "",
    city: "",
    state: "",
    ships_nationwide: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post("/suppliers", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-supplier"] });
      router.push("/fornecedor");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  return (
    <ProPageShell maxWidth="lg">
      <ProPageHeader
        title="Cadastro de Fornecedor"
        icon={Store}
        description="Preencha os dados da sua empresa para começar a vender"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              createMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  Nome da Empresa *
                </label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ex: Distribuidora Alfa"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  CNPJ
                </label>
                <Input
                  name="cnpj"
                  value={form.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Segmento *
              </label>
              <select
                name="segment"
                value={form.segment}
                onChange={handleChange}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">
                Descrição
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Conte sobre sua empresa e produtos..."
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  Telefone
                </label>
                <Input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  WhatsApp
                </label>
                <Input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  E-mail
                </label>
                <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="contato@empresa.com" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  Cidade
                </label>
                <Input name="city" value={form.city} onChange={handleChange} placeholder="São Paulo" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  Estado
                </label>
                <select
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                >
                  <option value="">Selecione</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="ships_nationwide"
                name="ships_nationwide"
                checked={form.ships_nationwide}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              />
              <label htmlFor="ships_nationwide" className="text-sm text-[var(--color-text-secondary)]">
                Entrego para todo o Brasil
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Perfil
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProPageShell>
  );
}
