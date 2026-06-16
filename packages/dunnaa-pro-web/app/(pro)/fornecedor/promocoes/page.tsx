"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, X, Loader2, Pencil } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";

type Supplier = { id: string };
type Promo = {
  id: string;
  title: string;
  description?: string;
  discount_percent?: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
};

const empty = () => ({ title: "", description: "", discount_percent: "", starts_at: "", ends_at: "", active: true });

function isActive(p: Promo) {
  const now = Date.now();
  return p.active && new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() >= now;
}

export default function SupplierPromotionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [error, setError] = useState("");

  const { data: supplier } = useQuery<Supplier | null>({
    queryKey: ["my-supplier"],
    queryFn: async () => {
      try { return (await api.get("/suppliers/my")).data; } catch { return null; }
    },
  });

  const { data: promos = [], isLoading } = useQuery<Promo[]>({
    queryKey: ["supplier-promotions", supplier?.id],
    enabled: !!supplier?.id,
    queryFn: async () => (await api.get(`/suppliers/${supplier!.id}/promotions`)).data,
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post(`/suppliers/${supplier!.id}/promotions`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier-promotions"] }); resetForm(); },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.patch(`/suppliers/${supplier!.id}/promotions/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier-promotions"] }); resetForm(); },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function resetForm() { setForm(empty()); setEditId(null); setShowForm(false); setError(""); }

  function startEdit(p: Promo) {
    setForm({
      title: p.title, description: p.description ?? "",
      discount_percent: String(p.discount_percent ?? ""),
      starts_at: p.starts_at.slice(0, 16), ends_at: p.ends_at.slice(0, 16), active: p.active,
    });
    setEditId(p.id); setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const payload = {
      ...form,
      discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null,
    };
    if (editId) { updateMutation.mutate({ id: editId, data: payload }); }
    else { createMutation.mutate(payload); }
  }

  return (
    <ProPageShell>
      <ProPageHeader
        title="Promoções"
        icon={Megaphone}
        description="Crie promoções para atrair estabelecimentos"
        actions={
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Nova Promoção
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{editId ? "Editar" : "Nova"} Promoção</CardTitle>
            <button onClick={resetForm} className="text-[var(--color-text-muted)]"><X className="h-4 w-4" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Título *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: 10% OFF em produtos químicos" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
                  placeholder="Detalhes da promoção"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Desconto (%)</label>
                  <Input type="number" min="0" max="100" step="0.1" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Início *</label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Fim *</label>
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} required />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="promo-active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded accent-[var(--color-primary)]" />
                <label htmlFor="promo-active" className="text-sm text-[var(--color-text-secondary)]">Promoção ativa</label>
              </div>
              {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>
      ) : promos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Megaphone className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">Nenhuma promoção criada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-[var(--color-text-primary)]">{p.title}</p>
                    <Badge className={isActive(p) ? "bg-green-500/15 text-green-400 border-green-500/30 text-xs" : "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] text-xs"}>
                      {isActive(p) ? "Ativa" : "Inativa"}
                    </Badge>
                    {p.discount_percent && (
                      <Badge className="bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30 text-xs">
                        {p.discount_percent}% OFF
                      </Badge>
                    )}
                  </div>
                  {p.description && <p className="text-xs text-[var(--color-text-muted)] truncate">{p.description}</p>}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(p.starts_at).toLocaleDateString("pt-BR")} — {new Date(p.ends_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ProPageShell>
  );
}
