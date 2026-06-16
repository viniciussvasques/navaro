"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Megaphone, Plus, Bell, Pencil, X } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Promotion = {
  id: string;
  title: string;
  description?: string | null;
  discount_percent?: number | null;
  discount_fixed?: number | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
  notify_sent: boolean;
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

export default function PromotionsPage() {
  const establishment = useEstablishment();
  const establishmentId = establishment?.id;
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_percent: "",
    starts_at: "",
    ends_at: "",
  });
  const [error, setError] = useState<string | null>(null);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["promotions", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const res = await api.get(`/establishments/${establishmentId}/promotions`, {
        params: { active_only: false },
      });
      return res.data as Promotion[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      };
      if (editing) {
        await api.patch(`/establishments/${establishmentId}/promotions/${editing.id}`, payload);
      } else {
        await api.post(`/establishments/${establishmentId}/promotions`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions", establishmentId] });
      setModal(false);
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const notifyMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/establishments/${establishmentId}/promotions/${id}/notify`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotions", establishmentId] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/establishments/${establishmentId}/promotions/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotions", establishmentId] }),
  });

  const openCreate = () => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    setEditing(null);
    setForm({
      title: "",
      description: "",
      discount_percent: "10",
      starts_at: now.toISOString().slice(0, 16),
      ends_at: nextWeek.toISOString().slice(0, 16),
    });
    setModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description ?? "",
      discount_percent: p.discount_percent?.toString() ?? "",
      starts_at: p.starts_at.slice(0, 16),
      ends_at: p.ends_at.slice(0, 16),
    });
    setModal(true);
  };

  if (!establishmentId) {
    return (
      <ProPageShell>
        <p className="text-center text-[var(--color-text-muted)]">
          Cadastre um estabelecimento para gerenciar promoções.
        </p>
      </ProPageShell>
    );
  }

  return (
    <ProPageShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Promoções</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Crie campanhas e avise clientes favoritos.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova promoção
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin mx-auto" />
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[var(--color-text-muted)]">
            <Megaphone className="mx-auto mb-3 h-10 w-10 opacity-40" />
            Nenhuma promoção cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {promotions.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-lg">{p.title}</CardTitle>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${p.active ? "bg-green-500/15 text-green-600" : "bg-gray-500/15 text-gray-500"}`}>
                  {p.active ? "Ativa" : "Inativa"}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[var(--color-text-muted)]">{p.description || "Sem descrição"}</p>
                <p className="text-sm font-semibold text-[var(--color-primary)]">
                  {p.discount_percent ? `${p.discount_percent}% off` : p.discount_fixed ? `R$ ${p.discount_fixed} off` : "Desconto"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(p.starts_at).toLocaleDateString("pt-BR")} — {new Date(p.ends_at).toLocaleDateString("pt-BR")}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}
                  >
                    {p.active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => notifyMutation.mutate(p.id)}
                    disabled={notifyMutation.isPending || p.notify_sent}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    {p.notify_sent ? "Enviado" : "Notificar favoritos"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing ? "Editar promoção" : "Nova promoção"}</CardTitle>
              <button onClick={() => setModal(false)}><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Desconto (%)" type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </ProPageShell>
  );
}
