"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, Plus, Eye, MousePointerClick, MapPin, Target, X } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";
import { useEstablishmentId, useEstablishmentLoading } from "@/contexts/EstablishmentContext";

type Campaign = {
  id: string;
  name: string | null;
  budget_daily: number;
  budget_total: number | null;
  spent_today: number;
  total_spent: number;
  impressions: number;
  clicks: number;
  active: boolean;
  status: string;
  placement: string;
  priority: number;
  target_radius_km: number;
  target_cities: string[];
  cost_per_impression: number;
  budget_remaining_today?: number | null;
  start_date: string;
  end_date: string | null;
};

type Summary = {
  active_campaigns: number;
  total_impressions: number;
  total_clicks: number;
  total_spent: number;
  is_sponsored: boolean;
  campaigns: Campaign[];
};

const PLACEMENTS = [
  { value: "search_top", label: "Topo da busca", desc: "Até 4 slots premium (recomendado)" },
  { value: "search_list", label: "Lista patrocinada", desc: "Destaque na listagem geral" },
  { value: "map_pin", label: "Mapa", desc: "Pin destacado no mapa (em breve)" },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function DestaquePage() {
  const establishmentId = useEstablishmentId();
  const loadingEst = useEstablishmentLoading();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    budget_daily: "29.90",
    budget_total: "",
    target_radius_km: "15",
    placement: "search_top",
    priority: "10",
    cost_per_impression: "0.05",
    cities: "",
    end_date: "",
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["ad-campaigns-summary", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/ad-campaigns/summary`);
      return res.data as Summary;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      await api.post(`/establishments/${establishmentId}/ad-campaigns`, {
        name: form.name || "Meu destaque",
        budget_daily: Number(form.budget_daily),
        budget_total: form.budget_total ? Number(form.budget_total) : null,
        start_date: today,
        end_date: form.end_date || null,
        placement: form.placement,
        priority: Number(form.priority),
        target_radius_km: Number(form.target_radius_km),
        cost_per_impression: Number(form.cost_per_impression),
        target_cities: form.cities
          ? form.cities.split(",").map((c) => c.trim()).filter(Boolean)
          : [],
        audience: { gender: "all", new_customers_only: false, categories: [] },
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns-summary", establishmentId] });
      setModal(false);
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/establishments/${establishmentId}/ad-campaigns/${id}`, {
        active,
        status: active ? "active" : "paused",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns-summary", establishmentId] }),
  });

  if (loadingEst || !establishmentId) {
    return (
      <ProPageShell>
        <p className="text-center text-[var(--color-text-muted)]">
          Selecione um estabelecimento para configurar destaque.
        </p>
      </ProPageShell>
    );
  }

  return (
    <ProPageShell>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Zap className="h-7 w-7 text-amber-500" />
            Destaque & Impulsionamento
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xl">
            Apareça no topo da busca DUNNAA. Você define orçamento diário, área de cobertura e posição.
            Diferente da assinatura SaaS (comissão menor), o destaque compra visibilidade.
          </p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova campanha
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin mx-auto" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Status" value={summary?.is_sponsored ? "No ar" : "Inativo"} highlight={summary?.is_sponsored} />
            <Stat label="Impressões" value={String(summary?.total_impressions ?? 0)} icon={Eye} />
            <Stat label="Cliques" value={String(summary?.total_clicks ?? 0)} icon={MousePointerClick} />
            <Stat label="Investido" value={fmt(summary?.total_spent ?? 0)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suas campanhas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!summary?.campaigns?.length ? (
                <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
                  Nenhuma campanha. Crie seu primeiro destaque para aparecer no topo.
                </p>
              ) : (
                summary.campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="border border-[var(--color-border)] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{c.name || "Campanha"}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {PLACEMENTS.find((p) => p.value === c.placement)?.label ?? c.placement}
                          {" · "}Raio {c.target_radius_km} km · Prioridade {c.priority}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.status === "active" && c.active
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-gray-500/15 text-gray-500"
                        }`}
                      >
                        {c.status === "exhausted" ? "Orçamento esgotado" : c.active ? "Ativa" : "Pausada"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-[var(--color-text-muted)] text-xs">Orçamento/dia</p>
                        <p className="font-medium">{fmt(c.budget_daily)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-muted)] text-xs">Gasto hoje</p>
                        <p className="font-medium">{fmt(c.spent_today)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-muted)] text-xs">Impressões</p>
                        <p className="font-medium">{c.impressions}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-muted)] text-xs">Cliques</p>
                        <p className="font-medium">{c.clicks}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                      disabled={toggleMutation.isPending || c.status === "exhausted"}
                    >
                      {c.active ? "Pausar" : "Ativar"}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <Card className="w-full max-w-lg my-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nova campanha de destaque</CardTitle>
              <button type="button" onClick={() => setModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}

              <Field label="Nome da campanha">
                <Input
                  placeholder="Ex: Destaque fim de semana"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Orçamento diário (R$)">
                  <Input
                    type="number"
                    min="5"
                    step="0.01"
                    value={form.budget_daily}
                    onChange={(e) => setForm({ ...form, budget_daily: e.target.value })}
                  />
                </Field>
                <Field label="Teto total (opcional)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.budget_total}
                    onChange={(e) => setForm({ ...form, budget_total: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Posição">
                <select
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value })}
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Raio de cobertura (km)">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={form.target_radius_km}
                    onChange={(e) => setForm({ ...form, target_radius_km: e.target.value })}
                  />
                </Field>
                <Field label="Prioridade (0–100)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Cidades alvo (opcional, separadas por vírgula)">
                <Input
                  placeholder="São Paulo, Campinas"
                  value={form.cities}
                  onChange={(e) => setForm({ ...form, cities: e.target.value })}
                />
              </Field>

              <Field label="Custo por impressão (R$)">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.cost_per_impression}
                  onChange={(e) => setForm({ ...form, cost_per_impression: e.target.value })}
                />
              </Field>

              <Field label="Data fim (opcional)">
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </Field>

              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.budget_daily}
              >
                {createMutation.isPending ? "Ativando..." : "Ativar destaque"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </ProPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </div>
        <p
          className={`text-xl font-bold ${
            highlight ? "text-emerald-600" : "text-[var(--color-text-primary)]"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
