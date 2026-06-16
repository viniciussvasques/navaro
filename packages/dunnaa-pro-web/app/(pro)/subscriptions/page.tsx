"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Crown, Plus, Users, X } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Plan = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  active: boolean;
};

type Subscriber = {
  id: string;
  user_name?: string;
  user_phone?: string;
  status: string;
  current_period_end?: string;
};

function useEstablishment() {
  const { data } = useQuery({
    queryKey: ["establishments-my"],
    queryFn: async () => {
      const res = await api.get("/establishments/my");
      const list = Array.isArray(res.data) ? res.data : [];
      return list[0] ?? null;
    },
  });
  return data;
}

export default function SubscriptionPlansPage() {
  const establishment = useEstablishment();
  const establishmentId = establishment?.id;
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [error, setError] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["subscription-plans", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/subscription-plans`, {
        params: { active_only: false },
      });
      return res.data as Plan[];
    },
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ["subscribers", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/subscriptions`);
      return res.data as Subscriber[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/establishments/${establishmentId}/subscription-plans`, {
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        items: [{ quantity_per_month: 4 }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans", establishmentId] });
      setModal(false);
      setForm({ name: "", description: "", price: "" });
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/establishments/${establishmentId}/subscription-plans/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription-plans", establishmentId] }),
  });

  if (!establishmentId) {
    return (
      <ProPageShell>
        <p className="text-center text-[var(--color-text-muted)]">Cadastre um estabelecimento primeiro.</p>
      </ProPageShell>
    );
  }

  return (
    <ProPageShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos de assinatura</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Planos mensais para clientes fiéis (C50–C53).</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo plano
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin mx-auto" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-[var(--color-primary)]" />
                  {plan.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">R$ {Number(plan.price).toFixed(2)}<span className="text-sm font-normal text-[var(--color-text-muted)]">/mês</span></p>
                <p className="text-sm text-[var(--color-text-muted)]">{plan.description || "Sem descrição"}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleMutation.mutate({ id: plan.id, active: !plan.active })}
                >
                  {plan.active ? "Desativar" : "Ativar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assinantes ({subscribers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Nenhum assinante ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {subscribers.map((s) => (
                <li key={s.id} className="py-3 flex justify-between text-sm">
                  <span>{s.user_name || s.user_phone || "Cliente"}</span>
                  <span className="text-[var(--color-text-muted)] capitalize">{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Novo plano</CardTitle>
              <button onClick={() => setModal(false)}><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Input placeholder="Nome do plano" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Preço mensal (R$)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.price}>
                {createMutation.isPending ? "Criando..." : "Criar plano"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </ProPageShell>
  );
}
